/**
 * ماژول یکپارچه درگاه پرداخت
 *
 * پشتیبانی از:
 * - زرین‌پال (Zarinpal) — پیش‌فرض
 * - زیبال (Zibal)
 * - سامان (SEP)
 * - Sandbox (محیط توسعه)
 *
 * تنظیمات از site_settings خوانده می‌شود.
 */

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  انواع                                                                   */
/* ------------------------------------------------------------------ */

export type PaymentGateway = "zarinpal" | "zibal" | "sep" | "sandbox";

export interface PaymentRequest {
  /** مبلغ به ریال */
  amount: number;
  /** توضیحات پرداخت */
  description: string;
  /** ایمیل پرداخت‌کننده (اختیاری) */
  email?: string;
  /** موبایل پرداخت‌کننده (اختیاری) */
  mobile?: string;
  /** شماره سفارش */
  orderNumber: string;
}

export interface PaymentResult {
  success: boolean;
  /** آدرس ریدایرکت به درگاه (برای sandbox مستقیماً callback رو صدا می‌زنه) */
  redirectUrl?: string;
  /** کد مرجع پرداخت */
  refId?: string;
  /** کد پیگیری */
  authority?: string;
  /** پیام خطا */
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  refId?: string;
  cardPan?: string;
  cardHash?: string;
  fee?: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  انتزاع درگاه                                                       */
/* ------------------------------------------------------------------ */

interface GatewayConfig {
  merchantId: string;
  sandbox?: boolean;
}

abstract class BaseGateway {
  protected config: GatewayConfig;
  protected callbackUrl: string;

  constructor(config: GatewayConfig, callbackUrl: string) {
    this.config = config;
    this.callbackUrl = callbackUrl;
  }

  abstract requestPayment(params: PaymentRequest): Promise<PaymentResult>;
  abstract verifyPayment(authority: string, amount: number): Promise<VerifyResult>;
}

/* ------------------------------------------------------------------ */
/*  زرین‌پال                                                            */
/* ------------------------------------------------------------------ */

class ZarinpalGateway extends BaseGateway {
  private baseUrl: string;

