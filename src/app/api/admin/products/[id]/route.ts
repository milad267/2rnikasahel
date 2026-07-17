import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productVariants, productTags, categories, brands, units, cartItems } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/safe-error";

type AttrInput = { key: string; value: string };
type VariantInput = { name: string; unitId?: number; subUnit?: string; sku?: string; price?: string; shortDesc?: string; hasDiscount?: boolean; discountType?: string; discountValue?: string; discountPrice?: string };

// ساخت specSheet از فهرست ویژگی‌ها
function buildSpecSheet(attrs?: AttrInput[]): Record<string, string> {
  const spec: Record<string, string> = {};
  (attrs || []).forEach(a => {
    if (a?.key?.trim() && a?.value?.trim()) spec[a.key.trim()] = a.value.trim();
  });
  return spec;
}

const digits = (s: unknown) => String(s ?? "").replace(/[^0-9]/g, "");

/** GET: دریافت جزئیات کامل محصول برای ویرایش */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const productId = Number(id);

    // دریافت محصول
    const [product] = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        subtitle: products.subtitle,
        description: products.description,
        coverImage: products.coverImage,
        images: products.images,
        isActive: products.isActive,
        isFeatured: products.isFeatured,
        categoryId: products.categoryId,
        brandId: products.brandId,
        sortOrder: products.sortOrder,
        categoryTitle: categories.title,
        brandName: brands.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });
    }

    // دریافت تنوع‌ها
    const variants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        name: productVariants.name,
        nameEn: productVariants.nameEn,
        price: productVariants.price,
        unitValue: productVariants.unitValue,
        stock: productVariants.stock,
        specSheet: productVariants.specSheet,
        unitId: productVariants.unitId,
        unitName: units.name,
        unitSymbol: units.symbol,
        isActive: productVariants.isActive,
        sortOrder: productVariants.sortOrder,
        hasDiscount: productVariants.hasDiscount,
        discountType: productVariants.discountType,
        discountValue: productVariants.discountValue,
        discountPrice: productVariants.discountPrice,
      })
      .from(productVariants)
      .leftJoin(units, eq(productVariants.unitId, units.id))
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.sortOrder);

    // دریافت تگ‌ها
    const productTagRecords = await db
      .select({ tagId: productTags.tagId })
      .from(productTags)
      .where(eq(productTags.productId, productId));

    const tagIds = productTagRecords.map(pt => pt.tagId);

    return NextResponse.json({
      ok: true,
      product: {
        ...product,
        variants,
        tagIds,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "خطا در دریافت محصول" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const productId = Number(id);
    const body = await req.json();
    const { title, slug, isActive, isFeatured, categoryId, brandId, sortOrder, coverImage, images, subtitle, description, attrs, variantsEnabled, variants, sku, price, stock, unitId, subUnit, hasDiscount, discountType, discountValue, discountPrice } = body;

    const [updated] = await db.update(products).set({
      ...(title && { title }), ...(slug && { slug }),
      ...(isActive !== undefined && { isActive }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(brandId !== undefined && { brandId: brandId || null }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(coverImage !== undefined && { coverImage: coverImage || null }),
      ...(images !== undefined && { images }),
      ...(subtitle !== undefined && { subtitle: subtitle ?? body.shortDesc }),
      ...(description !== undefined && { description: description ?? body.fullDesc }),
    }).where(eq(products.id, productId)).returning();

    // در صورت ارسال ویژگی‌ها/تنوع‌ها، تنوع‌های قبلی را جایگزین کن
    if (attrs !== undefined || variants !== undefined) {
      const specSheet = buildSpecSheet(attrs);
      const baseStock = Number(digits(stock)) || 0;
      const baseSku = (sku && String(sku).trim()) || `DS-${productId}`;

      const rows: VariantInput[] = variantsEnabled && Array.isArray(variants) && variants.length
        ? variants.filter((v: VariantInput) => v?.name?.trim())
        : [{ name: title || updated.title, unitId: unitId ? Number(unitId) : 0, subUnit: subUnit || "", sku: baseSku, price: digits(price), shortDesc: body.shortDesc || "" }];

      // cart_items.variant_id = RESTRICT — قبل از حذف تنوع‌های قدیمی، آیتم‌های سبد مرتبط پاک شوند
      const oldVariants = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, productId));
      const oldIds = oldVariants.map((v) => v.id);
      if (oldIds.length > 0) {
        await db.delete(cartItems).where(inArray(cartItems.variantId, oldIds));
        await db.delete(productVariants).where(inArray(productVariants.id, oldIds));
      }
      if (rows.length) {
        await db.insert(productVariants).values(
          rows.map((v, i) => ({
            productId,
            unitId: v.unitId ? Number(v.unitId) : null,
            sku: (v.sku && String(v.sku).trim()) || `${baseSku}-${i + 1}`,
            name: v.name?.trim() || title || updated.title,
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
    }

    return NextResponse.json({ ok: true, product: updated });
  } catch (error) {
    return safeErrorResponse(error, "products-id-update");
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "superadmin" && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const productId = Number(id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه محصول نامعتبر است" }, { status: 400 });
    }

    // ابتدا بررسی وجود محصول
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return NextResponse.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });
    }

    // حذف وابستگی‌ها در یک تراکنش تا FK مانع حذف نشود
    // cart_items.variant_id = RESTRICT → باید قبل از حذف variant پاک شود
    // order_items.variant_id = SET NULL → با حذف variant خودکار null می‌شود
    // product_tags / wishlist_items = CASCADE روی product
    await db.transaction(async (tx) => {
      const variants = await tx
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, productId));

      const variantIds = variants.map((v) => v.id);
      if (variantIds.length > 0) {
        await tx.delete(cartItems).where(inArray(cartItems.variantId, variantIds));
        await tx.delete(productVariants).where(inArray(productVariants.id, variantIds));
      }

      // تگ‌ها و wishlist با cascade پاک می‌شوند؛ برای اطمینان صریح هم حذف می‌کنیم
      await tx.delete(productTags).where(eq(productTags.productId, productId));
      await tx.delete(products).where(eq(products.id, productId));
    });

    return NextResponse.json({ ok: true, message: "محصول با موفقیت حذف شد" });
  } catch (error) {
    console.error("Delete product error:", error);
    const msg = (error as Error)?.message || "خطا در حذف محصول";
    // پیام قابل‌فهم برای محدودیت‌های FK احتمالی
    if (/foreign key|violates|restrict/i.test(msg)) {
      return NextResponse.json({
        ok: false,
        error: "این محصول به سفارش یا داده‌های مرتبط وصل است و فعلاً قابل حذف نیست.",
      }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "خطا در حذف محصول" }, { status: 500 });
  }
}
