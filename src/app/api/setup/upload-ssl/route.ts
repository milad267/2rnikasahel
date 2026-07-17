import { NextRequest, NextResponse } from "next/server";
import { validateSetupToken, checkRateLimit } from "@/lib/admin-security";
import { writeFile, mkdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { SETUP_STORAGE } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSL Certificate Upload - Manual Certificate Method
 *
 * Security:
 * - Only accepts HTTPS connections (no HTTP plaintext)
 * - Validates certificate and private key format
 * - Stores in staging area with restricted permissions
 * - Worker moves to final location after validation
 * - No private key in logs, responses, or database
 */

const STAGING_DIR = "/var/lib/dornika/setup/cert-staging";
const MAX_FILE_SIZE = 100 * 1024; // 100KB max for certificates

// Validate PEM format
function validatePEM(content: string, type: "CERTIFICATE" | "PRIVATE KEY"): boolean {
  const beginMarker = `-----BEGIN ${type}-----`;
  const endMarker = `-----END ${type}-----`;

  if (!content.includes(beginMarker) || !content.includes(endMarker)) {
    return false;
  }

  // Check for proper line breaks
  const lines = content.split('\n');
  if (lines.length < 3) {
    return false;
  }

  // Check base64 content between markers
  const beginIndex = lines.findIndex(line => line.includes(beginMarker));
  const endIndex = lines.findIndex(line => line.includes(endMarker));

  if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
    return false;
  }

  return true;
}

// Check if connection is HTTPS (secure method)
// In production, trust X-Forwarded-Proto only when:
// - NODE_ENV is production
// - Next.js binds to localhost only (not public)
// - Nginx overwrites the header itself
function isHTTPS(req: NextRequest): boolean {
  // Direct HTTPS connection
  if (req.nextUrl.protocol === "https:") {
    return true;
  }
  
  // In production, trust X-Forwarded-Proto from Nginx
  // Nginx always sets: proxy_set_header X-Forwarded-Proto $scheme;
  // Since Next.js only listens on 127.0.0.1, all requests come through Nginx
  if (process.env.NODE_ENV === "production") {
    const forwardedProto = req.headers.get("x-forwarded-proto") || "";
    return forwardedProto === "https";
  }
  
  // In development, only allow HTTPS upload if explicitly enabled
  if (process.env.NODE_ENV === "development") {
    if (process.env.ALLOW_HTTP_SSL_UPLOAD === "true") {
      return true;
    }
    // Otherwise check for HTTPS
    const forwardedProto = req.headers.get("x-forwarded-proto") || "";
    return forwardedProto === "https";
  }
  
  return false;
}

