import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getOrderHistory, logOrderHistory, ACTION_LABELS } from "@/lib/order/history";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  const history = await getOrderHistory(Number(id));
  return NextResponse.json({ ok: true, history, labels: ACTION_LABELS });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  await logOrderHistory({ orderId: Number(id), userId: user.id, action: "note_added", note: body.note });
  return NextResponse.json({ ok: true });
}
