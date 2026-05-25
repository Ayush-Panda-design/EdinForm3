import type { Request, Response } from "express";
import { authService } from "@repo/services/auth";
import type { AuthUser } from "@repo/types/auth";

export interface CreateContextOptions {
  req: Request;
  res: Response;
}

export async function createContext({ req, res }: CreateContextOptions) {
  let user: AuthUser | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      user = await authService.validateToken(token);
    } catch {
      // Invalid token — leave user as null
    }
  }

  return {
    req,
    res,
    user,
    requireAuth(): AuthUser {
      if (!user) throw new Error("UNAUTHORIZED");
      return user;
    },
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