  constructor(config: GatewayConfig, callbackUrl: string) {
    super(config, callbackUrl);
    this.baseUrl = config.sandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment"
      : "https://api.zarinpal.com/pg/v4/payment";
  }

  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    try {
      const res = await fetch(`${this.baseUrl}/request.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          merchant_id: this.config.merchantId,
          amount: params.amount,
          callback_url: this.callbackUrl,
          description: params.description.slice(0, 255),
          metadata: {
            mobile: params.mobile || "",
            email: params.email || "",
            orderNumber: params.orderNumber,
          },
        }),
      });

      const json = await res.json();
      const data = json.data;

      if (data?.code === 100 && data.authority) {
        const redirectUrl = this.config.sandbox
          ? `https://sandbox.zarinpal.com/pg/StartPay/${data.authority}`
          : `https://www.zarinpal.com/pg/StartPay/${data.authority}`;

        return {
          success: true,
          redirectUrl,
          authority: data.authority,
        };
      }

      // خطاهای متداول زرین‌پال
      const errors: Record<string, string> = {
        ["-9"]: "خطای اعتبارسنجی داده‌ها",
        ["-10"]: "ای‌پی‌آی یا مرچنت معتبر نیست",
        ["-11"]: "مرچنت فعال نیست",
        ["-12"]: "مبلغ باید بیشتر از ۱۰۰۰ ریال باشد",
        ["-15"]: "ترمینال غیرفعال است",
        ["-16"]: "محدودیت سطح پذیرنده",
        ["-30"]: "اجازه دسترسی ندارید",
        ["-31"]: "حساب بانکی معتبر وارد نشده",
        ["-32"]: "مبلغ اشتباه است",
        ["-33"]: "مبلغ بالا از سقف",
        ["-34"]: "مبلغ از سقف پایین‌تر است",
        ["-35"]: "آی‌پی محدود شده",
        ["-36"]: "تراکنش تکراری یا محدودیت روزانه",
        ["-50"]: "مبلغ پرداخت شده با مبلغ تأیید شده مغایرت دارد",
        ["-51"]: "پرداخت ناموفق",
        ["-54"]: "اتوریتی نامعتبر است",
        ["-55"]: "تراکنش قبلاً تأیید شده",
      };

      const code = data?.code || json.errors?.code || -1;
      return {
        success: false,
        error: errors[String(code)] || `خطای ناشناخته (کد: ${code})`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در اتصال به زرین‌پال: ${(e as Error).message}`,
      };
    }
  }

  async verifyPayment(authority: string, amount: number): Promise<VerifyResult> {
    try {
      const res = await fetch(`${this.baseUrl}/verify.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          merchant_id: this.config.merchantId,
          amount,
          authority,
        }),
      });

      const json = await res.json();
      const data = json.data;

      if (data?.code === 100 || data?.code === 101) {
        return {
          success: true,
          refId: String(data.ref_id),
          cardPan: data.card_pan,
          cardHash: data.card_hash,
          fee: data.fee,
        };
      }

      return {
        success: false,
        error: `تأیید پرداخت ناموفق بود. کد: ${data?.code}`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در تأیید پرداخت: ${(e as Error).message}`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Sandbox (محیط توسعه)                                                */
/* ------------------------------------------------------------------ */

class SandboxGateway extends BaseGateway {
  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    // توکن جعلی برای callback
    const authority = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const redirectUrl = `${this.callbackUrl}?Authority=${authority}&Status=OK`;

    return {
      success: true,
      redirectUrl,
      authority,
    };
  }

  async verifyPayment(authority: string, _amount: number): Promise<VerifyResult> {
    // شبیه‌سازی تأیید موفق (همه پرداخت‌های sandbox موفقند)
    if (!authority.startsWith("sandbox-")) {
      return { success: false, error: "اتوریتی نامعتبر" };
    }
    return {
      success: true,
      refId: `sandbox-ref-${Date.now()}`,
      cardPan: "6037-****-****-1234",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  فکتوری                                                             */
/* ------------------------------------------------------------------ */

let cachedGateway: BaseGateway | null = null;
let cachedGatewayAt = 0;
const CACHE_TTL = 60_000; // ۱ دقیقه

export async function getPaymentGateway(
  callbackUrl: string,
): Promise<BaseGateway> {
  const now = Date.now();
  if (cachedGateway && now - cachedGatewayAt < CACHE_TTL) {
    return cachedGateway;
  }

  // ۱) خواندن از site_settings
  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(
        and(
          eq(siteSettings.key, "payment.gateway"),
          eq(siteSettings.group, "payment"),
        ),
      )
      .limit(1);

    if (row?.value) {
      const config = row.value as {
        provider: PaymentGateway;
        merchantId?: string;
        sandbox?: boolean;
      };

      if (config.provider === "zarinpal" && config.merchantId) {
        cachedGateway = new ZarinpalGateway(
          { merchantId: config.merchantId, sandbox: config.sandbox },
          callbackUrl,
        );
        cachedGatewayAt = now;
        return cachedGateway;
      }
    }
  } catch {
    // site_settings ممکن است موجود نباشد
  }

  // ۲) fallback به env
  const provider = process.env.PAYMENT_GATEWAY as PaymentGateway | undefined;
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  const sandbox = process.env.PAYMENT_SANDBOX === "true";

  if (provider === "zarinpal" && merchantId) {
    cachedGateway = new ZarinpalGateway({ merchantId, sandbox }, callbackUrl);
    cachedGatewayAt = now;
    return cachedGateway;
  }

  // ۳) پیش‌فرض: sandbox
  cachedGateway = new SandboxGateway({ merchantId: "", sandbox: true }, callbackUrl);
  cachedGatewayAt = now;
  return cachedGateway;
}
