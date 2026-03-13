import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";

const TOKEN_COOKIE = "if_token";
const ROLE_COOKIE = "if_role";
const NAME_COOKIE = "if_name";
const EMAIL_COOKIE = "if_email";
const PHONE_COOKIE = "if_phone";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET or NEXTAUTH_SECRET.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAuthToken(user: SessionUser) {
  return await new SignJWT({ role: user.role, name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id < 1) return null;
  return {
    id,
    name: String(payload.name ?? ""),
    email: String(payload.email ?? ""),
    role: String(payload.role ?? "customer"),
  } satisfies SessionUser;
}

function tokenFromRequest(request: NextRequest) {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return request.cookies.get(TOKEN_COOKIE)?.value ?? null;
}

export async function getSessionUser(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return null;

  try {
    const payload = await verifyAuthToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) return null;
    return user satisfies SessionUser;
  } catch {
    return null;
  }
}

export function applyAuthCookies(response: NextResponse, token: string, user: SessionUser) {
  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    sameSite: "lax" as const,
    secure,
  };

  response.cookies.set(TOKEN_COOKIE, token, cookieOptions);
  response.cookies.set(ROLE_COOKIE, user.role, cookieOptions);
  response.cookies.set(NAME_COOKIE, user.name, cookieOptions);
  response.cookies.set(EMAIL_COOKIE, user.email, cookieOptions);
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of [TOKEN_COOKIE, ROLE_COOKIE, NAME_COOKIE, EMAIL_COOKIE, PHONE_COOKIE]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

export async function getBrowserToken() {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}