import { ForbiddenError } from "@shared/_core/errors";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import type { GetUserInfoWithJwtResponse } from "./types/manusTypes";

// The platform scheduler has a separate machine identity. This module exists
// exclusively for `/api/scheduled/*` handlers; normal Job Sarthi users are
// authenticated by `server/auth.ts` and database-backed opaque sessions.
const SCHEDULER_COOKIE_NAME = "app_session_id";
const CRON_OPEN_ID_PREFIX = "cron_";
const GET_USER_INFO_WITH_JWT_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt";

export type AuthenticatedUser = User & { taskUid?: string; isCron?: boolean };

class SchedulerAuth {
  private client = axios.create({ baseURL: ENV.oAuthServerUrl, timeout: 10_000 });

  private async verifySchedulerJwt(token: string) {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const openId = payload.openId;
    if (typeof openId !== "string" || !openId.startsWith(CRON_OPEN_ID_PREFIX)) throw ForbiddenError("Cron-only scheduler identity required");
    return openId;
  }

  private async getSchedulerInfo(token: string) {
    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(GET_USER_INFO_WITH_JWT_PATH, { jwtToken: token, projectId: ENV.appId });
    return data;
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const token = cookies[SCHEDULER_COOKIE_NAME] || (typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "");
    if (!token) throw ForbiddenError("Missing scheduler identity");
    await this.verifySchedulerJwt(token);
    const info = await this.getSchedulerInfo(token);
    if (!info.taskUid) throw ForbiddenError("Cron scheduler task UID missing");
    const now = new Date();
    return {
      id: -1,
      openId: info.openId,
      name: info.name || "Job Sarthi scheduler",
      email: null,
      passwordHash: null,
      authStatus: "active",
      emailVerified: false,
      termsAcceptedAt: null,
      passwordChangedAt: null,
      loginMethod: "scheduler",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
      taskUid: info.taskUid,
      isCron: true,
    };
  }
}

export const sdk = new SchedulerAuth();
