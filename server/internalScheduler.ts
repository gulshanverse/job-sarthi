import type { Request, Response } from "express";
import { requireSchedulerAuth } from "./schedulerAuth";

/** Lightweight credential check for independently configured scheduler callers. */
export function schedulerHealth(req: Request, res: Response) {
  if (!requireSchedulerAuth(req, res)) return;
  return res.json({
    ok: true,
    authentication: "job-sarthi-machine-secret",
    execution: "external-scheduler-required",
    jobs: ["weekly-digest", "interview-reminders"],
  });
}
