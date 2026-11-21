import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  ArrowLeft,
  Images,
  LogOut,
  Lock,
  Mail,
  Loader2,
  WifiOff,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Maison" },
      {
        name: "description",
        content: "Manage products, orders, users, categories, and inventory.",
      },
      { property: "og:title", content: "Admin Dashboard — Maison" },
      {
        property: "og:description",
        content: "Manage products, orders, users, categories, and inventory.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLayout,
});

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { to: "/admin/users", label: "Customers", icon: Users, exact: false },
  { to: "/admin/admins", label: "Admins", icon: UserCog, exact: false },
  { to: "/admin/categories", label: "Categories", icon: FolderTree, exact: false },
  { to: "/admin/banners", label: "Banners", icon: Images, exact: false },
  { to: "/admin/media", label: "Media", icon: Images, exact: false },
];

function AdminLayout() {
  const store = useStore();

  useEffect(() => {
    void store.bootstrap();
  }, [store]);

  // নতুন অর্ডার আসলে নোটিফিকেশন কাউন্টার আপডেট রাখার জন্য প্রতি ১৫ সেকেন্ডে রিফ্রেশ
  useEffect(() => {
    if (!store.adminUser || store.mode !== "online") return;
    const interval = setInterval(() => {
      void store.refreshAdminData().catch(() => undefined);
    }, 15000);
    return () => clearInterval(interval);
  }, [store, store.adminUser, store.mode]);

  if (!store.authReady) return <AdminBootScreen />;
  if (!store.adminUser) return <AdminLogin />;

  const pendingCount = store.pendingOrdersCount;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-6">
          <span className="font-display text-xl font-semibold text-sidebar-foreground">
            Maison Admin
          </span>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              activeProps={{
                className:
                  "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
              }}
              activeOptions={{ exact: item.exact }}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.to === "/admin/orders" && pendingCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 p-3">
          <div className="rounded-lg border border-sidebar-border p-3">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {store.adminUser.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{store.adminUser.email}</p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-sidebar-foreground/60">
              <ShieldCheck className="h-3 w-3" />
              {store.mode === "online" ? "API connected" : "Offline demo mode"}
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
          <button
            type="button"
            onClick={() => {
              store.logout();
              toast.success("Signed out");
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        {/* Mobile nav */}
        <div className="flex items-center justify-between gap-2 border-b border-border p-2 md:hidden">
          <div className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                activeOptions={{ exact: item.exact }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.to === "/admin/orders" && pendingCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              store.logout();
              toast.success("Signed out");
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

function AdminBootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Checking your session...</p>
      </div>
    </div>
  );
}

function AdminLogin() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await store.login(email, password);
      toast.success("Welcome back");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">
            Sign in to Maison Admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff only. Manage products, orders, customers, admins, categories, banners, and media.
          </p>

          {store.mode === "offline" && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-accent p-3 text-sm text-accent-foreground">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                API server not reachable. Sign in with the demo admin credentials to use local mode.
                Data changes stay in this browser only.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-9"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-9"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Authorized staff only. Sessions are secured with JWT tokens.
          </p>
        </div>
      </div>
    </div>
  );
}