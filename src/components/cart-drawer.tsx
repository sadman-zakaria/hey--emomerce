import { Link, useRouter } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, X } from "lucide-react";
import { useStore } from "@/lib/use-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Right-side cart drawer with a sticky summary + checkout at the bottom.
 * Open state lives in the store so any "Add to cart" can pop it open.
 */
export function CartDrawer() {
  const store = useStore();
  const router = useRouter();

  const cart = store.cart;
  const subtotal = store.cartTotal;
  const shipping = subtotal >= 100 || subtotal === 0 ? 0 : 9.99;
  const total = subtotal + shipping;

  const close = () => {
    store.closeCart();
  };

  const goToCheckout = () => {
    close();
    void router.navigate({ to: "/checkout" });
  };

  const open = store.cartOpen;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-foreground/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-foreground" />
            <h2 className="font-display text-lg font-semibold text-foreground">Your cart</h2>
            <span className="text-sm text-muted-foreground">({store.cartCount})</span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the collection and add something you love.
            </p>
            <Button
              className="mt-5 w-full"
              onClick={() => {
                close();
                void router.navigate({ to: "/shop" });
              }}
            >
              Shop now
            </Button>
          </div>
        ) : (
          <>
            {/* Items (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      onClick={close}
                      className="shrink-0"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <Link
                        to="/product/$slug"
                        params={{ slug: item.slug }}
                        onClick={close}
                        className="text-sm font-medium text-foreground hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">${item.price}</span>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => store.updateQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-xs font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => store.updateQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => {
                              store.removeFromCart(item.productId);
                              toast.success("Removed from cart");
                            }}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticky summary + checkout */}
            <div className="sticky bottom-0 border-t border-border bg-background px-5 py-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">
                    {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                💵 Cash on delivery — pay when it arrives. No account needed.
              </div>
              <Button className="mt-3 w-full gap-2" onClick={goToCheckout}>
                Checkout <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
