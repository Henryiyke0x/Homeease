import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getSessionUser } from "../services/sessionService.js";
import { routeId } from "../utils/routeId.js";

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

    const assignment = await prisma.assignment.findUnique({
      where: { bookingId: routeId(req) },
      include: { booking: { select: { status: true } } },
    });
    if (!assignment || assignment.professionalId !== user.id) return res.status(404).json({ error: "Assigned job not found." });
    const expectedStatus = parsed.data.status === "IN_PROGRESS" ? "ASSIGNED" : "IN_PROGRESS";
    if (assignment.booking.status !== expectedStatus) return res.status(409).json({ error: "This job cannot move to that status yet." });

    const updated = await prisma.booking.updateMany({ where: { id: routeId(req), status: expectedStatus }, data: { status: parsed.data.status } });
    if (updated.count === 0) return res.status(409).json({ error: "This job changed while you were updating it. Refresh and try again." });
    return res.json({ id: routeId(req), status: parsed.data.status });
  } catch (error) {
    console.error("Failed to update professional job", error);
    return res.status(500).json({ error: "We couldn't update this job." });
  }
});

export default router;

