/**
 * ماژول یکپارچه درگاه پرداخت (سمت سرور)
 *
 * این فایل شامل پیاده‌سازی واقعی درگاه‌ها و اتصال به دیتابیس است.
 * انواع و ثابت‌ها از src/lib/gateways.ts import می‌شوند.
 */

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSetting } from "@/lib/settings";
export type { PaymentGateway, GatewayCategory, GatewayMeta } from "./gateways";
export { ALL_GATEWAYS } from "./gateways";
import type { PaymentGateway } from "./gateways";


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
  /** درگاه انتخابی (اختیاری - پیش‌فرض از تنظیمات) */
  gateway?: PaymentGateway;
}

export interface PaymentResult {
  success: boolean;
  /** آدرس ریدایرکت به درگاه */
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

/**
 * تبدیل مبلغ از واحد ذخیره‌شده به واحدی که درگاه expects.
 * اگر واحد IRR (ریال) باشد، تقسیم بر ۱۰ می‌شود (تبدیل به تومان برای درگاه‌های ایرانی).
 * اگر واحد IRT (تومان) باشد، تغییر نمی‌کند.
 * اگر واحد USD باشد، تغییری نمی‌کند.
 */
export async function toGatewayAmount(amount: number): Promise<number> {
  try {
    const currency = await getSetting<string>("site.currency", "general");
    if (currency === "IRR") {
      // IRR → Toman (بیشتر درگاه‌های ایرانی تومان می‌خواهند)
      return Math.floor(amount / 10);
    }
    // IRT یا USD - بدون تغییر
    return amount;
  } catch {
    return amount;
  }
}

/* ------------------------------------------------------------------ */
/*  انتزاع درگاه                                                      */
/* ------------------------------------------------------------------ */

interface GatewayConfig {
  merchantId: string;
  apiKey?: string;
  sandbox?: boolean;
}

interface ConfigurableGatewayConfig extends GatewayConfig {
  requestUrl: string;
  verifyUrl: string;
  paymentUrlTemplate?: string;
  terminalId?: string;
  username?: string;
  password?: string;
  headersJson?: string;
  requestBodyTemplate?: string;
  verifyBodyTemplate?: string;
  requestContentType?: string;
  tokenPattern?: string;
  redirectPattern?: string;
  verifySuccessPattern?: string;
  referencePattern?: string;
}

abstract class BaseGateway {
  protected config: GatewayConfig;
  protected callbackUrl: string;

  constructor(config: GatewayConfig, callbackUrl: string) {
    this.config = config;
    this.callbackUrl = callbackUrl;
  }

  abstract requestPayment(params: PaymentRequest): Promise<PaymentResult>;
  abstract verifyPayment(authority: string, amount: number, orderNumber?: string): Promise<VerifyResult>;
}

/* ------------------------------------------------------------------ */
/*  زرین‌پال                                                          */
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

