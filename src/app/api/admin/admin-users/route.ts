import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { setAdminPermissions } from "@/lib/admin-permissions-server";
import { ADMIN_MODULES, type AdminModule } from "@/lib/admin-permissions";

/** GET: لیست همه کاربران */
export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || (admin.role !== "superadmin" && admin.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      email: users.email,
      role: users.role,
      companyName: users.companyName,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  // گرفتن دسترسی‌های هر کاربر (فقط برای ادمین‌ها)
  const withPerms = await Promise.all(
    allUsers.map(async (u) => ({
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

  // نقش ادمین فقط با مقدار ثابت ساخته می‌شود؛ کاربر نمی‌تواند با ارسال role دلخواه نقش بگیرد.
  const role: "admin" = "admin";

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
      role,
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

/** PUT: ویرایش کاربر (نام، موبایل، نقش، دسترسی‌ها) */
export async function PUT(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "superadmin") {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.id) {
    return NextResponse.json({ ok: false, error: "شناسه کاربر الزامی است." }, { status: 400 });
  }
  
  const targetId = Number(body.id);
  const permissions = (body?.permissions || []) as AdminModule[];

  // بررسی وجود کاربر
  const [targetUser] = await db
    .select({ id: users.id, role: users.role, name: users.name, phone: users.phone, email: users.email, companyName: users.companyName })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });
  }

  // سوپرادمین نمی‌تواند سوپرادمین دیگری را ویرایش کند (فقط خودش)
  if (targetUser.role === "superadmin" && admin.id !== targetId) {
    return NextResponse.json({ ok: false, error: "نمی‌توانید سوپر ادمین دیگری را ویرایش کنید." }, { status: 403 });
  }

  // به‌روزرسانی اطلاعات کاربر
  const updateData: Record<string, string | boolean | null> = {};
  
  // همیشه تمام فیلدها رو به‌روزرسانی کن (حتی اگر تغییر نکرده باشن)
  if (body.name !== undefined) {
    updateData.name = String(body.name).trim();
  }
  if (body.phone !== undefined) {
    updateData.phone = String(body.phone).trim();
  }
  if (body.email !== undefined) {
    updateData.email = String(body.email).trim() || null;
  }
  if (body.companyName !== undefined) {
    updateData.companyName = String(body.companyName).trim() || null;
  }
  // اجازه تغییر نقش به همه کاربران (از جمله سوپرادمین) داده شود
  if (body.role !== undefined) {
    updateData.role = body.role;
  }
  if (body.isActive !== undefined) {
    updateData.isActive = Boolean(body.isActive);
  }
  if (body.password && String(body.password).length >= 6) {
    updateData.passwordHash = hashPassword(String(body.password));
  }

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, targetId));
  }

  // به‌روزرسانی دسترسی‌ها برای همه کاربران
  await setAdminPermissions(targetId, permissions);

  return NextResponse.json({ ok: true, message: "کاربر با موفقیت به‌روزرسانی شد." });
}

/** DELETE: حذف کاربر */
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
    .select({ id: users.id, role: users.role, name: users.name })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ ok: false, error: "کاربر یافت نشد." }, { status: 404 });
  }

  if (targetUser.role === "superadmin") {
    return NextResponse.json({ ok: false, error: "نمی‌توانید سوپر ادمین را حذف کنید." }, { status: 403 });
  }

  // همه کاربران غیر از سوپرادمین واقعاً حذف می‌شوند
  await db.delete(users).where(eq(users.id, targetId));
  return NextResponse.json({ ok: true, message: "کاربر با موفقیت حذف شد." });
}
