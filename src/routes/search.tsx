import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Search as SearchIcon, X, SlidersHorizontal } from "lucide-react";
import { useStore, useStoreBootstrap } from "@/lib/use-store";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

const PAGE_SIZE = 12;

type SearchPageSearch = {
  q?: string | undefined;
  category?: string | undefined;
  tags?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sort?: string | undefined;
  page?: number | undefined;
};

const ALL_TAGS = [
  "bestseller",
  "new",
  "premium",
  "wireless",
  "audio",
  "clothing",
  "handmade",
  "minimalist",
  "fitness",
  "luxury",
];

export const Route = createFileRoute("/search")({
  validateSearch: (search): SearchPageSearch => {
    const s = search as Record<string, unknown>;
    return {
      q: typeof s["q"] === "string" ? s["q"] : "",
      category: typeof s["category"] === "string" ? s["category"] : "",
      tags: Array.isArray(s["tags"])
        ? (s["tags"] as string[])
        : typeof s["tags"] === "string"
          ? [s["tags"] as string]
          : [],
      minPrice: typeof s["minPrice"] === "number" ? s["minPrice"] : 0,
      maxPrice: typeof s["maxPrice"] === "number" ? s["maxPrice"] : 1000,
      sort: typeof s["sort"] === "string" ? s["sort"] : "featured",
      page: typeof s["page"] === "number" ? s["page"] : 1,
    };
  },
  head: () => ({
    meta: [
      { title: "Search — Maison" },
      { name: "description", content: "Search across all products at Maison." },
      { property: "og:title", content: "Search — Maison" },
      { property: "og:description", content: "Search across all products at Maison." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const store = useStore();
  useStoreBootstrap();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const q = search.q ?? "";
  const category = search.category ?? "";
  const tags = search.tags ?? [];
  const minPrice = search.minPrice ?? 0;
  const maxPrice = search.maxPrice ?? 1000;
  const sort = search.sort ?? "featured";
  const page = search.page ?? 1;

  const filtered = useMemo(() => {
    let list = store.products.filter((p) => p.status === "active");
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          p.description.toLowerCase().includes(ql) ||
          p.sku.toLowerCase().includes(ql) ||
          p.tags.some((t) => t.includes(ql)),
      );
    }
    if (category) list = list.filter((p) => p.category === category);
    if (tags.length > 0) list = list.filter((p) => tags.every((t) => p.tags.includes(t)));
    list = list.filter((p) => p.price >= minPrice && p.price <= maxPrice);
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      default:
        list = [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
    }
    return list;
  }, [store.products, q, category, tags, minPrice, maxPrice, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateSearch = (updates: Partial<SearchPageSearch>) => {
    navigate({
      to: "/search",
      search: (prev) => ({ ...prev, ...updates, page: updates.page ?? 1 }),
    });
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    updateSearch({ tags: next });
  };

  const clearAll = () => {
    navigate({
      to: "/search",
      search: () => ({
        q: "",
        category: "",
        tags: [],
        minPrice: 0,
        maxPrice: 1000,
        sort: "featured",
        page: 1,
      }),
    });
  };

  const hasFilters = !!q || !!category || tags.length > 0 || minPrice > 0 || maxPrice < 1000;

  const FilterPanel = () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Category</h3>
        <div className="space-y-2">
          <button
            onClick={() => updateSearch({ category: "" })}
            className={`block w-full text-left text-sm ${!category ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            All categories
          </button>
          {store.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateSearch({ category: cat.slug })}
              className={`block w-full text-left text-sm ${category === cat.slug ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Tags</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                tags.includes(tag)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <Button variant="outline" className="w-full" onClick={clearAll}>
          <X className="mr-2 h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products, brands, tags..."
            value={q}
            onChange={(e) => updateSearch({ q: e.target.value })}
            className="h-12 pl-11 text-base"
            autoFocus
          />
          {q && (
            <button
              onClick={() => updateSearch({ q: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {q ? (
            <>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for{" "}
              <strong className="text-foreground">"{q}"</strong>
            </>
          ) : (
            <>Search across all {store.products.length} products</>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterPanel />
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={(v) => updateSearch({ sort: v })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-24">
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1">
          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
              <SearchIcon className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search term or clear your filters.
              </p>
              {hasFilters && (
                <Button variant="outline" className="mt-4" onClick={clearAll}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {paged.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => updateSearch({ page: currentPage - 1 })}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === currentPage ? "default" : "outline"}
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => updateSearch({ page: p })}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => updateSearch({ page: currentPage + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
