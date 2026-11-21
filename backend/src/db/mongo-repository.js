import { randomUUID } from "node:crypto";
import { today } from "../utils/date.js";
import { toPlain } from "./serialize.js";
import {
  normalizeBanner,
  normalizeCategory,
  normalizeProduct,
  normalizeUser,
} from "./normalize.js";
import { Banner, Category, Counter, Media, Order, Product, Setting, User } from "./models.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function paginate(items, total, page, limit) {
  return {
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}

function productSort(sort) {
  switch (sort) {
    case "price-asc":
      return { price: 1 };
    case "price-desc":
      return { price: -1 };
    case "rating":
      return { rating: -1 };
    case "newest":
      return { createdAt: -1 };
    case "name":
      return { name: 1 };
    default:
      return { featured: -1, createdAt: -1 };
  }
}

export function createMongoRepository() {
  return {
    mode: "mongo",

    // ------------------------------------------------------------------ products
    async countProducts() {
      return Product.countDocuments({});
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

      const filter = {};
      if (!includeAll) filter.status = "active";
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (featured !== undefined) filter.featured = Boolean(featured);

      const tagList = Array.isArray(tags) ? tags : String(tags).split(",").filter(Boolean);
      if (tagList.length) filter.tags = { $all: tagList };

      if (minPrice !== undefined && minPrice !== "") {
        filter.price = { ...(filter.price ?? {}), $gte: Number(minPrice) };
      }
      if (maxPrice !== undefined && maxPrice !== "") {
        filter.price = { ...(filter.price ?? {}), $lte: Number(maxPrice) };
      }

      if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        filter.$or = [{ name: rx }, { description: rx }, { sku: rx }, { tags: rx }];
      }

      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(500, Math.max(1, Number(limit) || 24));

      const [total, docs] = await Promise.all([
        Product.countDocuments(filter),
        Product.find(filter)
          .sort(productSort(sort))
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit)
          .lean(),
      ]);

      return paginate(docs.map(toPlain), total, safePage, safeLimit);
    },

    async getProductById(id) {
      if (!id) return null;
      return toPlain(await Product.findById(id).lean());
    },

    async getProductBySlug(slug, options = {}) {
      const filter = { slug };
      if (!options.includeDrafts) filter.status = "active";
      return toPlain(await Product.findOne(filter).lean());
    },

    async createProduct(data) {
      const doc = await Product.create({
        _id: data.id ?? randomUUID(),
        ...normalizeProduct(data),
      });
      return toPlain(doc);
    },

    async updateProduct(id, data) {
      const existing = await Product.findById(id).lean();
      if (!existing) return null;

      const normalized = normalizeProduct(data, toPlain(existing));
      const { compareAtPrice, ...rest } = normalized;
      const update = { $set: rest };
      if (compareAtPrice === undefined) {
        update.$unset = { compareAtPrice: 1 };
      } else {
        update.$set.compareAtPrice = compareAtPrice;
      }

      const doc = await Product.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      }).lean();
      return toPlain(doc);
    },

    async deleteProduct(id) {
      const result = await Product.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },

    async decrementStock(id, quantity) {
      const result = await Product.updateOne(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
      );
      return result.modifiedCount > 0;
    },

    async incrementStock(id, quantity) {
      const result = await Product.updateOne({ _id: id }, { $inc: { stock: quantity } });
      return result.modifiedCount > 0;
    },

    // ---------------------------------------------------------------- categories
    async listCategories() {
      const [categories, counts] = await Promise.all([
        Category.find({}).sort({ name: 1 }).lean(),
        Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
      ]);
      const countBySlug = new Map(counts.map((row) => [row._id, row.count]));
      return categories.map((category) => ({
        ...toPlain(category),
        productCount: countBySlug.get(category.slug) ?? 0,
      }));
    },

    async getCategoryById(id) {
      return toPlain(await Category.findById(id).lean());
    },

    async getCategoryBySlug(slug) {
      return toPlain(await Category.findOne({ slug }).lean());
    },

    async createCategory(data) {
      const doc = await Category.create({
        _id: data.id ?? randomUUID(),
        ...normalizeCategory(data),
      });
      return { ...toPlain(doc), productCount: 0 };
    },

    async updateCategory(id, data) {
      const existing = await Category.findById(id).lean();
      if (!existing) return null;

      const previous = toPlain(existing);
      const normalized = normalizeCategory(data, previous);
      const doc = await Category.findByIdAndUpdate(id, normalized, {
        new: true,
        runValidators: true,
      }).lean();

      if (previous.slug !== normalized.slug) {
        await Product.updateMany(
          { category: previous.slug },
          { $set: { category: normalized.slug } },
        );
      }

      const productCount = await Product.countDocuments({ category: normalized.slug });
      return { ...toPlain(doc), productCount };
    },

    async deleteCategory(id) {
      const existing = await Category.findById(id).lean();
      if (!existing) return false;
      await Category.deleteOne({ _id: id });
      await Product.updateMany({ category: existing.slug }, { $set: { category: "" } });
      return true;
    },

    // ------------------------------------------------------------------- banners
    async listBanners(options = {}) {
      const filter = options.activeOnly ? { active: true } : {};
      const docs = await Banner.find(filter).sort({ order: 1 }).lean();
      return docs.map(toPlain);
    },

    async getBannerById(id) {
      return toPlain(await Banner.findById(id).lean());
    },

    async createBanner(data) {
      const doc = await Banner.create({
        _id: data.id ?? randomUUID(),
        ...normalizeBanner(data),
      });
      return toPlain(doc);
    },

    async updateBanner(id, data) {
      const existing = await Banner.findById(id).lean();
      if (!existing) return null;
      const normalized = normalizeBanner(data, toPlain(existing));
      const doc = await Banner.findByIdAndUpdate(id, normalized, {
        new: true,
        runValidators: true,
      }).lean();
      return toPlain(doc);
    },

    async deleteBanner(id) {
      const result = await Banner.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },

    // -------------------------------------------------------------------- orders
    async countOrders() {
      return Order.countDocuments({});
    },

    async listOrders(options = {}) {
      const { q = "", status = "", page = 1, limit = 50 } = options;
      const filter = {};
      if (status) filter.status = status;
      if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        filter.$or = [{ orderNumber: rx }, { customerName: rx }, { customerEmail: rx }];
      }

      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));

      const [total, docs] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit)
          .lean(),
      ]);

      return paginate(docs.map(toPlain), total, safePage, safeLimit);
    },

    async getOrderById(id) {
      return toPlain(await Order.findById(id).lean());
    },

    async getOrderByNumber(orderNumber, email) {
      const filter = { orderNumber: new RegExp(`^${escapeRegex(orderNumber)}$`, "i") };
      if (email) filter.customerEmail = String(email).toLowerCase();
      return toPlain(await Order.findOne(filter).lean());
    },

    async listOrdersForEmail(email) {
      const docs = await Order.find({ customerEmail: String(email).toLowerCase() })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      return docs.map(toPlain);
    },

    async nextOrderNumber() {
      const counter = await Counter.findOneAndUpdate(
        { _id: "order" },
        { $inc: { seq: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      return `ORD-${counter.seq}`;
    },

    async ensureOrderCounter(minimum) {
      await Counter.updateOne(
        { _id: "order" },
        { $max: { seq: Number(minimum) || 0 } },
        { upsert: true },
      );
    },

    async createOrderRecord(record) {
      const { id, ...rest } = record;
      const doc = await Order.create({
        _id: id ?? randomUUID(),
        ...rest,
        notes: rest.notes ?? "",
      });
      return toPlain(doc);
    },

    async updateOrderStatus(id, status) {
      const doc = await Order.findByIdAndUpdate(
        id,
        { $set: { status, paymentStatus: status === "delivered" ? "paid" : "unpaid" } },
        { new: true, runValidators: true },
      ).lean();
      return toPlain(doc);
    },

    // --------------------------------------------------------------------- users
    async countUsers() {
      return User.countDocuments({});
    },

    async listUsers(options = {}) {
      const { q = "", role = "" } = options;
      const filter = {};
      if (role) filter.role = role;
      if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        filter.$or = [{ name: rx }, { email: rx }];
      }
      const docs = await User.find(filter).sort({ createdAt: -1 }).lean();
      return docs.map(toPlain);
    },

    async getUserById(id) {
      return toPlain(await User.findById(id).lean());
    },

    async findUserForAuth(email) {
      return toPlain(
        await User.findOne({ email: String(email).toLowerCase() })
          .select("+passwordHash")
          .lean(),
      );
    },

    async createUser(data) {
      const doc = await User.create({
        _id: data.id ?? randomUUID(),
        ...normalizeUser(data),
      });
      const plain = toPlain(doc);
      delete plain.passwordHash;
      return plain;
    },

    async updateUser(id, data) {
      const existingDoc = await User.findById(id).select("+passwordHash").lean();
      if (!existingDoc) return null;

      const normalized = normalizeUser(data, toPlain(existingDoc));
      const doc = await User.findByIdAndUpdate(id, normalized, {
        new: true,
        runValidators: true,
      }).lean();
      const plain = toPlain(doc);
      delete plain.passwordHash;
      return plain;
    },

    async deleteUser(id) {
      const result = await User.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },

    async upsertCustomerFromOrder({ email, name, total, date }) {
      const normalized = String(email).toLowerCase();
      const when = date ?? today();
      const doc = await User.findOneAndUpdate(
        { email: normalized },
        {
          $inc: { orderCount: 1, totalSpent: Number(total) },
          $set: { lastLogin: when },
          $setOnInsert: {
            _id: randomUUID(),
            name,
            role: "customer",
            status: "active",
            createdAt: when,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
      return toPlain(doc);
    },

    // --------------------------------------------------------------------- media
    async listMedia() {
      const docs = await Media.find({}).sort({ createdAt: -1 }).lean();
      return docs.map(toPlain);
    },

    async getMediaById(id) {
      return toPlain(await Media.findById(id).lean());
    },

    async createMedia(data) {
      const doc = await Media.create({
        _id: data.id ?? randomUUID(),
        name: data.name,
        mimeType: data.mimeType,
        size: Number(data.size ?? 0),
        dataUrl: data.dataUrl,
      });
      return toPlain(doc);
    },

    async deleteMedia(id) {
      const result = await Media.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },

    // ------------------------------------------------------------------ settings
    async getMeta(key) {
      const doc = await Setting.findById(key).lean();
      return doc?.value ?? null;
    },

    async setMeta(key, value) {
      await Setting.findByIdAndUpdate(
        key,
        { $set: { value: String(value) } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return String(value);
    },

    // --------------------------------------------------------------------- stats
    async getStats() {
      const [revenue, totalOrders, totalProducts, totalUsers, totalCustomers, lowStock, recent, byStatus] =
        await Promise.all([
          Order.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
          Order.countDocuments({}),
          Product.countDocuments({}),
          User.countDocuments({}),
          User.countDocuments({ role: "customer" }),
          Product.find({ stock: { $lt: 20 } }).sort({ stock: 1 }).limit(20).lean(),
          Order.find({}).sort({ createdAt: -1 }).limit(5).lean(),
          Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        ]);

      return {
        totalRevenue: revenue[0]?.total ?? 0,
        totalOrders,
        totalProducts,
        totalUsers,
        totalCustomers,
        lowStockProducts: lowStock.map(toPlain),
        recentOrders: recent.map(toPlain),
        ordersByStatus: Object.fromEntries(byStatus.map((row) => [row._id, row.count])),
      };
    },
  };
}
