import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { getAllowedModules } from "@/lib/admin-permissions-server";
import { ADMIN_MODULES } from "@/lib/admin-permissions";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(); if (auth.response) return auth.response;
  const userId = Number(req.nextUrl.searchParams.get("userId"));
  const role = req.nextUrl.searchParams.get("role") || "customer";

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  }

  const modules = await getAllowedModules(userId, role);
  const allModules = ADMIN_MODULES.map((m) => m.key);

  return NextResponse.json({
    ok: true,
    modules,
    allModules,
    role,
  });
}
