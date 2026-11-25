import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/api/health", (_req, res) => res.json({ status: "ok", service: "homeease-api" }));

router.get("/api/services", async (_req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, description: true, basePrice: true },
    });
    return res.json(services);
  } catch (error) {
    console.error("Failed to load service catalog", error);
    return res.status(500).json({ error: "We couldn't load the available services." });
  }
});

export default router;

