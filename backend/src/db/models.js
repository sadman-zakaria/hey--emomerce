import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const idField = {
  type: String,
  default: () => crypto.randomUUID(),
};

const productSchema = new Schema(
  {
    _id: idField,
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0, default: undefined },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, default: "" },
    tags: { type: [String], default: [] },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, required: true, trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
      index: true,
    },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { versionKey: false },
);

const categorySchema = new Schema(
  {
    _id: idField,
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    description: { type: String, default: "" },
    image: { type: String, required: true },
  },
  { versionKey: false },
);

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    slug: { type: String, default: "" },
  },
  { _id: false, versionKey: false },
);

const orderSchema = new Schema(
  {
    _id: idField,
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    customerPhone: { type: String, required: true, trim: true },
    shippingAddress: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery"],
      default: "cash_on_delivery",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
      index: true,
    },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    notes: { type: String, default: "" },
  },
  { versionKey: false },
);

const userSchema = new Schema(
  {
    _id: idField,
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    orderCount: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    lastLogin: { type: String, default: undefined },
  },
  { versionKey: false },
);

const bannerSchema = new Schema(
  {
    _id: idField,
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    ctaText: { type: String, default: "Shop now" },
    ctaLink: { type: String, default: "/shop" },
    image: { type: String, required: true },
    align: { type: String, enum: ["left", "center", "right"], default: "left" },
    active: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const counterSchema = new Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const mediaSchema = new Schema(
  {
    _id: idField,
    name: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, default: 0 },
    dataUrl: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) },
  },
  { versionKey: false },
);

const settingSchema = new Schema(
  {
    _id: { type: String },
    value: { type: String, default: "" },
  },
  { versionKey: false },
);

export const Product = models.Product || model("Product", productSchema);
export const Category = models.Category || model("Category", categorySchema);
export const Order = models.Order || model("Order", orderSchema);
export const User = models.User || model("User", userSchema);
export const Banner = models.Banner || model("Banner", bannerSchema);
export const Counter = models.Counter || model("Counter", counterSchema);
export const Media = models.Media || model("Media", mediaSchema);
export const Setting = models.Setting || model("Setting", settingSchema);
