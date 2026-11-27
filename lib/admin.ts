import { createHmac, createHash, timingSafeEqual } from "node:crypto";
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
  return Boolean(process.env.AFTERFRAME_ADMIN_PASSWORD && secret());
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
  if (!expires || !supplied || extra || !/^\d+$/.test(expires)) return false;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(expires, key);
  const a = Buffer.from(createHash("sha256").update(supplied).digest());
  const b = Buffer.from(createHash("sha256").update(expected).digest());
  return timingSafeEqual(a, b);
}

export function verifyAdminPassword(input: unknown) {
  const configured = process.env.AFTERFRAME_ADMIN_PASSWORD;
  if (typeof input !== "string" || !configured) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(configured).digest();
  return timingSafeEqual(a, b);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
