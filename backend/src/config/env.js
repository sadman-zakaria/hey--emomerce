import "dotenv/config";

function bool(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function int(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const configuredCorsOrigins = (
  process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000,http://localhost:8080"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const frontendUrl = process.env.FRONTEND_URL?.trim();
if (frontendUrl) configuredCorsOrigins.push(frontendUrl);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  port: int(process.env.PORT, 4000),
  mongodbUri: process.env.MONGODB_URI?.trim() ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "maison-development-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  admin: {
    name: process.env.ADMIN_NAME ?? "Tanjina Irin",
    email: (process.env.ADMIN_EMAIL ?? "tanjinairin62@gmail.com").toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? "tanjina1234",
  },
  frontendUrl: frontendUrl ?? "",
  corsOrigins: [...new Set(configuredCorsOrigins)],
  seedOnStart: bool(process.env.SEED_ON_START, true),
};

if (env.isProduction && env.jwtSecret === "maison-development-secret-change-me") {
  console.warn(
    "[config] JWT_SECRET is using the development default. Set a strong JWT_SECRET in production.",
  );
}

if (env.isProduction && !env.mongodbUri) {
  console.warn(
    "[config] MONGODB_URI is not set. The API will use in-memory storage, which is NOT persistent on serverless hosts.",
  );
}
