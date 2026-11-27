import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getSessionUser } from "../services/sessionService.js";

const router = Router();
const allowedStartTimes = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"] as const;
const daySchema = z.object({ dayOfWeek: z.number().int().min(0).max(6), availableTimes: z.array(z.enum(allowedStartTimes)).max(11) })
  .refine((day) => new Set(day.availableTimes).size === day.availableTimes.length);
const scheduleSchema = z.object({ availability: z.array(daySchema).length(7) })
  .refine((schedule) => new Set(schedule.availability.map((day) => day.dayOfWeek)).size === 7);

async function approvedProfessional(req: Request) {
  const user = await getSessionUser(req);
  if (!user || user.role !== "PROFESSIONAL") return null;
  const application = await prisma.professionalApplication.findUnique({ where: { userId: user.id }, select: { status: true } });
  return application?.status === "APPROVED" ? user : null;
}

router.get("/api/professional/availability", async (req, res) => {
  try {
    const user = await approvedProfessional(req);
    if (!user) return res.status(401).json({ error: "Sign in with your approved professional account." });
    return res.json(await prisma.professionalAvailability.findMany({ where: { professionalId: user.id }, orderBy: { dayOfWeek: "asc" }, select: { dayOfWeek: true, availableTimes: true } }));
  } catch (error) {
    console.error("Failed to load professional availability", error);
    return res.status(500).json({ error: "We couldn't load your availability." });
  }
});

router.put("/api/professional/availability", async (req, res) => {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Set valid hourly start times for all seven days." });
  try {
    const user = await approvedProfessional(req);
    if (!user) return res.status(401).json({ error: "Sign in with your approved professional account." });
    const availability = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
      await transaction.professionalAvailability.deleteMany({ where: { professionalId: user.id } });
      await transaction.professionalAvailability.createMany({ data: parsed.data.availability.map((day) => ({ ...day, professionalId: user.id })) });
      return transaction.professionalAvailability.findMany({ where: { professionalId: user.id }, orderBy: { dayOfWeek: "asc" }, select: { dayOfWeek: true, availableTimes: true } });
    });
    return res.json(availability);
  } catch (error) {
    console.error("Failed to save professional availability", error);
    return res.status(500).json({ error: "We couldn't save your availability." });
  }
});

export default router;
