import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function readToken(req) {
  const header = req.headers.authorization ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

export async function requireAuth(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) throw new HttpError(401, "Authentication required");

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new HttpError(401, "Session expired or invalid. Please sign in again.");
    }

    const user = await req.repo.getUserById(payload.sub);
    if (!user) throw new HttpError(401, "Account no longer exists");
    if (user.status !== "active") throw new HttpError(403, "Account is disabled");

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, (error) => {
    if (error) return next(error);
    if (req.user?.role !== "admin") {
      return next(new HttpError(403, "Admin access required"));
    }
    next();
  });
}
