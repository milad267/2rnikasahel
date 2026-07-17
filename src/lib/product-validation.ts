import { z } from "zod";

export const productSchema = z.object({
  title: z.string().min(3, "نام محصول حداقل ۳ کاراکتر باید باشد").max(300, "عنوان محصول حداکثر ۳۰۰ کاراکتر می‌تواند باشد"),
  slug: z.string().min(2, "Slug حداقل ۲ کاراکتر"),
  sku: z.string().optional(),
  brandId: z.number().optional(),
  categoryId: z.number().optional(),
  shortDesc: z.string().optional(),
  fullDesc: z.string().optional(),
  price: z.string().min(1, "قیمت الزامی است").regex(/^[\d,]+$/, "فرمت قیمت نامعتبر"),
  discountPrice: z.string().optional(),
  stock: z.string().min(0),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  tagIds: z.array(z.number()),
  coverImage: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

export function validateProduct(data: unknown) {
  const result = productSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "خطای اعتبارسنجی";
    return { valid: false, error: firstError, errors };
  }
  return { valid: true, data: result.data, errors: null };
}
