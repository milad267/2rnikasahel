import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userAddresses } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/safe-error";

/** GET: فهرست آدرس‌های کاربر */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });

  try {
    const addresses = await db
      .select()
      .from(userAddresses)
      .where(eq(userAddresses.userId, user.id))
      .orderBy(desc(userAddresses.isDefault), desc(userAddresses.id));

    return NextResponse.json({ ok: true, addresses });
  } catch (error) {
    return safeErrorResponse(error, "profile-addresses-get");
  }
}

/** POST: افزودن آدرس جدید */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const title = String(body?.title || "").trim();
    const province = String(body?.province || "").trim();
    const city = String(body?.city || "").trim();
    const postalAddress = String(body?.postalAddress || "").trim();
    const postalCode = body?.postalCode ? String(body.postalCode).trim() : undefined;
    const receiverName = body?.receiverName ? String(body.receiverName).trim() : undefined;
    const receiverPhone = body?.receiverPhone ? String(body.receiverPhone).trim() : undefined;

    if (!title || !province || !city || !postalAddress) {
      return NextResponse.json(
        { ok: false, error: "عنوان، استان، شهر و آدرس الزامی است." },
        { status: 400 },
      );
    }

    // اعتبارسنجی کد پستی (۱۰ رقم)
    if (postalCode && !/^\d{10}$/.test(postalCode)) {
      return NextResponse.json(
        { ok: false, error: "کد پستی باید ۱۰ رقم باشد." },
        { status: 400 },
      );
    }

    // اعتبارسنجی شماره تلفن گیرنده
    if (receiverPhone && !/^0?9\d{9}$/.test(receiverPhone.replace(/[\s-]/g, ""))) {
      return NextResponse.json(
        { ok: false, error: "شماره تلفن گیرنده معتبر نیست." },
        { status: 400 },
      );
    }

    // اگر این اولین آدرس باشه، پیش‌فرض بشه
    const [count] = await db
      .select({ c: userAddresses.id })
      .from(userAddresses)
      .where(eq(userAddresses.userId, user.id))
      .limit(1);
    const isDefault = !count;

    const [addr] = await db
      .insert(userAddresses)
      .values({
        userId: user.id,
        title,
        province,
        city,
        postalAddress,
        postalCode: postalCode || null,
        receiverName: receiverName || null,
        receiverPhone: receiverPhone || null,
        isDefault,
      })
      .returning();

    return NextResponse.json({ ok: true, address: addr });
  } catch (error) {
    return safeErrorResponse(error, "profile-addresses-post");
  }
}

/** PUT: ویرایش آدرس */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });

  try {
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "آدرس نامعتبر." }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.province !== undefined) updates.province = String(body.province).trim();
    if (body.city !== undefined) updates.city = String(body.city).trim();
    if (body.postalAddress !== undefined) updates.postalAddress = String(body.postalAddress).trim();
    if (body.postalCode !== undefined) {
      const pc = String(body.postalCode).trim();
      if (pc && !/^\d{10}$/.test(pc)) {
        return NextResponse.json({ ok: false, error: "کد پستی باید ۱۰ رقم باشد." }, { status: 400 });
      }
      updates.postalCode = pc || null;
    }
    if (body.receiverName !== undefined) updates.receiverName = body.receiverName ? String(body.receiverName).trim() : null;
    if (body.receiverPhone !== undefined) {
      const rp = String(body.receiverPhone).trim();
      if (rp && !/^0?9\d{9}$/.test(rp.replace(/[\s-]/g, ""))) {
        return NextResponse.json({ ok: false, error: "شماره تلفن گیرنده معتبر نیست." }, { status: 400 });
      }
      updates.receiverPhone = rp || null;
    }
    if (body.isDefault === true) {
      // فقط این آدرس پیش‌فرض بشه
      await db
        .update(userAddresses)
        .set({ isDefault: false })
        .where(eq(userAddresses.userId, user.id));
      updates.isDefault = true;
    }

    const [updated] = await db
      .update(userAddresses)
      .set(updates)
      .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, user.id)))
      .returning();


    if (!updated) {
      return NextResponse.json({ ok: false, error: "آدرس یافت نشد." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, address: updated });
  } catch (error) {
    return safeErrorResponse(error, "profile-addresses-put");
  }
}

/** DELETE: حذف آدرس */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "لطفاً وارد شوید." }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "آدرس نامعتبر." }, { status: 400 });
    }

    await db
      .delete(userAddresses)
      .where(and(eq(userAddresses.id, id), eq(userAddresses.userId, user.id)));


    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
