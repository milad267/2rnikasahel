import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * صفحه‌ی یک رقیب را دریافت کرده و متا تگ‌ها، عنوان‌ها و کلمات کلیدی را استخراج می‌کند.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  let url = "";
  try {
    const body = await req.json();
    url = String(body.url || "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }

  if (!url) return NextResponse.json({ ok: false, error: "آدرس سایت وارد نشده است" }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DornikaSEOBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `سایت پاسخ داد: ${res.status}` }, { status: 200 });
    }

    const html = await res.text();
    const data = extractSeo(html);
    return NextResponse.json({ ok: true, url, ...data });
  } catch (error) {
    const err = error as { name?: string; message?: string };
    const msg = err.name === "AbortError" ? "زمان اتصال به پایان رسید" : err.message || "خطا در دریافت صفحه";
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}

function extractSeo(html: string) {
  const meta = (name: string, attr: "name" | "property" = "name") => {
    const re = new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${name}["']`, "i");
    return (html.match(re)?.[1] || html.match(re2)?.[1] || "").trim();
  };

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
  const description = meta("description");
  const keywords = meta("keywords");
  const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1] || "").trim();
  const ogTitle = meta("og:title", "property");
  const ogDescription = meta("og:description", "property");
  const ogImage = meta("og:image", "property");

  const headings = (tag: string) =>
    Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")))
      .map(m => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 15);

  const h1 = headings("h1");
  const h2 = headings("h2");
  const wordCount = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").length;

  return {
    title,
    description,
    keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
    canonical,
    og: { title: ogTitle, description: ogDescription, image: ogImage },
    headings: { h1, h2 },
    stats: {
      titleLength: title.length,
      descriptionLength: description.length,
      h1Count: h1.length,
      h2Count: h2.length,
      approxWords: wordCount,
    },
  };
}
