import { getRepository } from "../src/db/index.js";

console.log("before repo");
const repo = await getRepository();
console.log("repo ready", repo.mode, (await repo.countProducts()), "products");
process.exit(0);
