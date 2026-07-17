import { db } from "@/db";
import { aiUsageEvents } from "@/db/schema";

export type AiUsageMeta = {
  agent: string;
  task?: string;
  provider: string;
  model: string;
  userId?: number;
  isAdmin?: boolean;
};

type Pricing = { input: number; output: number };

function modelPricing(provider: string, model: string): Pricing {
  const key = `${provider}:${model}`.toLowerCase();
  if (key.includes("gpt-4o-mini")) return { input: 0.15, output: 0.6 };
  if (key.includes("gpt-4o")) return { input: 2.5, output: 10 };
  if (key.includes("deepseek")) return { input: 0.27, output: 1.1 };
  if (key.includes("gemini") && key.includes("flash")) return { input: 0.1, output: 0.4 };
  if (key.includes("llama-3.3-70b")) return { input: 0.59, output: 0.79 };
  if (key.includes("mistral")) return { input: 0.2, output: 0.6 };
  return { input: 0, output: 0 };
}

function approximateTokens(value: unknown): number {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return Math.max(0, Math.ceil(text.length / 4));
}

function responseText(response: any): string {
  return String(response?.choices?.[0]?.message?.content || "");
}

async function persist(meta: AiUsageMeta, values: {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  usageSource: "provider" | "estimated";
  latencyMs: number;
  status: "success" | "error";
  errorCode?: string;
}) {
  const pricing = modelPricing(meta.provider, meta.model);
  const cost = (values.promptTokens * pricing.input + values.completionTokens * pricing.output) / 1_000_000;
  try {
    await db.insert(aiUsageEvents).values({
      agent: meta.agent,
      task: meta.task || meta.agent,
      provider: meta.provider || "custom",
      model: meta.model || "unknown",
      userId: meta.userId || null,
      isAdmin: !!meta.isAdmin,
      promptTokens: values.promptTokens,
      completionTokens: values.completionTokens,
      totalTokens: values.totalTokens,
      estimatedCostUsd: cost.toFixed(8),
      usageSource: values.usageSource,
      latencyMs: values.latencyMs,
      status: values.status,
      errorCode: values.errorCode?.slice(0, 100) || null,
    });
  } catch (error) {
    console.error("[AI_USAGE_WRITE]", error);
  }
}

/** تنها مسیر مجاز فراخوانی chat completion برای ثبت یکپارچه مصرف. */
export async function trackedChatCompletion<T = any>(
  client: any,
  request: any,
  meta: AiUsageMeta,
): Promise<T> {
  const started = Date.now();
  try {
    const response = await client.chat.completions.create(request);
    const promptTokens = Number(response.usage?.prompt_tokens) || approximateTokens(request.messages);
    const completionTokens = Number(response.usage?.completion_tokens) || approximateTokens(responseText(response));
    const hasProviderUsage = Number.isFinite(Number(response.usage?.total_tokens)) && Number(response.usage?.total_tokens) > 0;
    await persist(meta, {
      promptTokens,
      completionTokens,
      totalTokens: Number(response.usage?.total_tokens) || promptTokens + completionTokens,
      usageSource: hasProviderUsage ? "provider" : "estimated",
      latencyMs: Date.now() - started,
      status: "success",
    });
    return response as T;
  } catch (error: any) {
    await persist(meta, {
      promptTokens: approximateTokens(request.messages),
      completionTokens: 0,
      totalTokens: approximateTokens(request.messages),
      usageSource: "estimated",
      latencyMs: Date.now() - started,
      status: "error",
      errorCode: String(error?.code || error?.status || error?.name || "unknown"),
    });
    throw error;
  }
}

