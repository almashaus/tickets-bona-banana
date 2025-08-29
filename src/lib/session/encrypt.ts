// lib/crypto.ts
import {
  EncryptJWT,
  jwtDecrypt,
  createLocalJWKSet,
  importJWK,
  JWK,
  JWTPayload,
} from "jose";
import crypto from "crypto";

const RAW = process.env.SESSION_ENC_KEY ?? "";
if (!RAW) throw new Error("SESSION_ENC_KEY missing");

const KEY_BYTES = Buffer.from(
  RAW,
  /[^A-Za-z0-9\-_]/.test(RAW) ? "base64" : "base64url"
);

let cachedKey: CryptoKey | null = null;
async function getKey() {
  if (cachedKey) return cachedKey;
  cachedKey = await crypto.subtle.importKey(
    "raw",
    KEY_BYTES,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

// Encrypt payload → compact JWE
export async function encryptPayload(
  payload: JWTPayload,
  expiresInSeconds: number
) {
  const key = await getKey();
  const now = Math.floor(Date.now() / 1000);

  return await new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(now + expiresInSeconds)
    .encrypt(key);
}

// Decrypt compact JWE → payload
export async function decryptPayload(token: string) {
  const key = await getKey();
  const { payload } = await jwtDecrypt(token, key, {
    clockTolerance: 5, // seconds
  });
  return payload;
}
