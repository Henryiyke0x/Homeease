import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminKey } from "../middleware/adminAuth.js";
import { hashPassword } from "../services/sessionService.js";
import { routeId } from "../utils/routeId.js";

const router = Router();

const professionalApplicationSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(30),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  services: z.array(z.string().trim().min(2).max(80)).min(1).max(10),
  yearsExperience: z.number().int().min(0).max(60),
  about: z.string().trim().min(20).max(2000),
  password: z.string().min(10).max(128),
}).refine((application) => new Set(application.services).size === application.services.length, {
  message: "Choose each service only once.",
});

router.post("/api/professional-applications", async (req, res) => {
  const parsed = professionalApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please check your application details and try again." });
  }

  try {
    const availableServices = await prisma.service.findMany({
      where: { name: { in: parsed.data.services }, isActive: true },
      select: { name: true },
    });
    if (availableServices.length !== parsed.data.services.length) {
      return res.status(400).json({ error: "Choose only services currently offered by HomeEase." });
    }
    const { password, ...applicationData } = parsed.data;
    const passwordHash = await hashPassword(password);
    const application = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: applicationData.email,
          firstName: applicationData.firstName,
          lastName: applicationData.lastName,
          phone: applicationData.phone,
          passwordHash,
          role: "PROFESSIONAL",
        },
        select: { id: true },
      });
      return transaction.professionalApplication.create({
        data: { ...applicationData, userId: user.id },
        select: { id: true, status: true, createdAt: true },
      });
    });
    return res.status(201).json(application);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "An account or application with this email already exists." });
    }
    console.error("Failed to create professional application", error);
    return res.status(500).json({ error: "We couldn't save your application. Please try again." });
  }
});

router.get("/api/admin/professional-applications", requireAdminKey, async (_req, res) => {
  try {
    const applications = await prisma.professionalApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json(applications);
  } catch (error) {
    console.error("Failed to load professional applications", error);
    return res.status(500).json({ error: "We couldn't load the professional applications." });
  }
});

router.patch("/api/admin/professional-applications/:id", requireAdminKey, async (req, res) => {
  const parsed = z.object({
    status: z.enum(["PENDING", "REVIEWING", "APPROVED", "DECLINED"]),
  }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Choose a valid application status." });
  }

  try {
    const updated = await prisma.professionalApplication.update({
      where: { id: routeId(req) },
      data: { status: parsed.data.status },
    });
    return res.json(updated);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Professional application not found." });
    }
    console.error("Failed to update professional application", error);
    return res.status(500).json({ error: "We couldn't update the professional application." });
  }
});

export default router;

