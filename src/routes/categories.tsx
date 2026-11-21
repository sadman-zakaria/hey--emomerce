import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, useStoreBootstrap } from "@/lib/use-store";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Maison" },
      { name: "description", content: "Browse all product categories at Maison." },
      { property: "og:title", content: "Categories — Maison" },
      { property: "og:description", content: "Browse all product categories at Maison." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const store = useStore();
  useStoreBootstrap();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <h1 className="font-display text-4xl font-semibold text-foreground">Categories</h1>
      <p className="mt-2 text-muted-foreground">Browse our curated collections</p>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {store.categories.map((cat) => {
          const catProducts = store.products.filter((p) => p.category === cat.slug).slice(0, 3);
          return (
            <div key={cat.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <Link
                to="/shop"
                search={{ category: cat.slug }}
                className="relative block aspect-[16/9] overflow-hidden"
              >
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <h2 className="font-display text-2xl font-semibold text-white">{cat.name}</h2>
                  <p className="text-sm text-white/80">{cat.description}</p>
                </div>
              </Link>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {catProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                <Link to="/shop" search={{ category: cat.slug }}>
                  <Button variant="outline" className="mt-4 w-full">
                    Shop {cat.name}
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
