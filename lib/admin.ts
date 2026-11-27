import { createHmac, createHash, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "afterframe_admin";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.AFTERFRAME_SESSION_SECRET;
  if (!value || value.length < 32) return null;
  return value;
}

function signature(expires: string, key: string) {
  return createHmac("sha256", key).update(expires).digest("hex");
}

export function adminIsConfigured() {
  return Boolean(process.env.AFTERFRAME_ADMIN_PASSWORD_HASH && secret());
}

export function createAdminSession() {
  const key = secret();
  if (!key) throw new Error("AFTERFRAME_SESSION_SECRET must be set to at least 32 characters.");
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return { value: expires + "." + signature(expires, key), maxAge: SESSION_SECONDS };
}

export function verifyAdminSession(request: NextRequest) {
  const key = secret();
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!key || !token) return false;
  const [expires, supplied, extra] = token.split(".");
  if (!expires || !supplied || extra || !/^\\d+$/.test(expires)) return false;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(expires, key);
  const a = Buffer.from(createHash("sha256").update(supplied).digest());
  const b = Buffer.from(createHash("sha256").update(expected).digest());
  return timingSafeEqual(a, b);
}

export function verifyAdminPassword(input: unknown) {
  const configured = process.env.AFTERFRAME_ADMIN_PASSWORD_HASH;
  if (typeof input !== "string" || !configured) return false;
  const [algorithm, salt, expectedHex, extra] = configured.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex || extra) return false;
  try {
    const actual = scryptSync(input, Buffer.from(salt, "base64url"), 32, { N: 2 ** 14, r: 8, p: 1 });
    const expected = Buffer.from(expectedHex, "base64url");
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
