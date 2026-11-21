import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { updateProfileSchema } from "../validation/schemas.js";
import { publicUser } from "../db/serialize.js";

export function accountRouter() {
  const router = express.Router();

  router.use(requireAuth);

  router.get("/orders", async (req, res) => {
    const orders = await req.repo.listOrdersForEmail(req.user.email);
    res.json({ items: orders, total: orders.length });
  });

  router.patch("/profile", async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    const user = await req.repo.updateUser(req.user.id, input);
    res.json({ user: publicUser(user) });
  });

  return router;
}
