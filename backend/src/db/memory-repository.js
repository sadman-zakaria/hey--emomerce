import { randomUUID } from "node:crypto";
import { today } from "../utils/date.js";
import { slugify } from "../utils/slug.js";
import {
  normalizeBanner,
  normalizeCategory,
  normalizeProduct,
  normalizeUser,
} from "./normalize.js";
import {
  seedBanners,
  seedCategories,
  seedOrders,
  seedProducts,
  seedUsers,
} from "../seed/seed-data.js";

const clone = (value) => structuredClone(value);

function sortProducts(list, sort) {
  const items = [...list];
  switch (sort) {
    case "price-asc":
      return items.sort((a, b) => a.price - b.price);
    case "price-desc":
      return items.sort((a, b) => b.price - a.price);
    case "rating":
      return items.sort((a, b) => b.rating - a.rating);
    case "newest":
      return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    case "name":
      return items.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return items.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          String(b.createdAt).localeCompare(String(a.createdAt)),
      );
  }
}

function paginate(items, page = 1, limit = 24) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(500, Math.max(1, Number(limit) || 24));
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  return {
    items: items.slice(start, start + safeLimit),
    total,
    page: safePage,
    pages,
    limit: safeLimit,
  };
}

export function createMemoryRepository() {
  const state = {
    products: clone(seedProducts),
    categories: clone(seedCategories),
    orders: clone(seedOrders),
    users: clone(seedUsers).map((user) => ({ ...user, passwordHash: null })),
    banners: clone(seedBanners),
    media: [],
    settings: new Map(),
    orderCounter: 1005,
  };

  const findProduct = (id) => state.products.find((p) => p.id === id);

  return {
    mode: "memory",

    // ------------------------------------------------------------------ products
    async countProducts() {
      return state.products.length;
    },

    async listProducts(options = {}) {
      const {
        includeAll = false,
        q = "",
        category = "",
        status = "",
        featured,
        tags = [],
        minPrice,
        maxPrice,
        sort = "featured",
        page = 1,
        limit = 24,
      } = options;

      let list = [...state.products];
      if (!includeAll) list = list.filter((p) => p.status === "active");
      if (status) list = list.filter((p) => p.status === status);

      if (q) {
        const needle = String(q).toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(needle) ||
            p.description.toLowerCase().includes(needle) ||
            p.sku.toLowerCase().includes(needle) ||
            p.tags.some((tag) => tag.toLowerCase().includes(needle)),
        );
      }

      if (category) list = list.filter((p) => p.category === category);
      if (featured !== undefined) list = list.filter((p) => p.featured === Boolean(featured));

      const tagList = Array.isArray(tags) ? tags : String(tags).split(",").filter(Boolean);
      if (tagList.length) {
        list = list.filter((p) => tagList.every((tag) => p.tags.includes(tag)));
      }

      if (minPrice !== undefined && minPrice !== "") {
        list = list.filter((p) => p.price >= Number(minPrice));
      }
      if (maxPrice !== undefined && maxPrice !== "") {
        list = list.filter((p) => p.price <= Number(maxPrice));
      }

      return paginate(sortProducts(list, sort), page, limit);
    },

    async getProductById(id) {
      const product = findProduct(id);
      return product ? clone(product) : null;
    },

    async getProductBySlug(slug, options = {}) {
      const product = state.products.find((p) => p.slug === slug);
      if (!product) return null;
      if (!options.includeDrafts && product.status !== "active") return null;
      return clone(product);
    },

    async createProduct(data) {
      const product = {
        id: data.id ?? randomUUID(),
        ...normalizeProduct(data),
      };
      state.products.unshift(product);
      return clone(product);
    },

    async updateProduct(id, data) {
      const index = state.products.findIndex((p) => p.id === id);
      if (index === -1) return null;
      const updated = {
        id,
        ...normalizeProduct(data, state.products[index]),
      };
      state.products[index] = updated;
      return clone(updated);
    },

    async deleteProduct(id) {
      const index = state.products.findIndex((p) => p.id === id);
      if (index === -1) return false;
      state.products.splice(index, 1);
      return true;
    },

    async decrementStock(id, quantity) {
      const product = findProduct(id);
      if (!product || product.stock < quantity) return false;
      product.stock -= quantity;
      return true;
    },

    async incrementStock(id, quantity) {
      const product = findProduct(id);
      if (!product) return false;
      product.stock += quantity;
      return true;
    },

    // ---------------------------------------------------------------- categories
    async listCategories() {
      return state.categories.map((category) => ({
        ...clone(category),
        productCount: state.products.filter((p) => p.category === category.slug).length,
      }));
    },

    async getCategoryById(id) {
      const category = state.categories.find((c) => c.id === id);
      return category ? clone(category) : null;
    },

    async getCategoryBySlug(slug) {
      const category = state.categories.find((c) => c.slug === slug);
      return category ? clone(category) : null;
    },

    async createCategory(data) {
      const category = {
        id: data.id ?? randomUUID(),
        ...normalizeCategory(data),
      };
      state.categories.push(category);
      return {
        ...clone(category),
        productCount: state.products.filter((p) => p.category === category.slug).length,
      };
    },

    async updateCategory(id, data) {
      const index = state.categories.findIndex((c) => c.id === id);
      if (index === -1) return null;
      const previous = state.categories[index];
      const updated = { id, ...normalizeCategory(data, previous) };
      state.categories[index] = updated;

      if (previous.slug !== updated.slug) {
        state.products.forEach((product) => {
          if (product.category === previous.slug) product.category = updated.slug;
        });
      }

      return {
        ...clone(updated),
        productCount: state.products.filter((p) => p.category === updated.slug).length,
      };
    },

    async deleteCategory(id) {
      const index = state.categories.findIndex((c) => c.id === id);
      if (index === -1) return false;
      const [removed] = state.categories.splice(index, 1);
      state.products.forEach((product) => {
        if (product.category === removed.slug) product.category = "";
      });
      return true;
    },

    // ------------------------------------------------------------------- banners
    async listBanners(options = {}) {
      const items = options.activeOnly
        ? state.banners.filter((banner) => banner.active)
        : [...state.banners];
      return items.sort((a, b) => a.order - b.order).map(clone);
    },

    async getBannerById(id) {
      const banner = state.banners.find((b) => b.id === id);
      return banner ? clone(banner) : null;
    },

    async createBanner(data) {
      const banner = {
        id: data.id ?? randomUUID(),
        ...normalizeBanner(data),
      };
      state.banners.push(banner);
      return clone(banner);
    },

    async updateBanner(id, data) {
      const index = state.banners.findIndex((b) => b.id === id);
      if (index === -1) return null;
      const updated = { id, ...normalizeBanner(data, state.banners[index]) };
      state.banners[index] = updated;
      return clone(updated);
    },

    async deleteBanner(id) {
      const index = state.banners.findIndex((b) => b.id === id);
      if (index === -1) return false;
      state.banners.splice(index, 1);
      return true;
    },

    // -------------------------------------------------------------------- orders
    async countOrders() {
      return state.orders.length;
    },

    async listOrders(options = {}) {
      const { q = "", status = "", page = 1, limit = 50 } = options;
      let list = [...state.orders];

      if (status) list = list.filter((order) => order.status === status);
      if (q) {
        const needle = String(q).toLowerCase();
        list = list.filter(
          (order) =>
            order.orderNumber.toLowerCase().includes(needle) ||
            order.customerName.toLowerCase().includes(needle) ||
            order.customerEmail.toLowerCase().includes(needle),
        );
      }

      list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return paginate(list, page, limit);
    },

    async getOrderById(id) {
      const order = state.orders.find((o) => o.id === id);
      return order ? clone(order) : null;
    },

    async getOrderByNumber(orderNumber, email) {
      const order = state.orders.find(
        (o) => o.orderNumber.toLowerCase() === String(orderNumber).toLowerCase(),
      );
      if (!order) return null;
      if (email && order.customerEmail.toLowerCase() !== String(email).toLowerCase()) return null;
      return clone(order);
    },

    async listOrdersForEmail(email) {
      const normalized = String(email).toLowerCase();
      return state.orders
        .filter((order) => order.customerEmail.toLowerCase() === normalized)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(clone);
    },

    async nextOrderNumber() {
      state.orderCounter += 1;
      return `ORD-${state.orderCounter}`;
    },

    async ensureOrderCounter(minimum) {
      state.orderCounter = Math.max(state.orderCounter, Number(minimum) || 0);
    },

    async createOrderRecord(record) {
      const order = {
        ...clone(record),
        id: record.id ?? randomUUID(),
        notes: record.notes ?? "",
        paymentStatus: record.paymentStatus ?? "unpaid",
      };
      state.orders.unshift(order);
      return clone(order);
    },

    async updateOrderStatus(id, status) {
      const order = state.orders.find((o) => o.id === id);
      if (!order) return null;
      order.status = status;
      order.paymentStatus = status === "delivered" ? "paid" : "unpaid";
      return clone(order);
    },

    // --------------------------------------------------------------------- users
    async countUsers() {
      return state.users.length;
    },

    async listUsers(options = {}) {
      const { q = "", role = "" } = options;
      let list = [...state.users];
      if (role) list = list.filter((user) => user.role === role);
      if (q) {
        const needle = String(q).toLowerCase();
        list = list.filter(
          (user) =>
            user.name.toLowerCase().includes(needle) ||
            user.email.toLowerCase().includes(needle),
        );
      }
      list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return list.map(({ passwordHash, ...user }) => {
        void passwordHash;
        return clone(user);
      });
    },

    async getUserById(id) {
      const user = state.users.find((u) => u.id === id);
      if (!user) return null;
      const { passwordHash, ...rest } = user;
      void passwordHash;
      return clone(rest);
    },

    async findUserForAuth(email) {
      const user = state.users.find((u) => u.email === String(email).toLowerCase());
      return user ? clone(user) : null;
    },

    async createUser(data) {
      const user = {
        id: data.id ?? randomUUID(),
        ...normalizeUser(data),
      };
      state.users.unshift(user);
      return clone(user);
    },

    async updateUser(id, data) {
      const index = state.users.findIndex((u) => u.id === id);
      if (index === -1) return null;
      const updated = {
        id,
        ...normalizeUser(data, state.users[index]),
      };
      state.users[index] = updated;
      return clone(updated);
    },

    async deleteUser(id) {
      const index = state.users.findIndex((u) => u.id === id);
      if (index === -1) return false;
      state.users.splice(index, 1);
      return true;
    },

    async upsertCustomerFromOrder({ email, name, total, date }) {
      const normalized = String(email).toLowerCase();
      const existing = state.users.find((u) => u.email === normalized);

      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += Number(total);
        existing.lastLogin = date ?? today();
        if (!existing.name) existing.name = name;
        return clone(existing);
      }

      const user = {
        id: randomUUID(),
        name,
        email: normalized,
        role: "customer",
        status: "active",
        orderCount: 1,
        totalSpent: Number(total),
        createdAt: date ?? today(),
        lastLogin: date ?? today(),
        passwordHash: null,
      };
      state.users.unshift(user);
      return clone(user);
    },

    // --------------------------------------------------------------------- stats
    async getStats() {
      const revenue = state.orders.reduce((sum, order) => sum + Number(order.total), 0);
      const ordersByStatus = state.orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      }, {});

      return {
        totalRevenue: revenue,
        totalOrders: state.orders.length,
        totalProducts: state.products.length,
        totalUsers: state.users.length,
        totalCustomers: state.users.filter((u) => u.role === "customer").length,
        lowStockProducts: state.products
          .filter((p) => p.stock < 20)
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 20)
          .map(clone),
        recentOrders: [...state.orders]
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .slice(0, 5)
          .map(clone),
        ordersByStatus,
      };
    },

    // --------------------------------------------------------------------- media
    async listMedia() {
      return [...state.media]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(clone);
    },

    async getMediaById(id) {
      const item = state.media.find((media) => media.id === id);
      return item ? clone(item) : null;
    },

    async createMedia(data) {
      const item = {
        id: data.id ?? randomUUID(),
        name: data.name,
        mimeType: data.mimeType,
        size: Number(data.size ?? 0),
        dataUrl: data.dataUrl,
        createdAt: today(),
      };
      state.media.unshift(item);
      return clone(item);
    },

    async deleteMedia(id) {
      const index = state.media.findIndex((media) => media.id === id);
      if (index === -1) return false;
      state.media.splice(index, 1);
      return true;
    },

    // ------------------------------------------------------------------ settings
    async getMeta(key) {
      return state.settings.get(key) ?? null;
    },

    async setMeta(key, value) {
      state.settings.set(key, String(value));
      return String(value);
    },

    // Helpers used by the seeding routine.
    async slugExists(slug, table = "products") {
      const collection =
        table === "categories" ? state.categories : table === "banners" ? state.banners : state.products;
      return collection.some((item) => item.slug === slugify(slug));
    },
  };
}
