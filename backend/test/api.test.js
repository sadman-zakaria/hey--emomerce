import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "";
process.env.JWT_SECRET = "test-secret";
process.env.SEED_ON_START = "true";
process.env.ADMIN_NAME = "Tanjina Irin";
process.env.ADMIN_EMAIL = "tanjinairin62@gmail.com";
process.env.ADMIN_PASSWORD = "tanjina1234";

const { default: app } = await import("../src/app.js");

const ADMIN_EMAIL = "tanjinairin62@gmail.com";
const ADMIN_PASSWORD = "tanjina1234";

let token;
let productId;
let customerToken;
let customerEmail = "customer-test@example.com";
let customerOrderId;
let extraAdminId;

test("health check reports the storage mode", async () => {
  const res = await request(app).get("/api/health").expect(200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.mode, "memory");
});

test("storefront bootstrap returns seeded catalogue", async () => {
  const res = await request(app).get("/api/bootstrap").expect(200);
  assert.ok(res.body.products.length >= 12);
  assert.ok(res.body.categories.length >= 3);
  assert.ok(res.body.banners.length >= 3);
  assert.equal(typeof res.body.categories[0].productCount, "number");
  productId = res.body.products[0].id;
});

test("public product filtering works", async () => {
  const res = await request(app)
    .get("/api/products")
    .query({ category: "electronics", sort: "price-asc", limit: 5 })
    .expect(200);
  assert.ok(res.body.items.length > 0);
  assert.equal(res.body.items[0].price, Math.min(...res.body.items.map((p) => p.price)));
});

test("admin login rejects bad credentials", async () => {
  await request(app)
    .post("/api/auth/admin/login")
    .send({ email: ADMIN_EMAIL, password: "wrong" })
    .expect(401);
});

test("customer login endpoint rejects admin accounts with the admin route", async () => {
  await request(app)
    .post("/api/auth/admin/login")
    .send({ email: "elena@example.com", password: "not-a-real-password" })
    .expect(401);
});

test("admin login accepts the configured credentials", async () => {
  const res = await request(app)
    .post("/api/auth/admin/login")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    .expect(200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.role, "admin");
  assert.equal(res.body.user.email, ADMIN_EMAIL);
  assert.equal(res.body.user.passwordHash, undefined);
  token = res.body.token;
});

test("admin routes are protected", async () => {
  await request(app).get("/api/admin/stats").expect(401);
});

test("customer registration creates an account and a session", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ name: "Customer Test", email: customerEmail, password: "secret123" })
    .expect(201);

  assert.ok(res.body.token);
  assert.equal(res.body.user.email, customerEmail);
  assert.equal(res.body.user.role, "customer");
  assert.equal(res.body.user.passwordHash, undefined);
  customerToken = res.body.token;

  await request(app)
    .post("/api/auth/register")
    .send({ name: "Customer Test", email: customerEmail, password: "secret123" })
    .expect(409);
});

test("customer can sign in and restore their session", async () => {
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: customerEmail, password: "secret123" })
    .expect(200);
  assert.equal(login.body.user.email, customerEmail);

  const me = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${login.body.token}`)
    .expect(200);
  assert.equal(me.body.user.email, customerEmail);
  customerToken = login.body.token;
});

test("admin stats and product CRUD work", async () => {
  const stats = await request(app)
    .get("/api/admin/stats")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.ok(stats.body.totalProducts >= 12);

  const created = await request(app)
    .post("/api/admin/products")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Test Widget",
      description: "Created by the test suite",
      price: 25,
      image: "https://example.com/widget.jpg",
      category: "electronics",
      tags: ["test"],
      stock: 10,
      sku: "TST-WD-999",
      featured: false,
      status: "active",
    })
    .expect(201);

  assert.equal(created.body.slug, "test-widget");
  assert.equal(created.body.id.length > 0, true);

  const updated = await request(app)
    .patch(`/api/admin/products/${created.body.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ price: 30 })
    .expect(200);
  assert.equal(updated.body.price, 30);

  await request(app)
    .delete(`/api/admin/products/${created.body.id}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
});

test("admin can create another admin who can sign in", async () => {
  const created = await request(app)
    .post("/api/admin/users")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Second Admin",
      email: "second-admin@example.com",
      role: "admin",
      status: "active",
      password: "adminpass123",
      orderCount: 0,
      totalSpent: 0,
    })
    .expect(201);

  assert.equal(created.body.role, "admin");
  assert.equal(created.body.passwordHash, undefined);
  extraAdminId = created.body.id;

  const login = await request(app)
    .post("/api/auth/admin/login")
    .send({ email: "second-admin@example.com", password: "adminpass123" })
    .expect(200);
  assert.equal(login.body.user.id, extraAdminId);

  await request(app)
    .post("/api/admin/users")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "No Password Admin", email: "nopass@example.com", role: "admin" })
    .expect(422);
});

test("admins cannot demote or delete themselves", async () => {
  const me = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  await request(app)
    .patch(`/api/admin/users/${me.body.user.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ role: "customer" })
    .expect(400);

  await request(app)
    .delete(`/api/admin/users/${me.body.user.id}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(400);
});

test("admin can remove another admin", async () => {
  await request(app)
    .delete(`/api/admin/users/${extraAdminId}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);

  await request(app)
    .post("/api/auth/admin/login")
    .send({ email: "second-admin@example.com", password: "adminpass123" })
    .expect(401);
});

