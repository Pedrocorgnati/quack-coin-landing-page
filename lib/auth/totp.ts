// lib/auth/totp.ts — TOTP secret encryption/decryption helpers.
// The TOTP secret is encrypted with AES-256-GCM before storing in the DB.
// NEXTAUTH_SECRET (32+ byte random string) is used as the encryption key.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";

/** Derive a 32-byte key from NEXTAUTH_SECRET using SHA-256. */
function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a TOTP secret. Returns base64 `iv:authTag:ciphertext`. */
export function encryptTotpSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

/** Decrypt a TOTP secret previously encrypted with encryptTotpSecret(). */
export function decryptTotpSecret(encrypted: string): string {
  const [ivB64, authTagB64, dataB64] = encrypted.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) throw new Error("Invalid encrypted format");
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}
