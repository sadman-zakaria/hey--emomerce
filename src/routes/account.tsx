import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogOut, Package, UserRound } from "lucide-react";
import { useStore, useStoreBootstrap } from "@/lib/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My Account — Maison" },
      { name: "description", content: "Sign in to see your Maison orders and account details." },
      { property: "og:title", content: "My Account — Maison" },
      { property: "og:description", content: "Sign in to see your Maison orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

type Mode = "signin" | "register";

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
};

function AccountPage() {
  const store = useStore();
  useStoreBootstrap();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!store.userAuthReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking your session...
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        await store.register(name, email, password);
        toast.success("Account created. Welcome to Maison!");
      } else {
        await store.customerLogin(email, password);
        toast.success("Signed in");
      }
      setPassword("");
      setConfirmPassword("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (store.user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">My account</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-foreground">
              Hello, {store.user.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{store.user.email}</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              store.customerLogout();
              toast.success("Signed out");
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border p-5">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">Your orders</h2>
          </div>

          {store.myOrders.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-muted-foreground">
                No orders yet for {store.user.email}. Orders placed with this email will appear here.
              </p>
              <Link to="/shop">
                <Button className="mt-4">Start shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {store.myOrders.map((order) => (
                <div key={order.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[order.status]} className="capitalize">
                        {order.status}
                      </Badge>
                      <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"}>
                        {order.paymentStatus === "paid" ? "Paid" : "COD unpaid"}
                      </Badge>
                    </div>
                    <p className="font-semibold">${order.total.toFixed(2)}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {order.items.map((item) => (
                      <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/product/$slug"
                            params={{ slug: item.slug }}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Qty {item.quantity} × ${item.price}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <UserRound className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">
          {mode === "signin" ? "Sign in to your account" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "See every order placed with your email."
            : "Create an account to track your orders and checkout faster."}
        </p>

        <div className="mt-5 grid grid-cols-2 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "register" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Register
          </button>
        </div>

        {!store.apiReachable && (
          <p className="mt-4 rounded-lg border border-border bg-accent px-3 py-2 text-xs text-accent-foreground">
            The API server is not reachable. Customer accounts require the backend to be running.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="account-name">Full name</Label>
              <Input
                id="account-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-password">Password</Label>
            <Input
              id="account-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="account-confirm">Confirm password</Label>
              <Input
                id="account-confirm"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
