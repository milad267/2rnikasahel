import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-security";
import { enforceRateLimit } from "@/lib/request-security";
import { extractProductsWithAI } from "@/lib/agents/product-extraction";
import { analyzeProductList } from "@/lib/product-intelligence";
import { hasModuleAccess } from "@/lib/admin-permissions-server";
import { safeErrorMessage } from "@/lib/safe-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const [canUseAi, canManageProducts] = await Promise.all([
    hasModuleAccess(auth.user!.id, auth.user!.role, "ai"),
    hasModuleAccess(auth.user!.id, auth.user!.role, "products"),
  ]);
  if (!canUseAi || !canManageProducts) {
    return NextResponse.json({ ok: false, error: "برای تحلیل و ساخت محصول، دسترسی هوش مصنوعی و محصولات لازم است." }, { status: 403 });
  }
  const limited = enforceRateLimit(req, `admin-product-extraction:${auth.user!.id}`, 20, 60_000);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const text = String(body?.text || "").replace(/\u0000/g, "").trim().slice(0, 200_000); // افزایش به ۲۰۰ هزار کاراکتر برای کاتالوگ‌های بسیار بزرگ
  if (text.length < 3) return NextResponse.json({ ok: false, error: "متن محصول خالی است." }, { status: 400 });

  try {
    const ai = await extractProductsWithAI({ text, userId: auth.user!.id, isAdmin: true });
    const products = ai.products.length ? ai.products : analyzeProductList(text);
    return NextResponse.json({ ok: true, products, warning: ai.warning || undefined, source: ai.products.length ? "ai" : "local" });
  } catch (error) {
    const products = analyzeProductList(text);
    return NextResponse.json({ ok: true, products, warning: safeErrorMessage(error), source: "local" });
  }
}