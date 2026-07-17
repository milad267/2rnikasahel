import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/trigger-installer
 *
 * DEPRECATED: This endpoint is no longer used.
 * Use /api/setup/trigger-installer instead.
 *
 * This endpoint is kept for backward compatibility but returns an error.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "This endpoint is deprecated. Use /api/setup/trigger-installer instead.",
      newEndpoint: "/api/setup/trigger-installer",
    },
    { status: 410 }
  );
}

/**
 * GET /api/admin/trigger-installer
 *
 * DEPRECATED: This endpoint is no longer used.
 * Use /api/setup/installer-status instead.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "This endpoint is deprecated. Use /api/setup/installer-status instead.",
      newEndpoint: "/api/setup/installer-status",
    },
    { status: 410 }
  );
}
