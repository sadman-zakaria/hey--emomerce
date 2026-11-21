import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useStore, useStoreBootstrap } from "@/lib/use-store";
import { heroImage } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { BannerCarousel } from "@/components/banner-carousel";
import { TrustBadges } from "@/components/trust-badges";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maison — Curated Objects for Considered Living" },
      {
        name: "description",
        content:
          "Discover premium electronics, fashion, and home goods. Cash on delivery, guest checkout available.",
      },
      { property: "og:title", content: "Maison — Curated Objects for Considered Living" },
      {
        property: "og:description",
        content:
          "Discover premium electronics, fashion, and home goods. Cash on delivery, guest checkout available.",
      },
      { property: "og:image", content: heroImage },
      { name: "twitter:image", content: heroImage },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const store = useStore();
  useStoreBootstrap();
  const featured = store.products.filter((p) => p.featured).slice(0, 4);
  const rest = store.products.filter((p) => !p.featured).slice(0, 8);

  return (
    <div>
      {/* Hero banner carousel */}
      <BannerCarousel />

      {/* Shop by category */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold text-foreground">
              Shop by category
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Find exactly what you're looking for
            </p>
          </div>
          <Link
            to="/categories"
            className="hidden text-sm font-medium text-primary hover:underline md:block"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {store.categories.map((cat) => {
            const count = store.products.filter((p) => p.category === cat.slug).length;
            return (
              <Link
                key={cat.id}
                to="/shop"
                search={{ category: cat.slug }}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <h3 className="font-display text-xl font-semibold text-white">{cat.name}</h3>
                  <p className="text-sm text-white/80">{count} products</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust badges */}
      <TrustBadges />

      {/* Featured products */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-semibold text-foreground">
                Featured products
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Our handpicked favorites this season
              </p>
            </div>
            <Link
              to="/shop"
              search={{ featured: true }}
              className="hidden text-sm font-medium text-primary hover:underline md:block"
            >
              Shop all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* More products */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="mb-8">
          <h2 className="font-display text-3xl font-semibold text-foreground">More to explore</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One by one, the rest of the collection
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {rest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/shop">
            <Button size="lg" variant="outline" className="gap-2">
              View all products <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
