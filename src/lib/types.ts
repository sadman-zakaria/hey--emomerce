export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  align: "left" | "center" | "right";
  active: boolean;
  order: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number | undefined;
  image: string;
  images?: string[] | undefined;
  category: string;
  subcategory?: string | undefined;
  tags: string[];
  stock: number;
  sku: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  status: "active" | "draft" | "archived";
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount: number;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  slug: string;
};

export type MediaItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  zipCode: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  paymentMethod: "cash_on_delivery";
  paymentStatus: "unpaid" | "paid" | "refunded";
  createdAt: string;
  notes?: string | undefined;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "customer";
  status: "active" | "inactive";
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  lastLogin?: string | undefined;
};