  async verifyPayment(authority: string, amount: number, orderNumber?: string): Promise<VerifyResult> {
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
/*  زیبال (Zibal)                                                     */
/* ------------------------------------------------------------------ */

class ZibalGateway extends BaseGateway {
  private baseUrl: string;

  constructor(config: GatewayConfig, callbackUrl: string) {
    super(config, callbackUrl);
    this.baseUrl = config.sandbox
      ? "https://sandbox.zibal.ir/v1"
      : "https://gateway.zibal.ir/v1";
  }

  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    try {
      const res = await fetch(`${this.baseUrl}/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant: this.config.merchantId,
          amount: params.amount,
          callbackUrl: this.callbackUrl,
          description: params.description.slice(0, 255),
          orderId: params.orderNumber,
          mobile: params.mobile || "",
        }),
      });

      const json = await res.json();

      if (json.result === 100 && json.trackId) {
        const redirectUrl = this.config.sandbox
          ? `https://sandbox.zibal.ir/start/${json.trackId}`
          : `https://gateway.zibal.ir/start/${json.trackId}`;

        return {
          success: true,
          redirectUrl,
          authority: String(json.trackId),
          refId: String(json.trackId),
        };
      }

      const errors: Record<number, string> = {
        102: "merchant یافت نشد",
        103: "merchant غیرفعال",
        104: "merchant معتبر نیست",
        105: "مبلغ باید بیشتر از ۱,۰۰۰ ریال باشد",
        106: "callbackUrl معتبر نیست",
        113: "مبلغ تراکنش از سقف پرداخت بیشتر است",
      };

      return {
        success: false,
        error: errors[json.result] || `خطای زیبال (کد: ${json.result})`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در اتصال به زیبال: ${(e as Error).message}`,
      };
    }
  }

  async verifyPayment(authority: string, amount: number, orderNumber?: string): Promise<VerifyResult> {
    try {
      const res = await fetch(`${this.baseUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant: this.config.merchantId,
          amount,
          trackId: Number(authority),
        }),
      });

      const json = await res.json();

      if (json.result === 100) {
        return {
          success: true,
          refId: String(json.refNumber || json.trackId),
          cardPan: json.cardNumber,
        };
      }

      return {
        success: false,
        error: `تأیید پرداخت زیبال ناموفق. کد: ${json.result}`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در تأیید پرداخت زیبال: ${(e as Error).message}`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  IDPay                                                             */
/* ------------------------------------------------------------------ */

class IDPayGateway extends BaseGateway {
  private baseUrl: string;

  constructor(config: GatewayConfig, callbackUrl: string) {
    super(config, callbackUrl);
    this.baseUrl = config.sandbox
      ? "https://sandbox.idpay.ir/payment/v1.1"
      : "https://api.idpay.ir/payment/v1.1";
  }

  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    try {
      const res = await fetch(`${this.baseUrl}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": this.config.apiKey || "",
          "X-SANDBOX": this.config.sandbox ? "1" : "0",
        },
        body: JSON.stringify({
          order_id: params.orderNumber,
          amount: params.amount,
          callback: this.callbackUrl,
          desc: params.description.slice(0, 255),
          name: params.mobile || "",
          phone: params.mobile || "",
          mail: params.email || "",
        }),
      });

      const json = await res.json();

      if (json.id && json.link) {
        return {
          success: true,
          redirectUrl: json.link,
          authority: json.id,
          refId: json.id,
        };
      }

      const errors: Record<number, string> = {
        1: "صادرکننده کارت نامعتبر",
        2: "پرداخت موفق اما تأیید نشده",
        3: "تراکنش یافت نشد",
        4: "کد تکراری",
        5: "خطای سیستمی",
        6: "API Key نامعتبر",
        7: "توکن نامعتبر",
        8: "شناسه پرداخت نامعتبر",
        9: "مبلغ نامعتبر",
        10: "حساب بانگی غیرفعال",
        11: "آی‌پی نامعتبر",
        12: "حساب بانکی معتبر نیست",
        13: "سرویس در دسترس نیست",
        21: "حساب بانکی متوقف شده",
        22: "حساب بانکی مسدود",
        23: "مبلغ از سقف بالاتر است",
        24: "مهلت پرداخت به پایان رسیده",
        31: "موجودی ناکافی",
        32: "تراکنش ناموفق",
        33: "رمز کارت اشتباه",
        34: "انصراف از پرداخت",
        35: "تراکنش تکراری",
      };

      return {
        success: false,
        error: errors[json.error_code] || json.error_message || `خطای IDPay (کد: ${json.error_code})`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در اتصال به IDPay: ${(e as Error).message}`,
      };
    }
  }

  async verifyPayment(authority: string, amount: number, orderNumber?: string): Promise<VerifyResult> {
    try {
      const res = await fetch(`${this.baseUrl}/payment/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": this.config.apiKey || "",
          "X-SANDBOX": this.config.sandbox ? "1" : "0",
        },
        body: JSON.stringify({
          id: authority,
          order_id: orderNumber || "",
        }),
      });

      const json = await res.json();

      if (json.status === 10 || json.status === 100) {
        return {
          success: true,
          refId: String(json.track_id || json.id),
          cardPan: json.payment?.card_no,
        };
      }

      return {
        success: false,
        error: `تأیید پرداخت IDPay ناموفق. وضعیت: ${json.status}`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در تأیید پرداخت IDPay: ${(e as Error).message}`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Pay.ir                                                            */
/* ------------------------------------------------------------------ */

class PayIrGateway extends BaseGateway {
  private baseUrl: string;

  constructor(config: GatewayConfig, callbackUrl: string) {
    super(config, callbackUrl);
    this.baseUrl = config.sandbox
      ? "https://sandbox.pay.ir/pg/v1"
      : "https://pay.ir/pg/v1";
  }

  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    try {
      const gatewayAmount = await toGatewayAmount(params.amount);
      const res = await fetch(`${this.baseUrl}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api: this.config.apiKey,
          amount: gatewayAmount,
          redirect: this.callbackUrl,
          description: params.description.slice(0, 255),
          factorNumber: params.orderNumber,
          mobile: params.mobile || "",
        }),
      });

      const json = await res.json();

      if (json.status === 1 && json.token) {
        const redirectUrl = this.config.sandbox
          ? `https://sandbox.pay.ir/pg/${json.token}`
          : `https://pay.ir/pg/${json.token}`;

        return {
          success: true,
          redirectUrl,
          authority: String(json.token),
          refId: String(json.token),
        };
      }

      const errors: Record<string, string> = {
        "-1": "API Key نامعتبر",
        "-2": "مبلغ باید بیشتر از ۱,۰۰۰ تومان باشد",
        "-3": "redirect نامعتبر است",
        "-4": "توکن یافت نشد",
        "-5": "تراکنش قبلاً تأیید شده",
        "-6": "خطای داخلی",
      };

      return {
        success: false,
        error: errors[String(json.errorCode)] || `خطای Pay.ir (کد: ${json.errorCode})`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در اتصال به Pay.ir: ${(e as Error).message}`,
      };
    }
  }

  async verifyPayment(authority: string, _amount: number): Promise<VerifyResult> {
    try {
      const res = await fetch(`${this.baseUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api: this.config.apiKey,
          token: authority,
        }),
      });

      const json = await res.json();

      if (json.status === 1) {
        return {
          success: true,
          refId: String(json.transId),
          cardPan: json.cardNumber,
        };
      }

      return {
        success: false,
        error: `تأیید پرداخت Pay.ir ناموفق. کد: ${json.errorCode}`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در تأیید پرداخت Pay.ir: ${(e as Error).message}`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  سامان (SEP)                                                       */
/* ------------------------------------------------------------------ */

class SepGateway extends BaseGateway {
  private baseUrl: string;

  constructor(config: GatewayConfig, callbackUrl: string) {
    super(config, callbackUrl);
    this.baseUrl = "https://sep.shaparak.ir";
  }

  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    try {
      const gatewayAmount = await toGatewayAmount(params.amount);
      // سامان از XML استفاده می‌کند ولی API جدید RESTful هم دارد
      const res = await fetch(`${this.baseUrl}/onlinepg/onlinepg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "token",
          TerminalId: this.config.merchantId,
          Amount: gatewayAmount,
          ResNum: params.orderNumber,
          RedirectUrl: this.callbackUrl,
          CellNumber: params.mobile || "",
          Email: params.email || "",
          Description: params.description.slice(0, 255),
        }),
      });

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        // بعضی نسخه‌های سامان XML برمی‌گردانند
        const tokenMatch = text.match(/<token>([^<]+)<\/token>/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          return {
            success: true,
            redirectUrl: `https://sep.shaparak.ir/OnlinePm/OnlinePm?Token=${token}`,
            authority: token,
            refId: token,
          };
        }
        return { success: false, error: "پاسخ نامعتبر از سرور سامان" };
      }

      if (json.status === 1 || json.status === 0) {
        const token = json.token || json.Token;
        return {
          success: true,
          redirectUrl: `https://sep.shaparak.ir/OnlinePm/OnlinePm?Token=${token}`,
          authority: token,
          refId: token,
        };
      }

      return {
        success: false,
        error: json.errorDesc || `خطای سامان (کد: ${json.status})`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در اتصال به سامان: ${(e as Error).message}`,
      };
    }
  }

  async verifyPayment(authority: string, amount: number): Promise<VerifyResult> {
    try {
      const res = await fetch(`${this.baseUrl}/verifyTxn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Token: authority,
          RefNum: authority,
          TerminalNumber: this.config.merchantId,
        }),
      });

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return { success: false, error: "پاسخ نامعتبر از سامان" };
      }

      if (json.Status === 200 || json.status === 200) {
        return {
          success: true,
          refId: String(json.RRN || json.rrn || authority),
          cardPan: json.CardNumber || json.cardNumber,
        };
      }

      return {
        success: false,
        error: `تأیید پرداخت سامان ناموفق. کد: ${json.Status || json.status}`,
      };
    } catch (e) {
      return {
        success: false,
        error: `خطا در تأیید پرداخت سامان: ${(e as Error).message}`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Sandbox (محیط توسعه)                                              */
/* ------------------------------------------------------------------ */

class SandboxGateway extends BaseGateway {
  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    const authority = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const redirectUrl = `${this.callbackUrl}?Authority=${authority}&Status=OK`;

    return {
      success: true,
      redirectUrl,
      authority,
    };
  }

  async verifyPayment(authority: string, _amount: number): Promise<VerifyResult> {
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

class UnsupportedGateway extends BaseGateway {
  constructor(private readonly provider: string, callbackUrl: string) {
    super({ merchantId: "" }, callbackUrl);
  }
  async requestPayment(): Promise<PaymentResult> {
    return { success: false, error: `درگاه ${this.provider} هنوز پیاده‌سازی عملیاتی نشده است.` };
  }
  async verifyPayment(): Promise<VerifyResult> {
    return { success: false, error: `تأیید درگاه ${this.provider} پشتیبانی نمی‌شود.` };
  }
}

/** اتصال عمومی برای درگاه‌های REST که مشخصات اتصالشان توسط پذیرنده تنظیم می‌شود. */
class ConfigurableGateway extends BaseGateway {
  private readonly custom: ConfigurableGatewayConfig;

  constructor(config: ConfigurableGatewayConfig, callbackUrl: string) {
    super(config, callbackUrl);
    this.custom = config;
  }

  private validEndpoint(value: string) {
    try {
      const url = new URL(value);
      return process.env.NODE_ENV !== "production" || url.protocol === "https:";
    } catch { return false; }
  }

  private render(template: string, values: Record<string, unknown>) {
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
      if (!(key in values)) return match;
      const value = values[key];
      return typeof value === "number" ? String(value) : JSON.stringify(String(value ?? "")).slice(1, -1);
    });
  }

  private match(text: string, pattern?: string) {
    if (!pattern || pattern.length > 200) return "";
    try { const result = new RegExp(pattern, "i").exec(text); return result?.[1] || result?.[0] || ""; }
    catch { return ""; }
  }

  private async post(url: string, body: Record<string, unknown>, template?: string) {
    if (!this.validEndpoint(url)) throw new Error("آدرس API درگاه معتبر یا امن نیست.");
    let extraHeaders: Record<string, string> = {};
    try {
      const parsed = JSON.parse(this.custom.headersJson || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        extraHeaders = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
      }
    } catch { throw new Error("هدرهای اختصاصی JSON معتبر نیست."); }
    const contentType = this.custom.requestContentType || "application/json";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        ...(this.config.apiKey ? {
          Authorization: `Bearer ${this.config.apiKey}`,
          "X-API-KEY": this.config.apiKey,
        } : {}),
        ...extraHeaders,
      },
      body: template ? this.render(template, body) : JSON.stringify(body),
      cache: "no-store",
    });
    const text = (await response.text()).slice(0, 1_000_000);
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = {}; }
    if (!response.ok) throw new Error(`پاسخ نامعتبر از درگاه (${response.status})`);
    data.__raw = text;
    return typeof data.data === "object" && data.data ? { ...data, ...data.data, __raw: text } : data;
  }

  async requestPayment(params: PaymentRequest): Promise<PaymentResult> {
    try {
      const requestValues = {
        merchantId: this.config.merchantId,
        merchant_id: this.config.merchantId,
        terminalId: this.custom.terminalId,
        terminal_id: this.custom.terminalId,
        username: this.custom.username,
        password: this.custom.password,
        apiKey: this.config.apiKey,
        api_key: this.config.apiKey,
        amount: params.amount,
        callbackUrl: this.callbackUrl,
        callback_url: this.callbackUrl,
        callback: this.callbackUrl,
        orderId: params.orderNumber,
        order_id: params.orderNumber,
        description: params.description,
        mobile: params.mobile,
        email: params.email,
      };
      const data = await this.post(this.custom.requestUrl, requestValues, this.custom.requestBodyTemplate);
      const token = String(this.match(data.__raw, this.custom.tokenPattern) || data.authority || data.token || data.id || data.trackId || data.track_id || "");
      let redirectUrl = String(this.match(data.__raw, this.custom.redirectPattern) || data.redirectUrl || data.redirect_url || data.paymentUrl || data.payment_url || data.link || data.url || "");
      if (!redirectUrl && token && this.custom.paymentUrlTemplate) {
        redirectUrl = this.custom.paymentUrlTemplate.replaceAll("{token}", encodeURIComponent(token));
      }
      if (!token || !redirectUrl) return { success: false, error: String(data.message || data.error || "درگاه شناسه یا آدرس پرداخت برنگرداند.") };
      return { success: true, authority: token, refId: token, redirectUrl };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async verifyPayment(authority: string, amount: number, orderNumber?: string): Promise<VerifyResult> {
    try {
      const data = await this.post(this.custom.verifyUrl, {
        merchantId: this.config.merchantId,
        merchant_id: this.config.merchantId,
        terminalId: this.custom.terminalId,
        terminal_id: this.custom.terminalId,
        username: this.custom.username,
        password: this.custom.password,
        apiKey: this.config.apiKey,
        api_key: this.config.apiKey,
        authority,
        token: authority,
        id: authority,
        amount,
        orderId: orderNumber,
        order_id: orderNumber,
      }, this.custom.verifyBodyTemplate);
      const status = data.status ?? data.result ?? data.code;
      const patternSuccess = this.custom.verifySuccessPattern ? Boolean(this.match(data.__raw, this.custom.verifySuccessPattern)) : false;
      const success = patternSuccess || data.success === true || data.verified === true || [1, 100, 200, "1", "100", "200", "OK", "SUCCESS", "VERIFIED"].includes(status);
      if (!success) return { success: false, error: String(data.message || data.error || "تأیید پرداخت از طرف درگاه رد شد.") };
      return {
        success: true,
        refId: String(this.match(data.__raw, this.custom.referencePattern) || data.refId || data.ref_id || data.reference || data.transactionId || data.transaction_id || authority),
        cardPan: data.cardPan || data.card_pan || data.cardNumber,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  فکتوری جدید — پشتیبانی از چند درگاه                                */
/* ------------------------------------------------------------------ */

let gatewayCache: { instance: BaseGateway; expiresAt: number; key: string } | null = null;

export async function getPaymentGateway(
  callbackUrl: string,
  preferredGateway?: PaymentGateway,
): Promise<BaseGateway> {
  const now = Date.now();

  // یک دقیقه کش
  // ۱) خواندن gateway انتخابی از site_settings
  let provider: PaymentGateway = "sandbox";
  let merchantId = "";
  let apiKey = "";
  let sandbox = false;
  let requestUrl = "";
  let verifyUrl = "";
  let paymentUrlTemplate = "";
  let terminalId = "";
  let username = "";
  let password = "";
  let headersJson = "";
  let requestBodyTemplate = "";
  let verifyBodyTemplate = "";
  let requestContentType = "";
  let tokenPattern = "";
  let redirectPattern = "";
  let verifySuccessPattern = "";
  let referencePattern = "";

  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(
        and(
          eq(siteSettings.key, "payment.active_gateway"),
          eq(siteSettings.group, "payment"),
        ),
      )
      .limit(1);

    if (row?.value && typeof row.value === "string") {
      provider = row.value as PaymentGateway;
    }

    // اگر درگاه خاصی درخواست شده، اولویت با آن است
    if (preferredGateway) {
      provider = preferredGateway;
    }

    // خواندن تنظیمات اختصاصی همان درگاه
    const [merchantRow] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(
        and(
          eq(siteSettings.key, `payment.${provider}.merchant_id`),
          eq(siteSettings.group, "payment"),
        ),
      )
      .limit(1);

    if (merchantRow?.value) {
      merchantId = merchantRow.value as string;
    }

    const [apiKeyRow] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(
        and(
          eq(siteSettings.key, `payment.${provider}.api_key`),
          eq(siteSettings.group, "payment"),
        ),
      )
      .limit(1);

    if (apiKeyRow?.value) {
      apiKey = apiKeyRow.value as string;
    }

    const [sandboxRow] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(
        and(
          eq(siteSettings.key, `payment.${provider}.sandbox`),
          eq(siteSettings.group, "payment"),
        ),
      )
      .limit(1);

    if (sandboxRow?.value === "true") {
      sandbox = true;
    }

    const genericRows = await db.select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(and(eq(siteSettings.group, "payment"), eq(siteSettings.locale, "fa")));
    const generic = new Map(genericRows.map((row) => [row.key, row.value]));
    requestUrl = String(generic.get(`payment.${provider}.request_url`) || "").trim();
    verifyUrl = String(generic.get(`payment.${provider}.verify_url`) || "").trim();
    paymentUrlTemplate = String(generic.get(`payment.${provider}.payment_url_template`) || "").trim();
    terminalId = String(generic.get(`payment.${provider}.terminal_id`) || "").trim();
    username = String(generic.get(`payment.${provider}.username`) || "").trim();
    password = String(generic.get(`payment.${provider}.password`) || "");
    headersJson = String(generic.get(`payment.${provider}.headers_json`) || "").trim();
    requestBodyTemplate = String(generic.get(`payment.${provider}.request_body_template`) || "");
    verifyBodyTemplate = String(generic.get(`payment.${provider}.verify_body_template`) || "");
    requestContentType = String(generic.get(`payment.${provider}.request_content_type`) || "").trim();
    tokenPattern = String(generic.get(`payment.${provider}.token_pattern`) || "");
    redirectPattern = String(generic.get(`payment.${provider}.redirect_pattern`) || "");
    verifySuccessPattern = String(generic.get(`payment.${provider}.verify_success_pattern`) || "");
    referencePattern = String(generic.get(`payment.${provider}.reference_pattern`) || "");
  } catch {
    // fallback
  }

  // ۲) fallback به env
  if (!merchantId && !apiKey) {
    provider = (process.env.PAYMENT_GATEWAY as PaymentGateway) || provider;
    merchantId = process.env.ZARINPAL_MERCHANT_ID || "";
    apiKey = process.env.PAYMENT_API_KEY || "";
    sandbox = process.env.PAYMENT_SANDBOX === "true" || provider === "sandbox";
  }

  // ۳) ساخت نمونه
  const cacheKey = `${provider}:${callbackUrl}:${merchantId}:${apiKey}:${sandbox}:${requestUrl}:${verifyUrl}:${paymentUrlTemplate}`;
  if (gatewayCache && now < gatewayCache.expiresAt && gatewayCache.key === cacheKey) return gatewayCache.instance;

  let instance: BaseGateway;

  switch (provider) {
    case "zarinpal":
      instance = new ZarinpalGateway({ merchantId, sandbox }, callbackUrl);
      break;
    case "zibal":
      instance = new ZibalGateway({ merchantId, sandbox }, callbackUrl);
      break;
    case "idpay":
      instance = new IDPayGateway({ merchantId: "", apiKey, sandbox }, callbackUrl);
      break;
    case "payir":
      instance = new PayIrGateway({ merchantId: "", apiKey, sandbox }, callbackUrl);
      break;
	  case "sep":
	      instance = new SepGateway({ merchantId, sandbox }, callbackUrl);
	      break;
	    case "saman":
	      instance = new SepGateway({ merchantId, sandbox }, callbackUrl);
	      break;
	    case "sandbox":
	      if (process.env.NODE_ENV === "production" && process.env.PAYMENT_SANDBOX !== "true") {
	        instance = new UnsupportedGateway("sandbox در production", callbackUrl);
	      } else {
	      instance = new SandboxGateway({ merchantId: "", sandbox: true }, callbackUrl);
	      }
	      break;
	    default:
	      instance = requestUrl && verifyUrl
	        ? new ConfigurableGateway({ merchantId, apiKey, sandbox, requestUrl, verifyUrl, paymentUrlTemplate, terminalId, username, password, headersJson, requestBodyTemplate, verifyBodyTemplate, requestContentType, tokenPattern, redirectPattern, verifySuccessPattern, referencePattern }, callbackUrl)
	        : new UnsupportedGateway(provider, callbackUrl);
	      break;
  }

  gatewayCache = { instance, expiresAt: now + 60_000, key: cacheKey };
  return instance;
}

/** پاک کردن کش (مثلاً بعد از تغییر تنظیمات در ادمین) */
export function clearPaymentCache() {
  gatewayCache = null;
}