// Validate domain format
function isValidDomain(domain: string): boolean {
  return /^(localhost|([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})$/i.test(domain);
}

/**
 * POST /api/setup/upload-ssl
 *
 * Upload SSL certificate and private key for manual SSL.
 * Only accepts HTTPS connections.
 */
export async function POST(req: NextRequest) {
  // Check HTTPS requirement
  if (!isHTTPS(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "برای امنیت، ورود Private Key روی اتصال HTTP مجاز نیست. لطفاً از روش SSH یا اتصال HTTPS استفاده کنید.",
        message: "SSL certificate upload requires HTTPS connection for security.",
        sshInstructions: [
          "# روش SSH:",
          "sudo mkdir -p /etc/dornika/certs/YOUR_DOMAIN",
          "sudo cp fullchain.pem /etc/dornika/certs/YOUR_DOMAIN/",
          "sudo cp privkey.pem /etc/dornika/certs/YOUR_DOMAIN/",
          "sudo chmod 600 /etc/dornika/certs/YOUR_DOMAIN/*.pem",
          "sudo chown root:root /etc/dornika/certs/YOUR_DOMAIN/*.pem"
        ],
        httpsInstructions: [
          "# روش HTTPS:",
          "1. ابتدا SSL را از طریق SSH تنظیم کنید",
          "2. سپس از طریق https://YOUR_DOMAIN/admin/setup اقدام کنید"
        ]
      },
      { status: 403 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting: 5 requests per 10 minutes
  if (!checkRateLimit(`upload-ssl:${ip}`, 5, 600_000)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait 10 minutes." },
      { status: 429 }
    );
  }

  try {
    // Read setup config to get domain
    const configPath = path.join(SETUP_STORAGE, "setup-config.json");
    let config: any;
    
    try {
      const raw = await readFile(configPath, "utf-8");
      config = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Setup configuration not found. Please complete setup wizard first." },
        { status: 400 }
      );
    }

    // Validate SSL mode
    if (config.sslMode !== "manual_certificate") {
      return NextResponse.json(
        { ok: false, error: "SSL mode is not set to manual_certificate. Cannot upload certificates." },
        { status: 400 }
      );
    }

    // Validate domain
    const domain = config.domain;
    if (!domain || !isValidDomain(domain)) {
      return NextResponse.json(
        { ok: false, error: "Invalid domain in configuration." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const certificate = formData.get("certificate") as File | null;
    const privateKey = formData.get("privateKey") as File | null;

    if (!certificate || !privateKey) {
      return NextResponse.json(
        { ok: false, error: "Both certificate and private key are required." },
        { status: 400 }
      );
    }

    // Check file sizes
    if (certificate.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Certificate file too large. Maximum size: ${MAX_FILE_SIZE / 1024}KB` },
        { status: 400 }
      );
    }

    if (privateKey.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `Private key file too large. Maximum size: ${MAX_FILE_SIZE / 1024}KB` },
        { status: 400 }
      );
    }

    // Read file contents
    const certContent = await certificate.text();
    const keyContent = await privateKey.text();

    // Validate PEM format
    if (!validatePEM(certContent, "CERTIFICATE")) {
      return NextResponse.json(
        { ok: false, error: "Invalid certificate format. Must be PEM format." },
        { status: 400 }
      );
    }

    if (!validatePEM(keyContent, "PRIVATE KEY")) {
      return NextResponse.json(
        { ok: false, error: "Invalid private key format. Must be PEM format." },
        { status: 400 }
      );
    }

    // Generate random filenames (server-side)
    const certId = randomBytes(16).toString("hex");
    const keyId = randomBytes(16).toString("hex");

    // Ensure staging directory exists
    await mkdir(STAGING_DIR, { recursive: true, mode: 0o700 });

    // Write files to staging area
    const certPath = path.join(STAGING_DIR, `${certId}.pem`);
    const keyPath = path.join(STAGING_DIR, `${keyId}.key`);

    await writeFile(certPath, certContent, { mode: 0o600 });
    await writeFile(keyPath, keyContent, { mode: 0o600 });

    // Create metadata file (limited fields only)
    const metadata = {
      certId,
      keyId,
      domain,
      uploadedAt: new Date().toISOString(),
      mode: "manual_certificate",
    };

    const metadataPath = path.join(STAGING_DIR, `${certId}.metadata.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o600 });

    return NextResponse.json({
      ok: true,
      message: "SSL certificate and private key uploaded successfully. Installer Worker will validate and apply them.",
      certId,
      domain,
      uploadedAt: metadata.uploadedAt,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to upload SSL certificate." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup/ssl-status
 *
 * Check SSL certificate staging status.
 */
export async function GET() {
  try {
    const fs = await import("node:fs/promises");

    // Check if staging directory exists
    try {
      await stat(STAGING_DIR);
    } catch {
      return NextResponse.json({
        ok: true,
        hasStagedCertificate: false,
        message: "No SSL certificate staged for installation.",
      });
    }

    // List staged certificates
    const files = await fs.readdir(STAGING_DIR);
    const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));

    if (metadataFiles.length === 0) {
      return NextResponse.json({
        ok: true,
        hasStagedCertificate: false,
        message: "No SSL certificate staged for installation.",
      });
    }

    // Read most recent metadata
    const latestMetadata = metadataFiles[metadataFiles.length - 1];
    const metadata = JSON.parse(await fs.readFile(path.join(STAGING_DIR, latestMetadata), 'utf-8'));

    return NextResponse.json({
      ok: true,
      hasStagedCertificate: true,
      certId: metadata.certId,
      uploadedAt: metadata.uploadedAt,
      message: "SSL certificate staged for installation. Installer Worker will process it.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to check SSL status." },
      { status: 500 }
    );
  }
}
