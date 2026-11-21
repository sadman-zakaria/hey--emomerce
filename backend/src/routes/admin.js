import express from "express";
import bcrypt from "bcryptjs";
import { HttpError } from "../utils/http-error.js";
import { slugify } from "../utils/slug.js";
import { parseNumber, parseString } from "../utils/query.js";
import {
  bannerCreateSchema,
  bannerUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  mediaCreateSchema,
  orderStatusSchema,
  productCreateSchema,
  productUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "../validation/schemas.js";
import { setOrderStatus } from "../services/orders.js";
import { publicUser } from "../db/serialize.js";

async function assertUniqueSlug(repo, table, slug, excludeId) {
  let existing = null;
  if (table === "products") existing = await repo.getProductBySlug(slug, { includeDrafts: true });
  if (table === "categories") existing = await repo.getCategoryBySlug(slug);
  if (existing && existing.id !== excludeId) {
    throw new HttpError(409, `A ${table.slice(0, -1)} with that slug already exists.`);
  }
}

export function adminRouter() {
  const router = express.Router();

  // ------------------------------------------------------------------- dashboard
  router.get("/stats", async (req, res) => {
    res.json(await req.repo.getStats());
  });

  // -------------------------------------------------------------------- products
  router.get("/products", async (req, res) => {
    const result = await req.repo.listProducts({
      includeAll: true,
      q: parseString(req.query.q),
      category: parseString(req.query.category),
      status: parseString(req.query.status),
      sort: parseString(req.query.sort) || "newest",
      page: parseNumber(req.query.page) ?? 1,
      limit: parseNumber(req.query.limit) ?? 200,
    });
    res.json(result);
  });

  router.get("/products/:id", async (req, res) => {
    const product = await req.repo.getProductById(req.params.id);
    if (!product) throw new HttpError(404, "Product not found");
    res.json(product);
  });

  router.post("/products", async (req, res) => {
    const input = productCreateSchema.parse(req.body);
    const slug = slugify(input.slug || input.name);
    await assertUniqueSlug(req.repo, "products", slug);
    const product = await req.repo.createProduct({ ...input, slug });
    res.status(201).json(product);
  });

  router.patch("/products/:id", async (req, res) => {
    const existing = await req.repo.getProductById(req.params.id);
    if (!existing) throw new HttpError(404, "Product not found");

    const input = productUpdateSchema.parse(req.body);
    if (input.slug || input.name) {
      const slug = slugify(input.slug || input.name);
      await assertUniqueSlug(req.repo, "products", slug, existing.id);
      input.slug = slug;
    }

    const product = await req.repo.updateProduct(existing.id, input);
    res.json(product);
  });

  router.delete("/products/:id", async (req, res) => {
    const deleted = await req.repo.deleteProduct(req.params.id);
    if (!deleted) throw new HttpError(404, "Product not found");
    res.json({ ok: true });
  });

  // ------------------------------------------------------------------ categories
  router.get("/categories", async (req, res) => {
    res.json(await req.repo.listCategories());
  });

  router.post("/categories", async (req, res) => {
    const input = categoryCreateSchema.parse(req.body);
    const slug = slugify(input.slug || input.name);
    await assertUniqueSlug(req.repo, "categories", slug);
    res.status(201).json(await req.repo.createCategory({ ...input, slug }));
  });

  router.patch("/categories/:id", async (req, res) => {
    const existing = await req.repo.getCategoryById(req.params.id);
    if (!existing) throw new HttpError(404, "Category not found");

    const input = categoryUpdateSchema.parse(req.body);
    if (input.slug || input.name) {
      const slug = slugify(input.slug || input.name);
      await assertUniqueSlug(req.repo, "categories", slug, existing.id);
      input.slug = slug;
    }

    res.json(await req.repo.updateCategory(existing.id, input));
  });

  router.delete("/categories/:id", async (req, res) => {
    const deleted = await req.repo.deleteCategory(req.params.id);
    if (!deleted) throw new HttpError(404, "Category not found");
    res.json({ ok: true });
  });

  // --------------------------------------------------------------------- banners
  router.get("/banners", async (req, res) => {
    res.json(await req.repo.listBanners());
  });

  router.post("/banners", async (req, res) => {
    const input = bannerCreateSchema.parse(req.body);
    res.status(201).json(await req.repo.createBanner(input));
  });

  router.patch("/banners/:id", async (req, res) => {
    const existing = await req.repo.getBannerById(req.params.id);
    if (!existing) throw new HttpError(404, "Banner not found");
    const input = bannerUpdateSchema.parse(req.body);
    res.json(await req.repo.updateBanner(existing.id, input));
  });

  router.delete("/banners/:id", async (req, res) => {
    const deleted = await req.repo.deleteBanner(req.params.id);
    if (!deleted) throw new HttpError(404, "Banner not found");
    res.json({ ok: true });
  });

  // ---------------------------------------------------------------------- orders
  router.get("/orders", async (req, res) => {
    const result = await req.repo.listOrders({
      q: parseString(req.query.q),
      status: parseString(req.query.status),
      page: parseNumber(req.query.page) ?? 1,
      limit: parseNumber(req.query.limit) ?? 100,
    });
    res.json(result);
  });

  router.get("/orders/:id", async (req, res) => {
    const order = await req.repo.getOrderById(req.params.id);
    if (!order) throw new HttpError(404, "Order not found");
    res.json(order);
  });

  router.patch("/orders/:id/status", async (req, res) => {
    const { status } = orderStatusSchema.parse(req.body);
    res.json(await setOrderStatus(req.repo, req.params.id, status));
  });

  router.delete("/orders/:id", async (req, res) => {
    if (typeof req.repo.deleteOrder === "function") {
      const deleted = await req.repo.deleteOrder(req.params.id);
      if (!deleted) throw new HttpError(404, "Order not found");
      return res.json({ ok: true });
    }
    const existing = await req.repo.getOrderById(req.params.id);
    if (!existing) throw new HttpError(404, "Order not found");
    if (Array.isArray(req.repo.orders)) {
      req.repo.orders = req.repo.orders.filter((o) => o.id !== req.params.id);
    } else {
      const mongoose = (await import("mongoose")).default;
      if (mongoose.models.Order) {
        await mongoose.models.Order.findByIdAndDelete(req.params.id);
      }
    }
    res.json({ ok: true });
  });

  // ----------------------------------------------------------------------- users
  router.get("/users", async (req, res) => {
    res.json(
      await req.repo.listUsers({
        q: parseString(req.query.q),
        role: parseString(req.query.role),
      }),
    );
  });

  router.post("/users", async (req, res) => {
    const input = userCreateSchema.parse(req.body);
    if (input.role === "admin" && !input.password) {
      throw new HttpError(422, "Admins need a password.");
    }

    const existing = await req.repo.findUserForAuth(input.email);
    if (existing) throw new HttpError(409, "A user with that email already exists.");

    const { password, ...data } = input;
    const user = await req.repo.createUser({
      ...data,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    });
    res.status(201).json(publicUser(user));
  });

  router.patch("/users/:id", async (req, res) => {
    const existing = await req.repo.getUserById(req.params.id);
    if (!existing) throw new HttpError(404, "User not found");

    const input = userUpdateSchema.parse(req.body);
    if (input.email && input.email !== existing.email) {
      const duplicate = await req.repo.findUserForAuth(input.email);
      if (duplicate && duplicate.id !== existing.id) {
        throw new HttpError(409, "A user with that email already exists.");
      }
    }

    if (existing.id === req.user?.id) {
      if (input.role && input.role !== "admin") {
        throw new HttpError(400, "You cannot remove your own admin access.");
      }
      if (input.status && input.status !== "active") {
        throw new HttpError(400, "You cannot disable your own account.");
      }
    }

    if (existing.role === "admin" && input.role === "customer") {
      const admins = await req.repo.listUsers({ role: "admin" });
      if (admins.length <= 1) {
        throw new HttpError(400, "At least one admin account is required.");
      }
    }

    const { password, ...data } = input;
    const user = await req.repo.updateUser(existing.id, {
      ...data,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    });
    res.json(publicUser(user));
  });

  router.delete("/users/:id", async (req, res) => {
    if (req.user?.id === req.params.id) {
      throw new HttpError(400, "You cannot delete your own account.");
    }

    const existing = await req.repo.getUserById(req.params.id);
    if (!existing) throw new HttpError(404, "User not found");

    if (existing.role === "admin") {
      const admins = await req.repo.listUsers({ role: "admin" });
      if (admins.length <= 1) {
        throw new HttpError(400, "At least one admin account is required.");
      }
    }

    const deleted = await req.repo.deleteUser(req.params.id);
    if (!deleted) throw new HttpError(404, "User not found");
    res.json({ ok: true });
  });

  // ----------------------------------------------------------------------- media
  router.get("/media", async (req, res) => {
    res.json(await req.repo.listMedia());
  });

  router.post("/media", async (req, res) => {
    const input = mediaCreateSchema.parse(req.body);
    const match = input.dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
    if (!match) throw new HttpError(422, "Invalid image data.");

    const base64 = match[2];
    const size = Math.floor((base64.length * 3) / 4);
    const media = await req.repo.createMedia({
      name: input.name,
      mimeType: match[1],
      size,
      dataUrl: input.dataUrl,
    });
    res.status(201).json(media);
  });

  router.delete("/media/:id", async (req, res) => {
    const deleted = await req.repo.deleteMedia(req.params.id);
    if (!deleted) throw new HttpError(404, "Media item not found");
    res.json({ ok: true });
  });

  return router;
}