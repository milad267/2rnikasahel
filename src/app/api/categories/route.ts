import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/shop";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = await getAllCategories();

  // ساختن ساختار درختی: والدها (parentId === null) + فرزندان
  const parents = cats.filter((c) => c.parentId === null);
  const children = cats.filter((c) => c.parentId !== null);

  const result = parents.map((parent) => {
    const childCats = children.filter((c) => c.parentId === parent.id);
    // جمع محصولات والد + تمام فرزندان
    const totalProducts = parent.productCount + childCats.reduce((sum, child) => sum + child.productCount, 0);

    return {
      id: parent.id,
      slug: parent.slug,
      title: parent.title,
      description: parent.description,
      productCount: totalProducts,
      children: childCats.map((child) => ({
        id: child.id,
        slug: child.slug,
        title: child.title,
        description: child.description,
        productCount: child.productCount,
      })),
    };
  });

  return NextResponse.json(result);
}
