import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { createCustomerSession, getSessionUser, hashPassword, hashToken, readSessionToken, verifyPassword } from "../services/sessionService.js";

const router = Router();

const customerRegistrationSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(30).optional().or(z.literal("")),
  password: z.string().min(10).max(128),
});
const customerLoginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

router.post("/api/auth/register", async (req, res) => {
  const parsed = customerRegistrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please check your account details and use a password of at least 10 characters." });

  try {
    const user = await prisma.user.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        passwordHash: await hashPassword(parsed.data.password),
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true },
    });
    await createCustomerSession(user.id, res);
    return res.status(201).json({ user });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    console.error("Failed to register customer", error);
    return res.status(500).json({ error: "We couldn't create your account. Please try again." });
  }
});

router.post("/api/auth/login", async (req, res) => {
  const parsed = customerLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.role === "ADMIN" || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (user.role === "PROFESSIONAL") {
      const application = await prisma.professionalApplication.findUnique({ where: { userId: user.id }, select: { status: true } });
      if (application?.status !== "APPROVED") {
        return res.status(403).json({ error: "Your professional application must be approved before you can sign in." });
      }
    }
    await createCustomerSession(user.id, res);
    return res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role } });
  } catch (error) {
    console.error("Failed to sign in customer", error);
    return res.status(500).json({ error: "We couldn't sign you in. Please try again." });
  }
});

router.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "CUSTOMER") return res.status(401).json({ error: "Sign in to view your account." });
    return res.json({ user });
  } catch (error) {
    console.error("Failed to load customer session", error);
    return res.status(500).json({ error: "We couldn't load your account." });
  }
});
router.post("/api/auth/logout", async (req, res) => {
  try {
    const token = readSessionToken(req);
    if (token) await prisma.customerSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    res.clearCookie("homeease_session", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to sign out customer", error);
    return res.status(500).json({ error: "We couldn't sign you out. Please try again." });
  }
});

export default router;

