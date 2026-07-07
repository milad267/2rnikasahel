import { db } from "@/db";
import { landingSlides, landingFeatures } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getLandingSlides() {
  return db
    .select()
    .from(landingSlides)
    .where(eq(landingSlides.isActive, true))
    .orderBy(asc(landingSlides.sortOrder));
}

export async function getLandingFeatures() {
  return db
    .select()
    .from(landingFeatures)
    .where(eq(landingFeatures.isActive, true))
    .orderBy(asc(landingFeatures.sortOrder));
}
