import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/shop";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getAllCategories();
  return NextResponse.json(data);
}
