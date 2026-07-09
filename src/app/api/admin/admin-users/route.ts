import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { setAdminPermissions, ADMIN_MODULES, type AdminModule } from "@/lib/admin-permissions";

/** GET: لیست ادمین‌ها */
export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const adminList = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      role: users.role,
      companyName: users.companyName,
      isActive: users.isActive,
    })
    .from(users)
    .where(inArray(users.role, ["superadmin", "admin"]))
    .orderBy(users.name);

  // گرفتن دسترسی‌های هر ادمین
  const withPerms = await Promise.all(
    adminList.map(async (u) => ({
      ...u,
      permissions: u.role === "superadmin"
        ? ADMIN_MODULES.map((m) => m.key)
        : [],
    }))
  );

  return NextResponse.json({ ok: true, admins: withPerms });
}

/** POST: ایجاد ادمین جدید */
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const phone = String(body?.phone || "").trim();
  const password = String(body?.password || "");
  const permissions = (body?.permissions || []) as AdminModule[];

  if (!name || !phone || password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "نام، شماره موبایل و رمز عبور (حداقل ۶ کاراکتر) الزامی است." },
      { status: 400 },
    );
  }

  // بررسی تکراری نبودن
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  if (existing) {
    return NextResponse.json({ ok: false, error: "این شماره قبلاً ثبت شده." }, { status: 409 });
  }

  const pwdHash = hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({
      name,
      phone,
      passwordHash: pwdHash,
      role: "admin",
    })
    .returning({ id: users.id });

  // ذخیره دسترسی‌ها
  if (permissions.length > 0) {
    await setAdminPermissions(created.id, permissions);
  }

  return NextResponse.json({
    ok: true,
    admin: { id: created.id, name, phone, role: "admin", permissions },
  });
}

/** PUT: ویرایش دسترسی‌های ادمین */
export async function PUT(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const targetId = Number(body?.id);
  const permissions = (body?.permissions || []) as AdminModule[];

  if (!targetId) {
    return NextResponse.json({ ok: false, error: "شناسه کاربر الزامی است." }, { status: 400 });
  }

  // بررسی وجود کاربر
  const [targetUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!targetUser || targetUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: "کاربر یافت نشد یا ادمین نیست." }, { status: 404 });
  }

  // ذخیره دسترسی‌ها
  await setAdminPermissions(targetId, permissions);

  return NextResponse.json({ ok: true, message: "دسترسی‌ها به‌روزرسانی شد." });
}

/** DELETE: حذف ادمین */
export async function DELETE(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const targetId = Number(req.nextUrl.searchParams.get("id"));
  if (!targetId) {
    return NextResponse.json({ ok: false, error: "شناسه کاربر الزامی است." }, { status: 400 });
  }

  // بررسی وجود کاربر
  const [targetUser] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!targetUser || targetUser.role !== "admin") {
    return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });
  }

  // تغییر نقش به customer (حذف نشه، فقط دسترسی ادمین گرفته بشه)
  await db.update(users).set({ role: "customer" }).where(eq(users.id, targetId));

  return NextResponse.json({ ok: true, message: "دسترسی ادمین کاربر لغو شد." });
}
