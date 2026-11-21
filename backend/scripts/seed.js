import { getRepository } from "../src/db/index.js";
import { env } from "../src/config/env.js";

const repo = await getRepository();

console.log(`[seed] storage ready (mode: ${repo.mode})`);
console.log(`[seed] admin email: ${env.admin.email}`);

process.exit(0);
