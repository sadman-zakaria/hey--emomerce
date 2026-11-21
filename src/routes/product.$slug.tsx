import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  RefreshCw,
  Check,
} from "lucide-react";
import { store } from "@/lib/store";
import { useStore, useStoreBootstrap } from "@/lib/use-store";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const product = store.getProduct(params.slug);
    return {
      meta: product
        ? [
            { title: `${product.name} — Maison` },
            { name: "description", content: product.description.slice(0, 155) },
            { property: "og:title", content: `${product.name} — Maison` },
            { property: "og:description", content: product.description.slice(0, 155) },
            { property: "og:image", content: product.image },
            { name: "twitter:image", content: product.image },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
          ]
        : [{ title: "Product not found — Maison" }, { name: "robots", content: "noindex" }],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">Product not found.</div>
  ),
});

function ProductPage() {
  const store = useStore();
  useStoreBootstrap();
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const product = store.getProduct(slug);
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    if (!store.ready) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
          Loading product...
        </div>
      );
    }
    throw notFound();
  }

  const sameCategory = store.products.filter(
    (p) => p.status === "active" && p.category === product.category && p.id !== product.id,
  );
  const related = [
    ...sameCategory,
    ...store.products.filter(
      (p) =>
        p.status === "active" &&
        p.id !== product.id &&
        p.category !== product.category &&
        p.featured,
    ),
  ].slice(0, 4);

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const canBuy = product.stock > 0;

  const handleAdd = () => {
    if (!canBuy) {
      toast.error("Out of stock");
      return;
    }
    store.addToCart(product, quantity);
    toast.success(`${quantity} × ${product.name} added to cart`);
  };

  const handleOrderNow = () => {
    if (!canBuy) {
      toast.error("Out of stock");
      return;
    }
    store.addToCart(product, quantity);
    store.closeCart();
    void navigate({ to: "/checkout" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <Link
        to="/shop"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          {discount > 0 && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-sm uppercase tracking-wide text-muted-foreground">
            {product.category}
          </span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-foreground md:text-4xl">
            {product.name}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i <= Math.round(product.rating) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {product.rating} · {product.reviewCount} reviews
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-semibold text-foreground">
              ${product.price}
            </span>
            {product.compareAtPrice && (
              <span className="text-lg text-muted-foreground line-through">
                ${product.compareAtPrice}
              </span>
            )}
          </div>

          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {product.stock > 0 ? (
              <>
                <Check className="h-4 w-4 text-primary" />
                <span className="text-foreground">In stock ({product.stock} available)</span>
              </>
            ) : (
              <span className="text-destructive">Out of stock</span>
            )}
          </div>

          <div className="mt-2 text-sm text-muted-foreground">SKU: {product.sku}</div>

          {/* Quantity + actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-border">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleAdd}
              disabled={!canBuy}
            >
              <ShoppingBag className="h-4 w-4" /> Add to cart
            </Button>
            <Button size="lg" className="flex-1" onClick={handleOrderNow} disabled={!canBuy}>
              Order now
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Order now takes you straight to checkout. Cash on delivery available.
          </p>

          {/* Tags */}
          <div className="mt-5 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Trust */}
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <Truck className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">Free shipping over $100</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">2-year warranty</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <RefreshCw className="h-5 w-5 text-primary" />
              <span className="text-xs text-muted-foreground">30-day returns</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14 grid gap-8 rounded-2xl border border-border bg-card p-6 md:grid-cols-3 md:p-8">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            About this product
          </h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted-foreground">SKU</dt>
            <dd className="font-medium">{product.sku}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border pb-2">
            <dt className="text-muted-foreground">Category</dt>
            <dd className="font-medium capitalize">{product.category.replace(/-/g, " ")}</dd>
          </div>
          {product.subcategory && (
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium capitalize">{product.subcategory}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Availability</dt>
            <dd className="font-medium">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</dd>
          </div>
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-semibold text-foreground">
            You may also like
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
