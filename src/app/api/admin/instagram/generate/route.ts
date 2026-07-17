import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, instagramPosts, instagramAccounts } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-security";
import { safeErrorResponse } from "@/lib/safe-error";
import { trackedChatCompletion } from "@/lib/ai-usage";

export const dynamic = "force-dynamic";

/**
 * تولید محتوای اینستاگرام با هوش مصنوعی
 * این endpoint یک محصول تصادفی از سایت را انتخاب کرده و با استفاده از API کلیدهای ذخیره شده
 * کپشن، هشتگ و توضیحات ویدیو تولید می‌کند.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const { accountId, productId, count = 1, aiProvider = "openai" } = body;

    if (!accountId) {
      return NextResponse.json(
        { ok: false, error: "لطفاً اکانت اینستاگرام را انتخاب کنید" },
        { status: 400 },
      );
    }

    // بررسی اعتبار اکانت
    const [account] = await db
      .select()
      .from(instagramAccounts)
      .where(eq(instagramAccounts.id, accountId));

    if (!account) {
      return NextResponse.json(
        { ok: false, error: "اکانت اینستاگرام یافت نشد" },
        { status: 404 },
      );
    }

    // دریافت محصولات (تصادفی)
    let productsToUse;
    if (productId) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));
      productsToUse = product ? [product] : [];
    } else {
      // انتخاب تصادفی از محصولات فعال
      productsToUse = await db
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(sql`RANDOM()`)
        .limit(count);
    }

    if (productsToUse.length === 0) {
      return NextResponse.json(
        { ok: false, error: "محصولی برای تولید محتوا یافت نشد" },
        { status: 404 },
      );
    }

    // خواندن تنظیمات AI از site_settings
    const { siteSettings } = await import("@/db/schema");
    const { and: andOp } = await import("drizzle-orm");

    const aiSettingsRows = await db
      .select()
      .from(siteSettings)
      .where(
        andOp(
          eq(siteSettings.group, "instagram"),
          sql`${siteSettings.key} LIKE 'ai.%'`,
        ),
      );

    const aiSettings: Record<string, string> = {};
    aiSettingsRows.forEach((s: any) => {
      aiSettings[s.key] = typeof s.value === "string" ? s.value : JSON.stringify(s.value);
    });

    const openaiKey = aiSettings["instagram.ai.openai_key"] || "";
    const geminiKey = aiSettings["instagram.ai.gemini_key"] || "";

    const generatedPosts = [];

    for (const product of productsToUse) {
      // تولید کپشن و هشتگ با هوش مصنوعی
      let caption = "";
      let hashtags = "";
      let mediaSuggestion = "image";

      try {
        if (openaiKey) {
          const result = await generateWithOpenAI(openaiKey, product);
          caption = result.caption;
          hashtags = result.hashtags;
          mediaSuggestion = result.mediaType;
        } else if (geminiKey) {
          const result = await generateWithGemini(geminiKey, product);
          caption = result.caption;
          hashtags = result.hashtags;
          mediaSuggestion = result.mediaType;
        } else {
          // پیش‌فرض ساده اگر کلید AI تنظیم نشده
          caption = `🔹 ${product.title}\n\n${product.subtitle || ""}\n\n📌 برای مشاهده و خرید به سایت مراجعه کنید.\n🔗 لینک در bio`;
          hashtags = "#محصول #فروشگاه #درنیکا_ساحل #تجهیزات_صنعتی";
        }
      } catch {
        caption = `🔹 ${product.title}\n\n📌 برای مشاهده و خرید به سایت مراجعه کنید.\n🔗 لینک در bio`;
        hashtags = "#محصول #فروشگاه #درنیکا_ساحل";
      }

      // ذخیره پست در صف
      const [newPost] = await db
        .insert(instagramPosts)
        .values({
          accountId,
          productId: product.id,
          mediaType: mediaSuggestion,
          caption,
          hashtags,
          mediaPaths: product.coverImage ? [product.coverImage] : [],
          status: "draft",
          aiGenerated: true,
          aiPrompt: `تولید خودکار برای محصول: ${product.title} (اسلاگ: ${product.slug})`,
        })
        .returning();

      generatedPosts.push({
        post: newPost,
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          coverImage: product.coverImage,
        },
        caption,
        hashtags,
      });
    }

    return NextResponse.json({
      ok: true,
      data: generatedPosts,
      message: `${generatedPosts.length} پست با موفقیت تولید شد`,
    });
  } catch (error) {
    return safeErrorResponse(error, "instagram-generate");
  }
}

/** تولید محتوا با OpenAI */
async function generateWithOpenAI(apiKey: string, product: any) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey, timeout: 30_000 });

  const prompt = `
   تو یک متخصص تولید محتوای اینستاگرام برای فروشگاه تجهیزات صنعتی "درنیکا ساحل" هستی.
   
   اطلاعات محصول:
   - عنوان: ${product.title}
   - توضیحات: ${product.description || product.subtitle || "ندارد"}
   - اسلاگ: ${product.slug}
   
   لطفاً یک پست اینستاگرام حرفه‌ای به زبان فارسی تولید کن:
   1. یک کپشن جذاب و بازاریابی (حداکثر ۲۰۰ کاراکتر)
   2. ۱۰-۱۵ هشتگ مرتبط و تخصصی
   3. نوع رسانه پیشنهادی (image یا video)
   
   پاسخ را به صورت JSON بده:
   {"caption": "...", "hashtags": "...", "mediaType": "image"|"video"}
  `;

  try {
    const response: any = await trackedChatCompletion(client, {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }, { agent: "instagram", task: "post-generation", provider: "openai", model: "gpt-4o-mini", isAdmin: true });

    const content = response.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  return {
    caption: `🔹 ${product.title}\n\n📌 برای اطلاعات بیشتر به سایت مراجعه کنید.`,
    hashtags: "#محصول #فروشگاه #درنیکا_ساحل #تجهیزات_صنعتی",
    mediaType: "image",
  };
}

/** تولید محتوا با Google Gemini */
async function generateWithGemini(apiKey: string, product: any) {
  const prompt = `
   تو یک متخصص تولید محتوای اینستاگرام برای فروشگاه تجهیزات صنعتی "درنیکا ساحل" هستی.
   
   اطلاعات محصول:
   - عنوان: ${product.title}
   - توضیحات: ${product.description || product.subtitle || "ندارد"}
   
   یک کپشن جذاب فارسی (حداکثر ۲۰۰ کاراکتر) و ۱۰-۱۵ هشتگ مرتبط تولید کن.
   
   پاسخ JSON:
   {"caption": "...", "hashtags": "...", "mediaType": "image"}
  `;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}

  return {
    caption: `🔹 ${product.title}\n\n📌 برای خرید به سایت مراجعه کنید.`,
    hashtags: "#محصول #فروشگاه #درنیکا_ساحل",
    mediaType: "image",
  };
}
