import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ALL_GATEWAYS, type PaymentGateway } from "@/lib/gateways";

const BUILT_IN_REQUIREMENTS: Partial<Record<PaymentGateway, string[]>> = {
  zarinpal: ["merchant_id"], zibal: ["merchant_id"], idpay: ["api_key"], payir: ["api_key"],
  sep: ["merchant_id"], saman: ["merchant_id"], sandbox: [],
  usdt: ["wallet_address"], bitcoin: ["wallet_address"],
};

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; }
    catch { return []; }
  }
  return [];
}

export async function getAvailablePaymentGateways() {
  const rows = await db.select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings).where(eq(siteSettings.group, "payment"));
  const settings = new Map(rows.map((row) => [row.key, row.value]));
  const active = stringList(settings.get("payment.active_gateways"));
  const preferred = String(settings.get("payment.active_gateway") || "");

  const gateways = ALL_GATEWAYS.filter((gateway) => active.includes(gateway.slug))
    .filter((gateway) => process.env.NODE_ENV !== "production" || gateway.slug !== "sandbox")
    .map((gateway) => {
      const required = BUILT_IN_REQUIREMENTS[gateway.slug] || ["request_url", "verify_url"];
      const ready = required.every((field) => {
        const value = settings.get(`payment.${gateway.slug}.${field}`);
        return typeof value === "string" && value.trim().length > 0;
      });
      return { value: gateway.slug, title: gateway.name, desc: gateway.desc, ready, isDefault: gateway.slug === preferred };
    }).filter((gateway) => gateway.ready);
  gateways.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  return gateways;
}

export async function isPaymentGatewayAvailable(gateway: PaymentGateway) {
  return (await getAvailablePaymentGateways()).some((item) => item.value === gateway);
}
