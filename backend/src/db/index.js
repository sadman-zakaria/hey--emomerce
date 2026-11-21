import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { connectMongo } from "./connect.js";
import { createMemoryRepository } from "./memory-repository.js";
import { createMongoRepository } from "./mongo-repository.js";
import {
  seedBanners,
  seedCategories,
  seedOrders,
  seedProducts,
  seedUsers,
} from "../seed/seed-data.js";
import { today } from "../utils/date.js";

let repositoryPromise;

const SEED_MARKER = "seed:initial";

async function seed(repo) {
  if (!env.seedOnStart) return;
  if ((await repo.getMeta(SEED_MARKER)) === "done") return;

  if ((await repo.countProducts()) === 0) {
    for (const product of seedProducts) await repo.createProduct(product);
    console.log(`[seed] inserted ${seedProducts.length} products`);
  }

  if ((await repo.listCategories()).length === 0) {
    for (const category of seedCategories) await repo.createCategory(category);
    console.log(`[seed] inserted ${seedCategories.length} categories`);
  }

  if ((await repo.listBanners()).length === 0) {
    for (const banner of seedBanners) await repo.createBanner(banner);
    console.log(`[seed] inserted ${seedBanners.length} banners`);
  }

  if ((await repo.countOrders()) === 0) {
    for (const order of seedOrders) await repo.createOrderRecord(order);
    await repo.ensureOrderCounter(1005);
    console.log(`[seed] inserted ${seedOrders.length} orders`);
  }

  if ((await repo.countUsers()) === 0) {
    for (const user of seedUsers) await repo.createUser(user);
    console.log(`[seed] inserted ${seedUsers.length} customers`);
  }

  const admin = await repo.findUserForAuth(env.admin.email);
  if (!admin) {
    const passwordHash = await bcrypt.hash(env.admin.password, 10);
    await repo.createUser({
      id: "admin",
      name: env.admin.name,
      email: env.admin.email,
      role: "admin",
      status: "active",
      orderCount: 0,
      totalSpent: 0,
      createdAt: today(),
      lastLogin: today(),
      passwordHash,
    });
    console.log(`[seed] created admin account ${env.admin.email}`);
  } else if (!admin.passwordHash) {
    const passwordHash = await bcrypt.hash(env.admin.password, 10);
    await repo.updateUser(admin.id, { passwordHash });
    console.log(`[seed] set password for admin account ${env.admin.email}`);
  }

  // Mark the demo seed as complete so deleting demo products does not bring
  // them back on the next serverless cold start.
  await repo.setMeta(SEED_MARKER, "done");
}

async function init() {
  let repo;

  if (env.mongodbUri) {
    await connectMongo(env.mongodbUri);
    repo = createMongoRepository();
  } else {
    console.warn(
      "[db] MONGODB_URI is not set — using the in-memory demo store. Changes will be lost on restart.",
    );
    repo = createMemoryRepository();
  }

  await seed(repo);
  return repo;
}

export function getRepository() {
  if (!repositoryPromise) {
    repositoryPromise = init().catch((error) => {
      repositoryPromise = undefined;
      throw error;
    });
  }
  return repositoryPromise;
}
