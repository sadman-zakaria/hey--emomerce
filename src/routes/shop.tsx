import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useStore, useStoreBootstrap } from "@/lib/use-store";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
const PAGE_SIZE = 12;

type ShopSearch = {
  q?: string | undefined;
  category?: string | undefined;
  featured?: boolean | undefined;
  tags?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sort?: string | undefined;
  page?: number | undefined;
};

const DEFAULTS: ShopSearch = {
  q: "",
  category: "",
  featured: false,
  tags: [],
  minPrice: 0,
  maxPrice: undefined,
  sort: "featured",
  page: 1,
};

export const Route = createFileRoute("/shop")({
  validateSearch: (search): ShopSearch => {
    const s = search as Record<string, unknown>;
    return {
      q: typeof s["q"] === "string" ? s["q"] : DEFAULTS.q,
      category: typeof s["category"] === "string" ? s["category"] : DEFAULTS.category,
      featured: s["featured"] === true ? true : DEFAULTS.featured,
      tags: Array.isArray(s["tags"])
        ? (s["tags"] as string[])
        : typeof s["tags"] === "string"
          ? [s["tags"] as string]
          : DEFAULTS.tags,
      minPrice: typeof s["minPrice"] === "number" ? s["minPrice"] : DEFAULTS.minPrice,
      maxPrice: typeof s["maxPrice"] === "number" ? s["maxPrice"] : DEFAULTS.maxPrice,
      sort: typeof s["sort"] === "string" ? s["sort"] : DEFAULTS.sort,
      page: typeof s["page"] === "number" ? s["page"] : DEFAULTS.page,
    };
  },
  head: () => ({
    meta: [
      { title: "Shop — Maison" },
      {
        name: "description",
        content: "Browse all products with filters for price, category, and tags.",
      },
      { property: "og:title", content: "Shop — Maison" },
      {
        property: "og:description",
        content: "Browse all products with filters for price, category, and tags.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const store = useStore();
  useStoreBootstrap();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const catalogMaxPrice = useMemo(() => {
    const highest = store.products.reduce((max, p) => Math.max(max, p.price), 1000);
    return Math.ceil(highest / 100) * 100;
  }, [store.products]);

  const q = search.q ?? "";
  const category = search.category ?? "";
  const featured = search.featured ?? false;
  const tags = search.tags ?? [];
  const minPrice = search.minPrice ?? 0;
  const maxPrice = search.maxPrice ?? catalogMaxPrice;
  const sort = search.sort ?? "featured";
  const page = search.page ?? 1;

  const filtered = useMemo(() => {
    let list = store.products.filter((p) => (p.status ?? "active").toLowerCase() === "active");

    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          p.description.toLowerCase().includes(ql) ||
          p.tags.some((t) => t.includes(ql)),
      );
    }
    if (category) list = list.filter((p) => p.category === category);
    if (featured) list = list.filter((p) => p.featured);
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
  }, [store.products, q, category, featured, tags, minPrice, maxPrice, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateSearch = (updates: ShopSearch) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates, page: updates.page ?? 1 }),
    });
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    updateSearch({ tags: next });
  };

  const clearAll = () => {
    navigate({ search: () => ({ ...DEFAULTS }) });
  };

  const hasFilters =
    !!q ||
    !!category ||
    featured ||
    tags.length > 0 ||
    minPrice > 0 ||
    (search.maxPrice !== undefined && search.maxPrice < catalogMaxPrice);

  const FilterContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Price range</h3>
        <div className="px-2">
          <Slider
            defaultValue={[minPrice, maxPrice]}
            min={0}
            max={catalogMaxPrice}
            step={10}
            onValueCommit={(value) => updateSearch({ minPrice: value[0], maxPrice: value[1] })}
            className="mb-3"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>${minPrice}</span>
            <span>${maxPrice}</span>
          </div>
        </div>
      </div>

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

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Special</h3>
        <div className="flex items-center gap-2">
          <Checkbox
            id="featured"
            checked={featured}
            onCheckedChange={(c) => updateSearch({ featured: c === true })}
          />
          <Label htmlFor="featured" className="text-sm text-muted-foreground">
            Featured only
          </Label>
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
      <div className="mb-6">
        <h1 className="font-display text-4xl font-semibold text-foreground">Shop</h1>
        <p className="mt-1 text-muted-foreground">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          {category && ` in ${store.categories.find((c) => c.slug === category)?.name ?? category}`}
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-24">
            <FilterContent />
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between gap-4">
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
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:block">Sort by</span>
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

          {paged.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
              <p className="text-muted-foreground">No products match your filters.</p>
              <Button variant="outline" className="mt-4" onClick={clearAll}>
                Clear filters
              </Button>
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
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Showing {paged.length} of {filtered.length} products · Page {currentPage} of{" "}
            {totalPages}
          </p>
        </div>
      </div>
    </div>
  );
}