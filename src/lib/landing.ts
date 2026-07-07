import { db } from "@/db";
import { landingSlides, landingFeatures } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getLandingSlides() {
  try {
    return await db.select().from(landingSlides).where(eq(landingSlides.isActive, true)).orderBy(asc(landingSlides.sortOrder));
  } catch { return []; }
}

export async function getLandingFeatures() {
  try {
    return await db.select().from(landingFeatures).where(eq(landingFeatures.isActive, true)).orderBy(asc(landingFeatures.sortOrder));
  } catch { return []; }
}
