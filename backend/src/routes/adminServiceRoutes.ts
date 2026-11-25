import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminKey } from "../middleware/adminAuth.js";
import { routeId } from "../utils/routeId.js";

const router = Router();

function serviceSlug(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  basePrice: z.number().finite().positive().multipleOf(0.01).max(100_000_000),
});

router.get("/api/admin/services", requireAdminKey, async (_req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return res.json(services);
  } catch (error) {
    console.error("Failed to load admin service catalog", error);
    return res.status(500).json({ error: "We couldn't load the service catalog." });
  }
});

router.post("/api/admin/services", requireAdminKey, async (req, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the service name, description and price." });

  try {
    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        slug: serviceSlug(parsed.data.name),
      },
    });
    return res.status(201).json(service);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "A service with this name already exists." });
    }
    console.error("Failed to create service", error);
    return res.status(500).json({ error: "We couldn't save this service." });
  }
});

router.patch("/api/admin/services/:id", requireAdminKey, async (req, res) => {
  const parsed = serviceSchema.extend({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the service name, description, price and availability." });

  try {
    const service = await prisma.service.update({
      where: { id: routeId(req) },
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        slug: serviceSlug(parsed.data.name),
      },
    });
    return res.json(service);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Service not found." });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "A service with this name already exists." });
    }
    console.error("Failed to update service", error);
    return res.status(500).json({ error: "We couldn't update this service." });
  }
});

router.get("/api/admin/services", requireAdminKey, async (_req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return res.json(services);
  } catch (error) {
    console.error("Failed to load admin service catalog", error);
    return res.status(500).json({ error: "We couldn't load the service catalog." });
  }
});

router.post("/api/admin/services", requireAdminKey, async (req, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the service name, description and price." });

  try {
    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        slug: serviceSlug(parsed.data.name),
      },
    });
    return res.status(201).json(service);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "A service with this name already exists." });
    }
    console.error("Failed to create service", error);
    return res.status(500).json({ error: "We couldn't save this service." });
  }
});

router.patch("/api/admin/services/:id", requireAdminKey, async (req, res) => {
  const parsed = serviceSchema.extend({ isActive: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the service name, description, price and availability." });

  try {
    const service = await prisma.service.update({
      where: { id: routeId(req) },
      data: {
        ...parsed.data,
        description: parsed.data.description || null,
        slug: serviceSlug(parsed.data.name),
      },
    });
    return res.json(service);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return res.status(404).json({ error: "Service not found." });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return res.status(409).json({ error: "A service with this name already exists." });
    }
    console.error("Failed to update service", error);
    return res.status(500).json({ error: "We couldn't update this service." });
  }
});

export default router;

