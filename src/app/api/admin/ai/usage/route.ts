import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, like } from "drizzle-orm";
import { db } from "@/db";
import { aiUsageEvents, siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-security";
import { hasModuleAccess } from "@/lib/admin-permissions-server";

export const dynamic = "force-dynamic";

type Bucket = { requests: number; totalTokens: number; promptTokens: number; completionTokens: number; costUsd: number; errors: number; latencyTotal: number };
const emptyBucket = (): Bucket => ({ requests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, costUsd: 0, errors: 0, latencyTotal: 0 });

function add(bucket: Bucket, event: typeof aiUsageEvents.$inferSelect) {
  bucket.requests++;
  bucket.totalTokens += event.totalTokens;
  bucket.promptTokens += event.promptTokens;
  bucket.completionTokens += event.completionTokens;
  bucket.costUsd += Number(event.estimatedCostUsd || 0);
  bucket.errors += event.status === "error" ? 1 : 0;
  bucket.latencyTotal += event.latencyMs;
}

function finish<T extends Bucket & Record<string, unknown>>(bucket: T) {
  return {
    ...bucket,
    successRate: bucket.requests ? Number((((bucket.requests - bucket.errors) / bucket.requests) * 100).toFixed(1)) : 0,
    avgLatencyMs: bucket.requests ? Math.round(bucket.latencyTotal / bucket.requests) : 0,
    costUsd: Number(bucket.costUsd.toFixed(6)),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  if (!await hasModuleAccess(auth.user!.id, auth.user!.role, "ai")) {
    return NextResponse.json({ ok: false, error: "شما به گزارش مصرف هوش مصنوعی دسترسی ندارید." }, { status: 403 });
  }

  const days = [7, 30, 90].includes(Number(req.nextUrl.searchParams.get("days"))) ? Number(req.nextUrl.searchParams.get("days")) : 30;
  const agent = req.nextUrl.searchParams.get("agent")?.trim();
  const provider = req.nextUrl.searchParams.get("provider")?.trim();
  const model = req.nextUrl.searchParams.get("model")?.trim();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filters = [gte(aiUsageEvents.createdAt, from)];
  if (agent) filters.push(eq(aiUsageEvents.agent, agent));
  if (provider) filters.push(eq(aiUsageEvents.provider, provider));
  if (model) filters.push(eq(aiUsageEvents.model, model));

  const [events, configuredRows] = await Promise.all([
    db.select().from(aiUsageEvents).where(and(...filters)).orderBy(asc(aiUsageEvents.createdAt)).limit(50_000),
    db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings)
      .where(and(eq(siteSettings.group, "ai"), like(siteSettings.key, "ai.%.api_key"))),
  ]);

  const total = emptyBucket();
  const daily = new Map<string, Bucket>();
  const byAgent = new Map<string, Bucket>();
  const byProvider = new Map<string, Bucket>();
  const byModel = new Map<string, Bucket>();

  for (const event of events) {
    add(total, event);
    const day = event.createdAt.toISOString().slice(0, 10);
    const targets: Array<[Map<string, Bucket>, string]> = [
      [daily, day], [byAgent, event.agent], [byProvider, event.provider], [byModel, event.model],
    ];
    for (const [map, key] of targets) {
      const bucket = map.get(key) || emptyBucket();
      add(bucket, event);
      map.set(key, bucket);
    }
  }

  const configuredAgents = configuredRows
    .filter(row => String(row.value || "").trim())
    .map(row => row.key.match(/^ai\.([^.]+)\.api_key$/)?.[1])
    .filter((value): value is string => !!value);

  const formatMap = (map: Map<string, Bucket>, keyName: string) => Array.from(map, ([key, bucket]) => finish({ [keyName]: key, ...bucket }));
  return NextResponse.json({
    ok: true,
    range: { days, from: from.toISOString(), to: new Date().toISOString(), eventCount: events.length },
    kpis: finish(total),
    timeline: formatMap(daily, "date"),
    agents: formatMap(byAgent, "agent").sort((a, b) => b.totalTokens - a.totalTokens),
    providers: formatMap(byProvider, "provider").sort((a, b) => b.totalTokens - a.totalTokens),
    models: formatMap(byModel, "model").sort((a, b) => b.totalTokens - a.totalTokens),
    configuredAgents: Array.from(new Set(configuredAgents)).sort(),
    freshness: new Date().toISOString(),
    caveat: "هزینه‌ها بر اساس جدول تخمینی قیمت مدل محاسبه شده‌اند؛ صورت‌حساب نهایی provider مرجع قطعی است.",
  });
}
