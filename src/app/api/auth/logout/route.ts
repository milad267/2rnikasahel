import { NextResponse } from "next/server";
import { USER_TOKEN_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(USER_TOKEN_COOKIE);
  return res;
}
