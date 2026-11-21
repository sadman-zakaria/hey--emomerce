import { today } from "../utils/date.js";
import { slugify } from "../utils/slug.js";

function withoutUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

export function normalizeProduct(input = {}, existing = {}) {
  const merged = { ...existing, ...withoutUndefined(input) };
  const name = String(merged.name ?? "").trim();
  const slug = String(merged.slug ?? "").trim() || slugify(name);
  const compareAtPrice =
    merged.compareAtPrice === undefined ||
    merged.compareAtPrice === null ||
    merged.compareAtPrice === ""
      ? undefined
      : Number(merged.compareAtPrice);

  return {
    name,
    slug,
    description: merged.description ?? "",
    price: Number(merged.price ?? 0),
    ...(compareAtPrice === undefined ? {} : { compareAtPrice }),
    image: merged.image ?? "",
    images: Array.isArray(merged.images) ? merged.images.filter(Boolean) : [],
    category: merged.category ?? "",
    subcategory: merged.subcategory ?? "",
    tags: Array.isArray(merged.tags) ? merged.tags.filter(Boolean) : [],
    stock: Number(merged.stock ?? 0),
    sku: merged.sku ?? "",
    rating: Number(merged.rating ?? 0),
    reviewCount: Number(merged.reviewCount ?? 0),
    featured: Boolean(merged.featured),
    status: merged.status ?? "active",
    createdAt: merged.createdAt ?? today(),
  };
}

export function normalizeCategory(input = {}, existing = {}) {
  const merged = { ...existing, ...withoutUndefined(input) };
  const name = String(merged.name ?? "").trim();
  return {
    name,
    slug: String(merged.slug ?? "").trim() || slugify(name),
    description: merged.description ?? "",
    image: merged.image ?? "",
  };
}

export function normalizeBanner(input = {}, existing = {}) {
  const merged = { ...existing, ...withoutUndefined(input) };
  return {
    title: String(merged.title ?? "").trim(),
    subtitle: merged.subtitle ?? "",
    ctaText: merged.ctaText ?? "Shop now",
    ctaLink: merged.ctaLink ?? "/shop",
    image: merged.image ?? "",
    align: merged.align ?? "left",
    active: merged.active === undefined ? true : Boolean(merged.active),
    order: Number(merged.order ?? 0),
  };
}

export function normalizeUser(input = {}, existing = {}) {
  const merged = { ...existing, ...withoutUndefined(input) };
  const user = {
    name: String(merged.name ?? "").trim(),
    email: String(merged.email ?? "").trim().toLowerCase(),
    role: merged.role ?? "customer",
    status: merged.status ?? "active",
    orderCount: Number(merged.orderCount ?? 0),
    totalSpent: Number(merged.totalSpent ?? 0),
    createdAt: merged.createdAt ?? today(),
    ...(merged.lastLogin ? { lastLogin: merged.lastLogin } : {}),
  };

  if (merged.passwordHash) {
    user.passwordHash = merged.passwordHash;
  }

  return user;
}
