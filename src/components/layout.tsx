import { Link, useRouter } from "@tanstack/react-router";
import { ShoppingBag, Menu, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/use-store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const store = useStore();
  const router = useRouter();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/shop", label: "Shop" },
    { to: "/categories", label: "Categories" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.navigate({ to: "/search", search: { q: search } });
      setSearch("");
      setSearchOpen(false);
      setOpen(false);
    }
  };

  const query = search.trim().toLowerCase();
  const results = query
    ? store.products
        .filter((product) => product.status === "active")
        .filter(
          (product) =>
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            product.sku.toLowerCase().includes(query) ||
            product.tags.some((tag) => tag.toLowerCase().includes(query)),
        )
        .slice(0, 6)
    : [];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Maison
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open search"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Link to="/account" aria-label="Account">
              <Button variant="ghost" size="icon" className="relative">
                <UserRound className="h-5 w-5" />
                {store.user && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Cart"
              onClick={() => store.openCart()}
            >
              <ShoppingBag className="h-5 w-5" />
              {store.cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                  {store.cartCount}
                </span>
              )}
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="font-display text-xl">Maison</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.to}>
                      <Link
                        to={link.to}
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Link
                      to="/account"
                      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {store.user ? "My account" : "Sign in / Register"}
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm">
          <div className="border-b border-border bg-background shadow-xl">
            <div className="mx-auto max-w-3xl p-4 md:p-6">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products, categories, SKUs..."
                    className="h-12 pl-11 text-base"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </Button>
              </form>

              {query && (
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                  {results.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No products found for “{search.trim()}”.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {results.map((product) => (
                        <Link
                          key={product.id}
                          to="/product/$slug"
                          params={{ slug: product.slug }}
                          onClick={() => {
                            setSearch("");
                            setSearchOpen(false);
                          }}
                          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-12 w-12 rounded-md object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {product.name}
                            </p>
                            <p className="text-xs capitalize text-muted-foreground">
                              {product.category.replace(/-/g, " ")}
                            </p>
                          </div>
                          <span className="text-sm font-semibold">${product.price}</span>
                        </Link>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => {
                          if (search.trim()) {
                            router.navigate({ to: "/search", search: { q: search } });
                            setSearch("");
                            setSearchOpen(false);
                          }
                        }}
                      >
                        View all results
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {!query && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {store.categories.slice(0, 6).map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        router.navigate({
                          to: "/shop",
                          search: { category: category.slug },
                        });
                      }}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <span className="font-display text-2xl font-semibold">Maison</span>
            <p className="mt-2 text-sm text-muted-foreground">
              Curated objects for considered living. Cash on delivery available.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Shop</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  to="/categories"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-sm text-muted-foreground hover:text-foreground">
                  Search
                </Link>
              </li>
              <li>
                <Link
                  to="/shop"
                  search={{ featured: true }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Featured
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Support</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-sm text-muted-foreground">Cash on Delivery</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Guest Checkout</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            © 2025 Maison. Demo store — no real transactions.
          </p>
        </div>
      </div>
    </footer>
  );
}
