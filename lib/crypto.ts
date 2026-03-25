/**
 * AES-256-GCM encryption for user API keys stored in the database.
 *
 * Key material comes from ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 * Each row gets its own random IV + auth tag for tamper detection.
 */

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGO = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): { cipher: string; iv: string; tag: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const enc = createCipheriv(ALGO, key, iv);

  let ciphertext = enc.update(plaintext, "utf8", "hex");
  ciphertext += enc.final("hex");
  const tag = enc.getAuthTag();

  return {
    cipher: ciphertext,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decrypt(data: { cipher: string; iv: string; tag: string }): string {
  const key = getEncryptionKey();
  const dec = createDecipheriv(ALGO, key, Buffer.from(data.iv, "hex"));
  dec.setAuthTag(Buffer.from(data.tag, "hex"));

  let plaintext = dec.update(data.cipher, "hex", "utf8");
  plaintext += dec.final("utf8");
  return plaintext;
}
