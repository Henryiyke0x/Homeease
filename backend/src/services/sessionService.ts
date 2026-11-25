import type { Request, Response } from "express";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { prisma } from "../lib/prisma.js";

export function readSessionToken(req: Request) {
  const sessionCookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("homeease_session="));
  return sessionCookie ? decodeURIComponent(sessionCookie.slice("homeease_session=".length)) : null;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function derivePassword(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(key as Buffer));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derivePassword(password, salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await derivePassword(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createCustomerSession(userId: string, res: Response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.customerSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  res.cookie("homeease_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUser(req: Request) {
  const token = readSessionToken(req);
  if (!token) return null;
  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true } } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.customerSession.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}



