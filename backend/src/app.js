import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { getRepository } from "./db/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requireAdmin } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { accountRouter } from "./routes/account.js";
import { storefrontRouter } from "./routes/storefront.js";
import { adminRouter } from "./routes/admin.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          env.corsOrigins.includes("*") ||
          env.corsOrigins.includes(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ extended: false, limit: "8mb" }));

  // Resolve (and lazily initialise) the repository for every request.
  app.use(async (req, res, next) => {
    try {
      req.repo = await getRepository();
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get("/", (req, res) => {
    res.json({
      name: "Maison API",
      version: "1.0.0",
      status: "ok",
      mode: req.repo.mode,
      docs: "See backend/README.md for the full endpoint reference.",
      endpoints: {
        health: "/api/health",
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        account: "GET /api/account/orders",
        storefront: "/api/products, /api/categories, /api/banners, /api/bootstrap",
        checkout: "POST /api/orders",
        admin: "/api/admin/*",
      },
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      service: "maison-api",
      mode: req.repo.mode,
      storage: req.repo.mode === "mongo" ? "mongodb" : "memory",
      time: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authRouter());
  app.use("/api/account", accountRouter());
  app.use("/api/admin", requireAdmin, adminRouter());
  app.use("/api", storefrontRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;
