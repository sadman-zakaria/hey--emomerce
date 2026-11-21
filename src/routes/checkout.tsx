import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Truck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Maison" },
      {
        name: "description",
        content: "Guest checkout with cash on delivery. No account needed.",
      },
      { property: "og:title", content: "Checkout — Maison" },
      {
        property: "og:description",
        content: "Guest checkout with cash on delivery. No account needed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zip: "",
    notes: "",
  });

  const cart = store.cart;
  const subtotal = store.cartTotal;
  const shipping = subtotal >= 100 || subtotal === 0 ? 0 : 9.99;
  const total = subtotal + shipping;

  useEffect(() => {
    if (!store.user) return;
    setForm((current) => ({
      ...current,
      name: current.name || store.user!.name,
      email: current.email || store.user!.email,
    }));
  }, [store.user]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const order = await store.createOrder({
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: form.address,
        city: form.city,
        zipCode: form.zip,
        items: [...cart],
        subtotal,
        shipping,
        total,
        status: "pending",
        paymentMethod: "cash_on_delivery",
        notes: form.notes,
      });
      store.clearCart();
      store.closeCart();
      toast.success(`Order ${order.orderNumber} placed!`);
      void navigate({ to: "/thank-you", search: { order: order.orderNumber } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place your order");
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center md:px-6">
        <h1 className="font-display text-3xl font-semibold text-foreground">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add a few items before heading to checkout.</p>
        <Link to="/shop">
          <Button className="mt-6">Shop now</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Link
        to="/cart"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to cart
      </Link>
      <h1 className="mt-4 font-display text-4xl font-semibold text-foreground">Checkout</h1>
      <p className="mt-1 text-muted-foreground">
        Guest checkout — no account needed. Cash on delivery.
      </p>
      {store.user && (
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{store.user.email}</span>. This
          order will appear in your account.
        </p>
      )}

      <form onSubmit={handleCheckout} className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Details */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Contact details</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Shipping address</h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street address *</Label>
                <Textarea
                  id="address"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP code *</Label>
                  <Input
                    id="zip"
                    required
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Order notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Payment method</h2>
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-accent p-4">
              <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
              <div>
                <p className="font-medium text-accent-foreground">Cash on Delivery</p>
                <p className="text-sm text-accent-foreground/80">
                  Pay in cash when your order arrives. Payment shows as unpaid until the order is
                  delivered, and returns to unpaid if it is cancelled.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Order summary</h2>
            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="line-clamp-1 text-sm font-medium text-foreground">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Qty {item.quantity} × ${item.price}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            <Button type="submit" className="mt-4 w-full" disabled={submitting}>
              {submitting ? "Placing order..." : "Place order"}
            </Button>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure guest checkout
              </p>
              <p className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" /> Free shipping over $100
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
