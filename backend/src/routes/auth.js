import express from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { publicUser } from "../db/serialize.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { HttpError } from "../utils/http-error.js";
import { today } from "../utils/date.js";
import { loginSchema, registerSchema } from "../validation/schemas.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many accounts created from this address. Please try again later." },
});

async function authenticate(repo, email, password) {
  const user = await repo.findUserForAuth(email);
  if (!user || !user.passwordHash) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Invalid email or password.");
  }

  if (user.status !== "active") {
    throw new HttpError(403, "This account has been disabled.");
  }

  await repo.updateUser(user.id, { lastLogin: today() });
  return user;
}

export function authRouter() {
  const router = express.Router();

  router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authenticate(req.repo, email, password);
    res.json({ token: signToken(user), user: publicUser(user) });
  });

  router.post("/admin/login", loginLimiter, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await authenticate(req.repo, email, password);
    if (user.role !== "admin") {
      throw new HttpError(403, "This account does not have admin access.");
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  });

  router.post("/register", registerLimiter, async (req, res) => {
    const input = registerSchema.parse(req.body);
    const existing = await req.repo.findUserForAuth(input.email);
    if (existing) {
      throw new HttpError(409, "An account with that email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await req.repo.createUser({
      name: input.name,
      email: input.email,
      role: "customer",
      status: "active",
      orderCount: 0,
      totalSpent: 0,
      createdAt: today(),
      lastLogin: today(),
      passwordHash,
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.post("/logout", (req, res) => {
    res.json({ ok: true });
  });

  router.get("/config", (req, res) => {
    res.json({ mode: req.repo.mode });
  });

  return router;
}
