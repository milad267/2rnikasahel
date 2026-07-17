import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

const INSTALLER_STATE_FILE = "/var/lib/dornika/setup/installer-state.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to read installer state." },
      { status: 500 }
    );
  }
}
