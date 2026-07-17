import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/admin-security";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SETUP_STORAGE } from "@/lib/storage-paths";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Installer Queue - Secure Request Mechanism
 *
 * Architecture:
 * - Setup API creates request file with FIXED structure
 * - Request contains ONLY: requestId, type, timestamp, requestedBy
 * - NO configPath, NO commands, NO paths, NO arguments
 * - Worker reads config from FIXED location: APP_DATA_DIR/setup/setup-config.json
 * - Worker validates everything independently
 *
 * Security:
 * - Request file is atomic (write + rename)
 * - Request file has strict schema
 * - Worker rejects any request with unexpected fields
 * - Worker only processes type="apply_setup"
 */

const INSTALLER_QUEUE_DIR = "/var/lib/dornika/setup/installer-queue";
const INSTALLER_STATE_FILE = "/var/lib/dornika/setup/installer-state.json";

interface InstallerRequest {
  requestId: string;
  type: "apply_setup";
  timestamp: string;
  requestedBy: string;
}

/**
 * POST /api/setup/trigger-installer
 *
 * Creates installer request after setup completion (tokenless).
 * Does NOT execute any root commands.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting: 1 request per 5 minutes
  if (!checkRateLimit(`trigger-installer:${ip}`, 1, 300_000)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait 5 minutes." },
      { status: 429 }
    );
  }

    try {
      // tokenless: body may be empty
      await req.json().catch(() => ({}));

      // Read configuration to verify it exists
      const configPath = path.join(SETUP_STORAGE, "setup-config.json");
    let config: any;

    try {
      const raw = await readFile(configPath, "utf-8");
      config = JSON.parse(raw);
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: "Configuration file not found. Please complete Setup Wizard first." },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!config.domain) {
      return NextResponse.json(
        { ok: false, error: "Domain is required in configuration." },
        { status: 400 }
      );
    }

    if (!config.sslMode) {
      return NextResponse.json(
        { ok: false, error: "SSL Mode is required in configuration." },
        { status: 400 }
      );
    }

    // Validate SSL mode
    const validSslModes = ["none", "lets_encrypt", "manual_certificate"];
    if (!validSslModes.includes(config.sslMode)) {
      return NextResponse.json(
        { ok: false, error: `Invalid SSL Mode. Must be one of: ${validSslModes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate email for Let's Encrypt
    if (config.sslMode === "lets_encrypt" && !config.email) {
      return NextResponse.json(
        { ok: false, error: "Email is required for Let's Encrypt SSL." },
        { status: 400 }
      );
    }

    // Create installer request file with FIXED structure
    const requestId = randomBytes(16).toString("hex");
    const request: InstallerRequest = {
      requestId: requestId,
      type: "apply_setup", // FIXED type - no other types allowed
      timestamp: new Date().toISOString(),
      requestedBy: "setup-wizard", // Fixed identifier
    };

    // Ensure queue directory exists
    await mkdir(INSTALLER_QUEUE_DIR, { recursive: true, mode: 0o700 });

    // Write request file atomically (write to temp, then rename)
    const tempPath = path.join(INSTALLER_QUEUE_DIR, `.${requestId}.tmp`);
    const requestPath = path.join(INSTALLER_QUEUE_DIR, `${requestId}.json`);

    await writeFile(tempPath, JSON.stringify(request, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });

    // Atomic rename
    const { rename } = await import("node:fs/promises");
    await rename(tempPath, requestPath);

    return NextResponse.json({
      ok: true,
      message: "Installer request created. Installer Worker will process it automatically.",
      requestId: requestId,
      type: request.type,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup/installer-status
 *
 * Returns installer status from state file.
 * No authentication required (read-only status).
 */
export async function GET() {
  try {
    let state: any = { stage: "not_started", status: "pending" };

    try {
      const raw = await readFile(INSTALLER_STATE_FILE, "utf-8");
      state = JSON.parse(raw);
    } catch {
      // State file not found
    }

    return NextResponse.json({
      ok: true,
      state: state.stage,
      status: state.status,
      message: state.message || "",
      timestamp: state.timestamp || "",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to read installer state." },
      { status: 500 }
    );
  }
}
