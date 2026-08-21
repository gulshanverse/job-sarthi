import type { Request, Response } from "express";
import { requireSchedulerAuth } from "./schedulerAuth";
import { runWeeklyDigestBatch } from "./weeklyDigestService";

export async function scheduledWeeklyDigest(req: Request, res: Response) {
  try {
    if (!requireSchedulerAuth(req, res)) return;
    return res.json({ ok: true, ...(await runWeeklyDigestBatch()) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "weekly digest failed", timestamp: new Date().toISOString() });
  }
}
