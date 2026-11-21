import { today } from "../utils/date.js";
import { HttpError } from "../utils/http-error.js";
import { round2 } from "../utils/slug.js";

const FREE_SHIPPING_THRESHOLD = 100;
const FLAT_SHIPPING_RATE = 9.99;

export async function placeOrder(repo, input) {
  // Combine duplicate lines so stock checks are accurate.
  const merged = new Map();
  for (const item of input.items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  const lineItems = [];
  let subtotal = 0;

  for (const [productId, quantity] of merged) {
    const product = await repo.getProductById(productId);
    if (!product || product.status !== "active") {
      throw new HttpError(400, "One of the products in your cart is no longer available.");
    }
    if (product.stock < quantity) {
      throw new HttpError(409, `Only ${product.stock} left in stock for ${product.name}.`);
    }

    lineItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity,
      slug: product.slug,
    });
    subtotal += product.price * quantity;
  }

  subtotal = round2(subtotal);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  const total = round2(subtotal + shipping);
  const createdAt = today();

  const decremented = [];
  for (const item of lineItems) {
    const ok = await repo.decrementStock(item.productId, item.quantity);
    if (!ok) {
      for (const done of decremented) {
        await repo.incrementStock(done.productId, done.quantity);
      }
      throw new HttpError(409, `Insufficient stock for ${item.name}.`);
    }
    decremented.push(item);
  }

  let order;
  try {
    order = await repo.createOrderRecord({
      orderNumber: await repo.nextOrderNumber(),
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      shippingAddress: input.shippingAddress,
      city: input.city,
      zipCode: input.zipCode,
      items: lineItems,
      subtotal,
      shipping,
      total,
      status: "pending",
      paymentMethod: "cash_on_delivery",
      paymentStatus: "unpaid",
      createdAt,
      notes: input.notes ?? "",
    });
  } catch (error) {
    for (const item of decremented) {
      await repo.incrementStock(item.productId, item.quantity);
    }
    throw error;
  }

  await repo.upsertCustomerFromOrder({
    email: input.customerEmail,
    name: input.customerName,
    total,
    date: createdAt,
  });

  return order;
}

export async function setOrderStatus(repo, id, status) {
  const order = await repo.getOrderById(id);
  if (!order) throw new HttpError(404, "Order not found");

  if (order.status === status) return order;

  if (status === "cancelled" && order.status !== "cancelled") {
    for (const item of order.items) {
      await repo.incrementStock(item.productId, item.quantity);
    }
  }

  return repo.updateOrderStatus(id, status);
}
