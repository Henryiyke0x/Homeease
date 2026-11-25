import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

export function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey) {
    return res.status(503).json({ error: "Admin access is not configured." });
  }

  const provided = Buffer.from(req.get("x-admin-key") ?? "");
  const expected = Buffer.from(expectedKey);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: "Enter a valid admin key." });
  }

  next();
}


