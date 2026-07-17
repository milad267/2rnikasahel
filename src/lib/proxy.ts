/**
 * Shared Proxy / VPN utility for Instagram & Telegram
 * خواندن تنظیمات پروکسی اشتراکی و ایجاد درخواست‌های پروکسی شده
 */

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export interface ProxyConfig {
  enabled: boolean;
  type: "http" | "socks5" | "v2ray" | "custom";
  host: string;
  port: number;
  username?: string;
  password?: string;
  v2rayLink?: string;
}

const DEFAULT_PROXY: ProxyConfig = {
  enabled: false,
  type: "http",
  host: "",
  port: 0,
  username: "",
  password: "",
  v2rayLink: "",
};

/**
 * خواندن تنظیمات پروکسی اشتراکی از دیتابیس
 * تنظیمات در site_settings با گروه "proxy" ذخیره می‌شوند
 */
export async function getProxyConfig(): Promise<ProxyConfig> {
  try {
    const rows = await db
      .select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.group, "proxy"));

    const map: Record<string, string> = {};
    rows.forEach((r) => {
      map[r.key.replace("proxy.", "")] = typeof r.value === "string" ? r.value : "";
    });

    return {
      enabled: map.enabled === "true",
      type: (map.type as ProxyConfig["type"]) || "http",
      host: map.host || "",
      port: parseInt(map.port || "0", 10),
      username: map.username || "",
      password: map.password || "",
      v2rayLink: map.v2ray_link || "",
    };
  } catch {
    return { ...DEFAULT_PROXY };
  }
}

/**
 * ساختن آدرس پروکسی از تنظیمات
 * مثال: http://user:pass@host:port یا socks5://host:port
 */
export function buildProxyUrl(config: ProxyConfig): string | null {
  if (!config.enabled || !config.host || !config.port) return null;

  let protocol = config.type;
  // socks5 را به فرمت مناسب undici تبدیل کن
  if (protocol === "v2ray" || protocol === "custom") protocol = "http";

  const auth =
    config.username && config.password
      ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
      : "";

  return `${protocol}://${auth}${config.host}:${config.port}`;
}

/**
 * استخراج هاست و پورت از لینک V2Ray
 */
export function parseV2RayLink(link: string): { host: string; port: number } | null {
  try {
    if (link.startsWith("vless://") || link.startsWith("trojan://") || link.startsWith("ss://")) {
      const match = link.match(/@([^:]+):(\d+)/);
      if (match) return { host: match[1], port: parseInt(match[2], 10) };
    }
    if (link.startsWith("vmess://")) {
      try {
        const b64 = link.replace("vmess://", "");
        const decoded = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
        return { host: decoded.add || decoded.host, port: decoded.port || 443 };
      } catch {
        const match = link.match(/@([^:]+):(\d+)/);
        if (match) return { host: match[1], port: parseInt(match[2], 10) };
      }
    }
    try {
      const url = new URL(link);
      if (url.hostname) return { host: url.hostname, port: parseInt(url.port, 10) || 443 };
    } catch {
      // ignore
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * ارسال درخواست fetch از طریق پروکسی با استفاده از undici ProxyAgent
 * اگر پروکسی فعال نباشد، مستقیماً درخواست می‌زند
 */
export async function fetchWithProxy(
  url: string,
  options: RequestInit = {},
  proxyConfig?: ProxyConfig,
): Promise<Response> {
  if (!proxyConfig?.enabled) {
    return fetch(url, options);
  }

  const proxyUrl = buildProxyUrl(proxyConfig);
  if (!proxyUrl) return fetch(url, options);

  try {
    // undici در Node.js 18+ به صورت built-in موجود است
    const { ProxyAgent } = await import("undici");
    const agent = new ProxyAgent(proxyUrl);

    return fetch(url, {
      ...options,
      // @ts-ignore - dispatcher یک option اختصاصی undici است
      dispatcher: agent,
    });
  } catch {
    // Fallback به fetch عادی
    return fetch(url, options);
  }
}

/**
 * ذخیره تنظیمات پروکسی اشتراکی در دیتابیس
 */
export async function saveProxyConfig(config: ProxyConfig): Promise<boolean> {
  try {
    const entries = [
      { key: "proxy.enabled", value: config.enabled ? "true" : "false", group: "proxy" },
      { key: "proxy.type", value: config.type, group: "proxy" },
      { key: "proxy.host", value: config.host, group: "proxy" },
      { key: "proxy.port", value: String(config.port), group: "proxy" },
      { key: "proxy.username", value: config.username || "", group: "proxy" },
      { key: "proxy.password", value: config.password || "", group: "proxy" },
      { key: "proxy.v2ray_link", value: config.v2rayLink || "", group: "proxy" },
    ];

    for (const entry of entries) {
      await db
        .insert(siteSettings)
        .values({
          key: entry.key,
          group: entry.group,
          value: entry.value,
          locale: "fa",
        })
        .onConflictDoUpdate({
          target: [siteSettings.key, siteSettings.locale],
          set: { value: entry.value, updatedAt: new Date() },
        });
    }
    return true;
  } catch {
    return false;
  }
}
