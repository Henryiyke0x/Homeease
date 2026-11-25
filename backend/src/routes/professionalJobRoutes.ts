import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getSessionUser } from "../services/sessionService.js";
import { routeId } from "../utils/routeId.js";
import { BookingLifecycleError, updateProfessionalJobStatus } from "../services/bookingLifecycleService.js";

const router = Router();

router.get("/api/professional/jobs", async (req, res) => {
  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "PROFESSIONAL") return res.status(401).json({ error: "Sign in with your professional account." });
    const application = await prisma.professionalApplication.findUnique({ where: { userId: user.id }, select: { status: true } });
    if (application?.status !== "APPROVED") return res.status(403).json({ error: "Your professional account is not active." });

    const jobs = await prisma.assignment.findMany({
      where: { professionalId: user.id },
      orderBy: { assignedAt: "desc" },
      include: { booking: { include: { service: { select: { name: true } } } } },
    });
    return res.json(jobs);
  } catch (error) {
    console.error("Failed to load professional jobs", error);
    return res.status(500).json({ error: "We couldn't load your jobs." });
  }
});

router.patch("/api/professional/jobs/:id/status", async (req, res) => {
  const parsed = z.object({ status: z.enum(["IN_PROGRESS", "COMPLETED"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a valid job status." });

  try {
    const user = await getSessionUser(req);
    if (!user || user.role !== "PROFESSIONAL") return res.status(401).json({ error: "Sign in with your professional account." });
    const application = await prisma.professionalApplication.findUnique({ where: { userId: user.id }, select: { status: true } });
    if (application?.status !== "APPROVED") return res.status(403).json({ error: "Your professional account is not active." });

    return res.json(await updateProfessionalJobStatus(routeId(req), user.id, parsed.data.status));
  } catch (error) {
    if (error instanceof BookingLifecycleError) return res.status(error.statusCode).json({ error: error.message });
    console.error("Failed to update professional job", error);
    return res.status(500).json({ error: "We couldn't update this job." });
  }
});

export default router;

