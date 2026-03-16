/**
 * AES-256-GCM 暗号化サービス（Node.js crypto モジュール使用）
 * 口座認証情報の暗号化・復号化
 * server-only: クライアントバンドルに含めてはいけない
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // GCMのnonce推奨値
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * 暗号化: Buffer を返す
 * フォーマット: [12バイトIV][16バイトAuthTag][暗号文]
 */
export function encrypt(plaintext: string): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * 復号化
 */
export function decrypt(data: Buffer): string {
  const key = getKey();
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

/** JSONオブジェクトを暗号化してBase64文字列で返す */
export function encryptJson(data: unknown): string {
  return encrypt(JSON.stringify(data)).toString("base64");
}

/** Base64文字列を復号化してJSONとしてパース */
export function decryptJson<T>(b64: string): T {
  return JSON.parse(decrypt(Buffer.from(b64, "base64"))) as T;
}
