import { NextRequest } from "next/server";

export function getPublicOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    const url = new URL(configured);
    return url.origin;
  }
  const origin = new URL(req.url).origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_SITE_URL با آدرس HTTPS در production الزامی است.");
  }
  return origin;
}