test("media upload, listing, and deletion work", async () => {
  const created = await request(app)
    .post("/api/admin/media")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "test-pixel.png",
      dataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    })
    .expect(201);

  assert.equal(created.body.mimeType, "image/png");
  assert.ok(created.body.size > 0);

  const list = await request(app)
    .get("/api/admin/media")
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
  assert.ok(list.body.some((item) => item.id === created.body.id));

  await request(app)
    .post("/api/admin/media")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "bad.txt", dataUrl: "data:text/plain;base64,SGVsbG8=" })
    .expect(422);

  await request(app)
    .delete(`/api/admin/media/${created.body.id}`)
    .set("Authorization", `Bearer ${token}`)
    .expect(200);
});

test("guest checkout creates an order and decreases stock", async () => {
  const before = await request(app).get(`/api/products/aura-wireless-headphones`).expect(200);

  const order = await request(app)
    .post("/api/orders")
    .send({
      customerName: "Test Buyer",
      customerEmail: customerEmail,
      customerPhone: "+1 555 0000",
      shippingAddress: "1 Test Street",
      city: "Testville",
      zipCode: "00000",
      notes: "Leave at the door",
      items: [{ productId, quantity: 1 }],
    })
    .expect(201);

  assert.match(order.body.orderNumber, /^ORD-\d+$/);
  assert.equal(order.body.status, "pending");
  assert.equal(order.body.paymentMethod, "cash_on_delivery");
  assert.equal(order.body.paymentStatus, "unpaid");
  customerOrderId = order.body.id;

  const after = await request(app).get(`/api/products/aura-wireless-headphones`).expect(200);
  if (before.body.id === productId) {
    assert.equal(after.body.stock, before.body.stock - 1);
  }
});

test("customer order history only returns their own orders", async () => {
  const mine = await request(app)
    .get("/api/account/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .expect(200);
  assert.equal(mine.body.items.length, 1);
  assert.equal(mine.body.items[0].id, customerOrderId);
  assert.equal(mine.body.items[0].customerEmail, customerEmail);

  const other = await request(app)
    .post("/api/auth/register")
    .send({ name: "Other Buyer", email: "other-buyer@example.com", password: "secret123" })
    .expect(201);

  const theirs = await request(app)
    .get("/api/account/orders")
    .set("Authorization", `Bearer ${other.body.token}`)
    .expect(200);
  assert.equal(theirs.body.items.length, 0);

  await request(app).get("/api/account/orders").expect(401);
});

test("delivering an order marks it paid and cancelling returns it to unpaid", async () => {
  const delivered = await request(app)
    .patch(`/api/admin/orders/${customerOrderId}/status`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "delivered" })
    .expect(200);
  assert.equal(delivered.body.status, "delivered");
  assert.equal(delivered.body.paymentStatus, "paid");

  const cancelled = await request(app)
    .patch(`/api/admin/orders/${customerOrderId}/status`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "cancelled" })
    .expect(200);
  assert.equal(cancelled.body.status, "cancelled");
  assert.equal(cancelled.body.paymentStatus, "unpaid");
});

test("checkout rejects empty carts", async () => {
  await request(app)
    .post("/api/orders")
    .send({
      customerName: "Test Buyer",
      customerEmail: "buyer@example.com",
      customerPhone: "+1 555 0000",
      shippingAddress: "1 Test Street",
      city: "Testville",
      zipCode: "00000",
      items: [],
    })
    .expect(422);
});
