import express from "express";
import { orderCreateSchema } from "../validation/schemas.js";
import { placeOrder } from "../services/orders.js";
import { HttpError } from "../utils/http-error.js";
import {
  parseBool,
  parseNumber,
  parseString,
  parseTags,
} from "../utils/query.js";

export function storefrontRouter() {
  const router = express.Router();

  router.get("/products", async (req, res) => {
    const result = await req.repo.listProducts({
      q: parseString(req.query.q),
      category: parseString(req.query.category),
      featured: parseBool(req.query.featured),
      tags: parseTags(req.query.tags),
      minPrice: parseNumber(req.query.minPrice),
      maxPrice: parseNumber(req.query.maxPrice),
      sort: parseString(req.query.sort) || "featured",
      page: parseNumber(req.query.page) ?? 1,
      limit: parseNumber(req.query.limit) ?? 24,
    });
    res.json(result);
  });

  router.get("/products/:slug", async (req, res) => {
    const product = await req.repo.getProductBySlug(req.params.slug);
    if (!product) throw new HttpError(404, "Product not found");
    res.json(product);
  });

  router.get("/categories", async (req, res) => {
    res.json(await req.repo.listCategories());
  });

  router.get("/banners", async (req, res) => {
    res.json(await req.repo.listBanners({ activeOnly: true }));
  });

  router.get("/bootstrap", async (req, res) => {
    const [products, categories, banners] = await Promise.all([
      req.repo.listProducts({ limit: 500, sort: "featured" }),
      req.repo.listCategories(),
      req.repo.listBanners({ activeOnly: true }),
    ]);

    res.json({
      products: products.items,
      categories,
      banners,
      mode: req.repo.mode,
    });
  });

  router.post("/orders", async (req, res) => {
    const input = orderCreateSchema.parse(req.body);
    const order = await placeOrder(req.repo, input);
    res.status(201).json(order);
  });

  router.get("/orders/:orderNumber", async (req, res) => {
    const email = parseString(req.query.email);
    if (!email) throw new HttpError(400, "Email is required to look up an order.");

    const order = await req.repo.getOrderByNumber(req.params.orderNumber, email);
    if (!order) throw new HttpError(404, "Order not found");

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items,
    });
  });

  return router;
}
