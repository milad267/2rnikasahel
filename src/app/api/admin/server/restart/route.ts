import { NextResponse } from "next/server";
import { requireSuperAdmin, checkRateLimit } from "@/lib/admin-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Service Restart API - DISABLED for Security
 *
 * IMPORTANT: Direct service restart from web API is disabled to prevent
 * privilege escalation and maintain Root Boundary security.
 *
 * To restart services, use SSH/Terminal as administrator:
 *   sudo systemctl restart dornika
 *   sudo systemctl reload nginx
 *   sudo systemctl restart postgresql
 *
 * This API only returns information about how to restart services manually.
 */

export async function POST() {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  return NextResponse.json(
    {
      ok: false,
      error: "Service restart from web panel is disabled for security reasons.",
      message: "Please use SSH/Terminal to restart services:",
      commands: {
        "Application": "sudo systemctl restart dornika",
        "Nginx": "sudo systemctl reload nginx",
        "PostgreSQL": "sudo systemctl restart postgresql",
        "Sendmail": "sudo systemctl restart sendmail",
      },
      security_note: "Direct service control from web API is disabled to maintain Root Boundary and prevent privilege escalation.",
    },
    { status: 403 }
  );
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  return NextResponse.json({
    ok: true,
    message: "Service restart information",
    available_services: ["dornika", "nginx", "postgresql", "sendmail"],
    restart_disabled: true,
    reason: "Security: Use SSH/Terminal for service management",
    commands: {
      "Application": "sudo systemctl restart dornika",
      "Nginx": "sudo systemctl reload nginx",
      "PostgreSQL": "sudo systemctl restart postgresql",
      "Sendmail": "sudo systemctl restart sendmail",
    },
  });
}
