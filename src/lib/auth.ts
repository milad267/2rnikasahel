import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";

export const USER_TOKEN_COOKIE = "dornika_user_token";
const SECRET_SALT = process.env.DATABASE_URL || "dornika-secure-luxe-secret-2026";

/** رمزنگاری امن پسورد با PBKDF2 بومی Node.js */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/** احراز صحت پسورد */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verifyHash, "hex"));
}

/** تولید توکن نشست (signed token) */
export function createAuthToken(userId: number, phone: string, role: string): string {
  const payload = JSON.stringify({ userId, phone, role, ts: Date.now() });
  const base64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET_SALT).update(base64).digest("base64url");
  return `${base64}.${sig}`;
}

/** اعتبارسنجی توکن نشست */
export function verifyAuthToken(token?: string | null): { userId: number; phone: string; role: string } | null {
  if (!token) return null;
  const [base64, sig] = token.split(".");
  if (!base64 || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", SECRET_SALT).update(base64).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  try {
    const payload = JSON.parse(Buffer.from(base64, "base64url").toString());
    return payload;
  } catch {
    return null;
  }
}

/** خواندن کاربر فعلی لاگین‌شده در Server Components یا API */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const store = await cookies();
    const token = store.get(USER_TOKEN_COOKIE)?.value;
    const payload = verifyAuthToken(token);
    if (!payload?.userId) return null;
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user || !user.isActive) return null;
    return user;
  } catch { return null; }
}
