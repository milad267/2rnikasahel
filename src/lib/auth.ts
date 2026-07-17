import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { eq } from "drizzle-orm";

export const USER_TOKEN_COOKIE = "dornika_user_token";

/**
 * AUTH_SECRET — اجباری در Production، مستقل و تصادفی
 * ❌ هرگز از DATABASE_URL ساخته نمی‌شود.
 */
const SECRET_SALT = (() => {
  const val = process.env.AUTH_SECRET;
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: AUTH_SECRET environment variable is required in production. " +
        "Generate one with: openssl rand -base64 48\n" +
        "Then set AUTH_SECRET in your .env file."
      );
    }
    // Development only: generate a random secret per process start
    console.warn(
      "[auth] WARNING: AUTH_SECRET not set. Using random development-only secret. " +
      "Do NOT use in production! Set AUTH_SECRET in .env."
    );
    return `dev-${crypto.randomBytes(32).toString("base64url")}`;
  }
  return val;
})();

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 210_000;

/** رمزنگاری امن پسورد با PBKDF2 بومی Node.js */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, "sha512").toString("hex");
  return `v2:${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

/** احراز صحت پسورد */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  const isV2 = parts[0] === "v2";
  const iterations = isV2 ? Number(parts[1]) : 10_000;
  const salt = isV2 ? parts[2] : parts[0];
  const hash = isV2 ? parts[3] : parts[1];
  if (!salt || !hash) return false;
  if (!Number.isSafeInteger(iterations) || iterations < 10_000 || iterations > 1_000_000) return false;
  const verifyHash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  const stored = Buffer.from(hash, "hex");
  const verified = Buffer.from(verifyHash, "hex");
  return stored.length === verified.length && crypto.timingSafeEqual(stored, verified);
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
  const signature = Buffer.from(sig);
  const expected = Buffer.from(expectedSig);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(base64, "base64url").toString());
    if (!payload.ts || Date.now() - Number(payload.ts) > SESSION_MAX_AGE_MS) return null;
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

/** خواندن ادمین فعلی لاگین‌شده */
export async function getCurrentAdminUser(): Promise<any | null> {
  try {
    const store = await cookies();
    const token = store.get("admin_session")?.value || store.get(USER_TOKEN_COOKIE)?.value;
    if (!token) return null;
    
    // بررسی در جدول admin_users
    const { adminUsers, adminSessions } = await import("@/db/schema");
    const [session] = await db
      .select({
        userId: adminSessions.userId,
        user: adminUsers,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
      .where(eq(adminSessions.token, token))
      .limit(1);
    
    if (!session || !session.user || !session.user.isActive) return null;
    return session.user;
  } catch { return null; }
}
