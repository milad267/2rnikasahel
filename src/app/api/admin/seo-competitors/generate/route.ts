import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { getAiConfig } from "@/lib/ai";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { trackedChatCompletion } from "@/lib/ai-usage";

export const dynamic = "force-dynamic";

/**
 * با استفاده از هوش مصنوعی (پیکربندی seo) یک پست بلاگ سئو شده تولید می‌کند.
 * می‌تواند از بینش‌های رقبا (کلمات کلیدی و عنوان‌ها) برای بهتر رتبه گرفتن استفاده کند.
 * اگر save=true باشد پست به‌صورت پیش‌نویس ذخیره می‌شود.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  let topic = "";
  let keywords: string[] = [];
  let competitorTitles: string[] = [];
  let save = false;
  try {
    const body = await req.json();
    topic = String(body.topic || "").trim();
    keywords = Array.isArray(body.keywords) ? body.keywords.map((k: unknown) => String(k)) : [];
    competitorTitles = Array.isArray(body.competitorTitles) ? body.competitorTitles.map((k: unknown) => String(k)) : [];
    save = body.save === true;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }

  if (!topic) return NextResponse.json({ ok: false, error: "موضوع را وارد کنید" }, { status: 400 });

  const config = (await getAiConfig("seo")) || (await getAiConfig("chat"));
  if (!config) {
    return NextResponse.json({ ok: false, error: "هوش مصنوعی برای سئو پیکربندی نشده است. از صفحه هوش مصنوعی تنظیم کنید." }, { status: 200 });
  }

  const prompt = `تو یک متخصص سئو و تولید محتوای فارسی برای فروشگاه تجهیزات صنعتی و تأسیساتی «درنیکا ساحل» هستی.
یک مقاله‌ی بلاگ کامل، حرفه‌ای و بهینه‌شده برای موتورهای جستجو درباره‌ی موضوع زیر بنویس:

موضوع: ${topic}
${keywords.length ? `کلمات کلیدی هدف: ${keywords.join("، ")}` : ""}
${competitorTitles.length ? `عناوین رقبا (برای الهام و بهتر بودن از آن‌ها): ${competitorTitles.join(" | ")}` : ""}

خروجی را دقیقاً به‌صورت یک شیء JSON معتبر و بدون هیچ متن اضافه برگردان با این ساختار:
{
  "title": "عنوان جذاب و سئو شده",
  "slug": "slug-انگلیسی-یا-فارسی",
  "excerpt": "خلاصه‌ی ۲ خطی",
  "metaTitle": "عنوان متا حداکثر ۶۰ کاراکتر",
  "metaDesc": "توضیح متا حداکثر ۱۶۰ کاراکتر",
  "content": "محتوای کامل HTML با تگ‌های h2, h3, p, ul, li — حداقل ۶۰۰ کلمه"
}`;

  try {
    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl || undefined });
    const res: any = await trackedChatCompletion(client, {
      model: config.model,
      messages: [
        { role: "system", content: "تو یک تولیدکننده محتوای سئو هستی و فقط JSON معتبر برمی‌گردانی." },
        { role: "user", content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    }, { agent: "seo", task: "competitor-content", provider: config.provider, model: config.model, userId: user.id, isAdmin: true });

    const raw = res.choices?.[0]?.message?.content || "";
    const jsonText = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // اگر JSON نبود، محتوای خام را به‌عنوان content برگردان
      parsed = { title: topic, content: raw, excerpt: "", metaTitle: topic, metaDesc: "", slug: "" };
    }

    const slug = (parsed.slug || topic).replace(/\s+/g, "-").replace(/[^آ-یa-z0-9-]/gi, "").toLowerCase();

    let savedId: number | null = null;
    let blogImage: string | null = null;
    if (save && parsed.content) {
      const [created] = await db.insert(blogPosts).values({
        title: parsed.title || topic,
        slug,
        excerpt: parsed.excerpt || null,
        content: parsed.content,
        metaTitle: parsed.metaTitle || null,
        metaDesc: parsed.metaDesc || null,
        status: "draft",
        authorId: user.id,
      }).returning();
      savedId = created?.id ?? null;

      // جستجوی خودکار تصویر مرتبط با بلاگ
      try {
        const { findBlogImage } = await import("@/lib/agents/image-intelligence");
        const blogKeywords = [...keywords, ...(parsed.metaTitle || parsed.title || topic).split(" ").filter(w => w.length > 2)];
        const imgResult = await findBlogImage(parsed.title || topic, blogKeywords, {
          userId: user.id,
          isAdmin: true,
          blogPostId: created?.id,
        });
        if (imgResult.success && imgResult.image) {
          blogImage = imgResult.image.url;
          // بروزرسانی پست بلاگ با تصویر
          await db.update(blogPosts)
            .set({ featuredImage: imgResult.image.url })
            .where(eq(blogPosts.id, created!.id));
        }
      } catch {
        // خطا در تصویر، ادامه بده
      }
    }

    return NextResponse.json({ ok: true, post: { ...parsed, slug }, savedId, blogImage });
  } catch (error) {
    const err = error as { message?: string; status?: number };
    let msg = err.message || "خطا در تولید محتوا";
    if (err.status === 401) msg = "کلید API نامعتبر است";
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}
