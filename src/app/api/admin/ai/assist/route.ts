import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAiConfig } from "@/lib/ai";
import { requireAdmin } from "@/lib/admin-security";
import { enforceRateLimit } from "@/lib/request-security";
import { trackedChatCompletion } from "@/lib/ai-usage";
import { hasModuleAccess } from "@/lib/admin-permissions-server";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

// حذف تگ‌های HTML برای شمارش/تحلیل متن خام
function stripHtml(html: string) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type Action = "write" | "improve" | "spellcheck" | "seo" | "tags" | "short";

const PROMPTS: Record<Action, string> = {
  write:
    "یک متن توضیحات محصول حرفه‌ای، جذاب و سئو‌محور به زبان فارسی بنویس. از پاراگراف‌بندی مناسب و لحن فروشگاهی معتبر استفاده کن. فقط خروجی HTML ساده (p, ul, li, strong, h3) بده، بدون توضیح اضافه.",
  improve:
    "متن زیر را از نظر نگارش، روانی و ترکیب‌بندی بهبود بده. ساختار و معنی را حفظ کن اما حرفه‌ای‌تر و خواناتر کن. خروجی را به‌صورت HTML ساده بده، بدون توضیح اضافه.",
  spellcheck:
    "غلط‌های املایی و نگارشی متن زیر را اصلاح کن. فقط متن اصلاح‌شده را با همان ساختار HTML برگردان، بدون توضیح اضافه.",
  seo:
    "متن زیر را برای سئو بهینه کن: کلمات کلیدی مرتبط را طبیعی جای بده، تیترها و ساختار را بهبود بده. خروجی HTML ساده بده، بدون توضیح اضافه.",
  short:
    "یک توضیح کوتاه و گیرا (حداکثر ۲ جمله) برای این محصول به فارسی بنویس. فقط متن ساده بده، بدون HTML و بدون توضیح اضافه.",
  tags:
    "بر اساس نام و توضیحات محصول، بین ۵ تا ۱۰ تگ (برچسب) کوتاه و مرتبط با سئو به فارسی پیشنهاد بده که کاربران و رقبا برای جستجوی این محصول استفاده می‌کنند. خروجی فقط یک آرایه JSON از رشته‌ها باشد، مثل [\"تگ اول\",\"تگ دوم\"]، بدون هیچ توضیح اضافه.",
};

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  if (!await hasModuleAccess(auth.user!.id, auth.user!.role, "ai")) {
    return NextResponse.json({ ok: false, error: "شما به ابزارهای هوش مصنوعی دسترسی ندارید." }, { status: 403 });
  }
  const limited = enforceRateLimit(req, `admin-ai-assist:${auth.user!.id}`, 30, 60_000);
  if (limited) return limited;

  try {
    const { action, productName, text, instruction } = (await req.json()) as {
      action: Action;
      productName?: string;
      text?: string;
      instruction?: string;
    };

    if (!action || !PROMPTS[action]) {
      return NextResponse.json({ ok: false, error: "عملیات نامعتبر است." }, { status: 400 });
    }

    const config = await getAiConfig(action === "seo" || action === "tags" ? "seo" : "chat");
    if (!config) {
      return NextResponse.json(
        { ok: false, error: "کلید هوش مصنوعی تنظیم نشده است. ابتدا در بخش تنظیمات AI کلید را وارد کنید." },
        { status: 400 }
      );
    }

    const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl || undefined });

    const context = [
      productName ? `نام محصول: ${String(productName).slice(0, 300)}` : "",
      text ? `متن:\n${stripHtml(text).slice(0, 4000)}` : "",
      instruction ? `دستور کاربر: ${String(instruction).slice(0, 1000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const model = config.model || "gpt-4o-mini";
    const completion: any = await trackedChatCompletion(client, {
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: "تو یک نویسنده و ویراستار حرفه‌ای محتوای فروشگاهی فارسی هستی." },
        { role: "user", content: `${PROMPTS[action]}\n\n${context}` },
      ],
    }, { agent: action === "seo" || action === "tags" ? "seo" : "content", task: `assist:${action}`, provider: config.provider, model, userId: auth.user!.id, isAdmin: true });

    const raw = completion.choices[0]?.message?.content?.trim() || "";

    if (action === "tags") {
      let tags: string[] = [];
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        tags = match ? JSON.parse(match[0]) : [];
      } catch {
        tags = raw
          .split(/[,،\n]/)
          .map((t: string) => t.replace(/["\[\]]/g, "").trim())
          .filter(Boolean);
      }
      return NextResponse.json({ ok: true, tags: tags.slice(0, 12) });
    }

    return NextResponse.json({ ok: true, result: raw });
  } catch (error) {
    return safeErrorResponse(error, "ai-assist");
  }
}
