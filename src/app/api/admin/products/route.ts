import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, productVariants, productTags, cartItems } from "@/db/schema";
import { eq, asc, like, count, and, or, sql, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

type AttrInput = { key: string; value: string };
type VariantInput = { name: string; unitId?: number; subUnit?: string; sku?: string; price?: string; shortDesc?: string; hasDiscount?: boolean; discountType?: string; discountValue?: string; discountPrice?: string };

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim() || "";
  const status = url.searchParams.get("status") || "";

  const conditions = [];
  if (search) {
    conditions.push(or(
      like(products.title, `%${search}%`),
      like(products.slug, `%${search}%`),
    ));
  }
  if (status === "active") conditions.push(eq(products.isActive, true));
  else if (status === "inactive") conditions.push(eq(products.isActive, false));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ value: count() }).from(products).where(where);
  const total = Number(countResult?.value || 0);

  const data = await db
    .select({
      id: products.id, title: products.title, slug: products.slug,
      coverImage: products.coverImage, isActive: products.isActive,
      categoryId: products.categoryId, brandId: products.brandId, sortOrder: products.sortOrder,
      categoryTitle: categories.title,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(asc(products.sortOrder))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    ok: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: offset + limit < total },
  });
}

function buildSpecSheet(attrs?: AttrInput[]): Record<string, string> {
  const spec: Record<string, string> = {};
  (attrs || []).forEach(a => {
    if (a?.key?.trim() && a?.value?.trim()) spec[a.key.trim()] = a.value.trim();
  });
  return spec;
}

const digits = (s: unknown) => String(s ?? "").replace(/[^0-9]/g, "");

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (e) {
    console.error("🔴 Auth error:", e);
    return NextResponse.json({ ok: false, error: "خطا در احراز هویت" }, { status: 500 });
  }
  
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  
  try {
    const body = await req.json();
    
    const { title, slug, price, stock, categoryId, brandId, isActive, isFeatured, sortOrder, sku, coverImage, images, attrs, variantsEnabled, variants, unitId, subUnit, hasDiscount, discountType, discountValue, discountPrice } = body;
    if (!title) return NextResponse.json({ ok: false, error: "نام محصول الزامی است" }, { status: 400 });

    // محدودیت طول عنوان (ایمن‌سازی در برابر خطای دیتابیس)
    const safeTitle = String(title).trim().slice(0, 300);

    // همیشه همه فیلدها رو با مقادیر explicit بفرست
    const [created] = await db.insert(products).values({
      title: safeTitle,
      slug: (slug || title.replace(/\s+/g, "-").toLowerCase()).trim(),
      categoryId: (categoryId && Number(categoryId) > 0) ? Number(categoryId) : null,
      brandId: (brandId && Number(brandId) > 0) ? Number(brandId) : null,
      isActive: isActive !== false,
      isFeatured: isFeatured === true,
      sortOrder: Number(sortOrder) || 0,
      description: body.fullDesc?.trim() || null,
      subtitle: body.shortDesc?.trim() || null,
      coverImage: coverImage?.trim() || null,
      images: images?.length ? images : [],
      metaTitle: null,
      metaDesc: null,
    }).returning();

    const specSheet = buildSpecSheet(attrs);
    const baseStock = Number(digits(stock)) || 0;
    const baseSku = (sku && String(sku).trim()) || `DS-${created.id}`;

    const rows: VariantInput[] = variantsEnabled && Array.isArray(variants) && variants.length
      ? variants.filter((v: VariantInput) => v?.name?.trim())
      : [{ name: title, unitId: unitId ? Number(unitId) : 0, subUnit: subUnit || "", sku: baseSku, price: digits(price), shortDesc: body.shortDesc || "" }];

    if (rows.length) {
      await db.insert(productVariants).values(
        rows.map((v, i) => ({
          productId: created.id,
          unitId: v.unitId ? Number(v.unitId) : null,
          sku: (v.sku && String(v.sku).trim()) || `${baseSku}-${i + 1}`,
          name: v.name?.trim() || title,
          price: digits(v.price) || digits(price) || "0",
          unitValue: v.subUnit?.trim() || null,
          stock: baseStock,
          specSheet,
          sortOrder: i,
          hasDiscount: v.hasDiscount === true || (i === 0 && hasDiscount === true),
          discountType: v.discountType || (i === 0 ? discountType : null) || "percent",
          discountValue: v.discountValue || (i === 0 ? digits(discountValue) : null) || "0",
          discountPrice: v.discountPrice || (i === 0 ? digits(discountPrice) : null) || "0",
        }))
      );
    }

    return NextResponse.json({ ok: true, product: created });
  } catch (error) {
    console.error("🔴 Error in POST /api/admin/products:", error);
    return safeErrorResponse(error, "products-create");
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ ok: false, error: "شناسه محصول الزامی است" }, { status: 400 });

    const updateData: Record<string, any> = {};
    if (updates.title !== undefined) updateData.title = String(updates.title).trim().slice(0, 300);
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.isFeatured !== undefined) updateData.isFeatured = updates.isFeatured;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
    if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId;
    if (updates.coverImage !== undefined) updateData.coverImage = updates.coverImage;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.subtitle !== undefined) updateData.subtitle = updates.subtitle;
    if (updates.images !== undefined) updateData.images = updates.images;

    if (Object.keys(updateData).length > 0) {
      await db.update(products).set(updateData).where(eq(products.id, id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeErrorResponse(error, "products-update");
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "شناسه محصول الزامی است" }, { status: 400 });
  }

  try {
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!product) {
      return NextResponse.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      const variants = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, id));
      const variantIds = variants.map((v) => v.id);
      if (variantIds.length > 0) {
        await tx.delete(cartItems).where(inArray(cartItems.variantId, variantIds));
        await tx.delete(productVariants).where(inArray(productVariants.id, variantIds));
      }
      await tx.delete(productTags).where(eq(productTags.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    });

    return NextResponse.json({ ok: true, message: "محصول با موفقیت حذف شد" });
  } catch (error) {
    console.error("Delete product error:", error);
    const msg = (error as Error)?.message || "خطا در حذف محصول";
    if (/foreign key|violates|restrict/i.test(msg)) {
      return NextResponse.json({
        ok: false,
        error: "این محصول به سفارش یا داده‌های مرتبط وصل است و فعلاً قابل حذف نیست.",
      }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "خطا در حذف محصول" }, { status: 500 });
  }
}