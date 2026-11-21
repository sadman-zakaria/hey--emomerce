import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .email()
  .transform((value) => value.toLowerCase());

const money = z.coerce.number().finite().nonnegative();
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().finite().nonnegative().optional(),
);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: emailSchema,
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120).optional(),
});

const productBase = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().optional(),
  price: money,
  compareAtPrice: optionalMoney,
  image: z.string().trim().min(1),
  images: z.array(z.string().trim()).optional(),
  category: z.string().trim().min(1),
  subcategory: z.string().optional(),
  tags: z.array(z.string().trim()).optional(),
  stock: z.coerce.number().int().nonnegative(),
  sku: z.string().trim().min(1),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().nonnegative().optional(),
  featured: z.boolean().optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

export const productCreateSchema = productBase;
export const productUpdateSchema = productBase.partial();

const categoryBase = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  description: z.string().optional(),
  image: z.string().trim().min(1),
});

export const categoryCreateSchema = categoryBase;
export const categoryUpdateSchema = categoryBase.partial();

const bannerBase = z.object({
  title: z.string().trim().min(1),
  subtitle: z.string().optional(),
  ctaText: z.string().trim().optional(),
  ctaLink: z.string().trim().optional(),
  image: z.string().trim().min(1),
  align: z.enum(["left", "center", "right"]).optional(),
  active: z.boolean().optional(),
  order: z.coerce.number().int().optional(),
});

export const bannerCreateSchema = bannerBase;
export const bannerUpdateSchema = bannerBase.partial();

const userBase = z.object({
  name: z.string().trim().min(1),
  email: emailSchema,
  role: z.enum(["admin", "customer"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  orderCount: z.coerce.number().int().nonnegative().optional(),
  totalSpent: z.coerce.number().nonnegative().optional(),
  password: z.string().min(6).optional(),
});

export const userCreateSchema = userBase;
export const userUpdateSchema = userBase.partial();

export const orderCreateSchema = z.object({
  customerName: z.string().trim().min(1),
  customerEmail: emailSchema,
  customerPhone: z.string().trim().min(1),
  shippingAddress: z.string().trim().min(1),
  city: z.string().trim().min(1),
  zipCode: z.string().trim().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1, "Cart is empty"),
});

export const orderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

export const mediaCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  dataUrl: z
    .string()
    .max(9_000_000, "Image is too large. Please use an image under 6 MB.")
    .refine(
      (value) => /^data:image\/(png|jpe?g|webp|gif|avif);base64,/.test(value),
      "Only base64 PNG, JPEG, WebP, GIF, or AVIF images are supported.",
    ),
});
