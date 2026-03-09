import type { Request, Response, NextFunction } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "認証が必要です" });
  }
  next();
};

export function isAuthorized(req: any): boolean {
  const token = req.headers.authorization?.replace("Bearer ", "");
  return token === process.env.QA_AGENT_TOKEN || token === process.env.SUPABASE_SERVICE_ROLE_KEY || !!req.session?.userId;
}
