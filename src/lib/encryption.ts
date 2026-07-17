import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:";

/**
 * رمزنگاری یک متن با AES-256-GCM
 * از کلید ذخیره شده در ENCRYPTION_KEY استفاده می‌کند
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${encrypted}:${authTag.toString("base64")}`;
}

/**
 * رمزگشایی یک متن رمزنگاری شده با AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error("متن رمزنگاری شده معتبر نیست.");
  }
  const key = getEncryptionKey();
  const payload = encryptedText.slice(ENCRYPTED_PREFIX.length);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("فرمت متن رمزنگاری شده معتبر نیست.");
  }
  const [ivBase64, encrypted, authTagBase64] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * بررسی می‌کند که آیا یک متن رمزنگاری شده است یا خیر
 */
export function isEncrypted(text: string): boolean {
  return text.startsWith(ENCRYPTED_PREFIX);
}

/**
 * دریافت کلید رمزنگاری از متغیر محیطی
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.ENCRYPTION_KEY;
  if (!keyString) {
    // در حالت توسعه، یک کلید پیش‌فرض برای تست
    if (process.env.NODE_ENV === "development") {
      return crypto.scryptSync("dornika-dev-key-2026", "salt", 32);
    }
    throw new Error(
      "متغیر محیطی ENCRYPTION_KEY تنظیم نشده است. " +
      "برای تولید کلید از دستور زیر استفاده کنید:\n" +
      "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  // کلید می‌تواند هگز (64 کاراکتر) یا base64 باشد
  if (keyString.length === 64 && /^[0-9a-fA-F]+$/.test(keyString)) {
    return Buffer.from(keyString, "hex");
  }
  return crypto.scryptSync(keyString, "salt", 32);
}
