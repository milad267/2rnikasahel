import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/admin-security";
import { ADMIN_MODULES, type AdminModule } from "@/lib/admin-permissions";

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isAdminModuleKey(value: unknown): value is AdminModule {
  return ADMIN_MODULES.some((m) => m.key === value);
}

function validateModules(modules: unknown): AdminModule[] | null {
  if (!Array.isArray(modules)) return null;
  const cleaned = modules.filter(isAdminModuleKey);
  // اگر برخی کلیدها نامعتبر بودند، null برمی‌گردانیم تا خطا بدهیم
  if (cleaned.length !== modules.length) return null;
  return cleaned;
}

const GROUP = "admin-role-templates";

type RoleTemplatePayload = {
  slug: string;
  name: string;
  modules: AdminModule[];
};

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  // اختیاری: فیلتر slug
  const slug = url.searchParams.get("slug");

  if (slug) {
    const cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) {
      return NextResponse.json({ ok: false, error: "slug نامعتبر است" }, { status: 400 });
    }
    const key = `admin.roleTemplates.${cleanSlug}`;
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);

    if (!row?.value) {
      return NextResponse.json({ ok: false, error: "قالب پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, template: row.value as RoleTemplatePayload });
  }

  const templates = await db
    .select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.group, GROUP));

  const result = templates
    .map((t) => {
      const value = t.value as RoleTemplatePayload;
      return {
        slug: value.slug || t.key.replace("admin.roleTemplates.", ""),
        name: value.name,
        modules: value.modules,
      };
    })
    .filter((t) => Boolean(t.slug));

  return NextResponse.json({ ok: true, templates: result });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const rawSlug = String(body?.slug || "");
  const slug = normalizeSlug(rawSlug);
  const name = String(body?.name || "").trim();
  const modules = validateModules(body?.modules);

  if (!slug || slug.length < 2) {
    return NextResponse.json({ ok: false, error: "slug نامعتبر است" }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, error: "نام الزامی است" }, { status: 400 });
  }
  if (!modules) {
    return NextResponse.json({ ok: false, error: "modules نامعتبر است" }, { status: 400 });
  }

  const key = `admin.roleTemplates.${slug}`;

  const [existing] = await db
    .select({ id: siteSettings.id })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);

  if (existing) {
    return NextResponse.json({ ok: false, error: "این قالب قبلاً وجود دارد" }, { status: 409 });
  }

  const payload: RoleTemplatePayload = { slug, name, modules };
  await db.insert(siteSettings).values({
    key,
    group: GROUP,
    locale: "fa",
    value: payload as any,
    description: `template role ${slug}`,
  });

  return NextResponse.json({ ok: true, template: payload });
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const rawSlug = String(body?.slug || "");
  const slug = normalizeSlug(rawSlug);
  const name = String(body?.name || "").trim();
  const modules = validateModules(body?.modules);

  if (!slug || slug.length < 2) {
    return NextResponse.json({ ok: false, error: "slug نامعتبر است" }, { status: 400 });
  }
  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, error: "نام الزامی است" }, { status: 400 });
  }
  if (!modules) {
    return NextResponse.json({ ok: false, error: "modules نامعتبر است" }, { status: 400 });
  }

  const key = `admin.roleTemplates.${slug}`;
  const payload: RoleTemplatePayload = { slug, name, modules };

  await db
    .update(siteSettings)
    .set({
      value: payload as any,
      updatedAt: new Date(),
      description: `template role ${slug}`,
    })
    .where(eq(siteSettings.key, key));

  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);

  if (!row?.value) {
    return NextResponse.json({ ok: false, error: "قالب پیدا نشد" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, template: payload });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const slug = normalizeSlug(url.searchParams.get("slug") || "");
  if (!slug) {
    return NextResponse.json({ ok: false, error: "slug نامعتبر است" }, { status: 400 });
  }

  const key = `admin.roleTemplates.${slug}`;

  await db.delete(siteSettings).where(eq(siteSettings.key, key));

  return NextResponse.json({ ok: true, message: "قالب حذف شد" });
}
