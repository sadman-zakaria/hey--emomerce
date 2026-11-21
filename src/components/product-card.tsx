import { Link } from "@tanstack/react-router";
import { Star, ShoppingBag, Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import { useStore } from "@/lib/use-store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const store = useStore();
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    store.addToCart(product, 1);
    store.openCart();
    toast.success(`${product.name} added to cart`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) {
      toast.error("Out of stock");
      return;
    }
    store.addToCart(product, 1);
    store.openCart();
  };

  const outOfStock = product.stock <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link to="/product/$slug" params={{ slug: product.slug }} className="block h-full w-full">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
        {discount > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            -{discount}%
          </span>
        )}
        {outOfStock && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 text-sm font-medium text-foreground">
            Out of stock
          </span>
        )}
        {product.featured && !outOfStock && (
          <span className="pointer-events-none absolute left-3 bottom-3 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            Featured
          </span>
        )}

        {/* Add to Cart icon button on the image */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          aria-label={`Add ${product.name} to cart`}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <ShoppingBag className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link to="/product/$slug" params={{ slug: product.slug }}>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.category}
          </span>
          <h3 className="mt-1 font-display text-base font-semibold text-foreground line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          <span className="text-xs text-muted-foreground">
            {product.rating} ({product.reviewCount})
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold text-foreground">
            ${product.price}
          </span>
          {product.compareAtPrice && (
            <span className="text-sm text-muted-foreground line-through">
              ${product.compareAtPrice}
            </span>
          )}
        </div>
        <div className="mt-auto pt-3">
          <Button
            size="sm"
            variant="default"
            className="w-full gap-2 text-xs font-semibold sm:text-sm"
            onClick={handleBuyNow}
            disabled={outOfStock}
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>Buy now</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
