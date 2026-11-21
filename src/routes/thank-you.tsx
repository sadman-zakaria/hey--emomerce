import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Package, Truck, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/thank-you")({
  validateSearch: (search: Record<string, unknown>) => ({
    order: (search["order"] as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Thank You — Maison" },
      {
        name: "description",
        content: "Your order has been placed. Pay with cash on delivery.",
      },
      { property: "og:title", content: "Thank You — Maison" },
      {
        property: "og:description",
        content: "Your order has been placed. Pay with cash on delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const search = useSearch({ from: "/thank-you" });
  const order = search["order"];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center md:px-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h1 className="mt-6 font-display text-4xl font-semibold text-foreground">
        Thank you for your order!
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your order <strong className="text-foreground">{order || "has been placed"}</strong> has
        been confirmed. We'll get it ready and ship it out shortly.
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-xl border border-border bg-card p-6 text-left">
        <h2 className="font-display text-lg font-semibold text-foreground">What happens next?</h2>
        <ol className="mt-4 space-y-4">
          <li className="flex gap-3">
            <Package className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Order processing</p>
              <p className="text-sm text-muted-foreground">
                We prepare and pack your items within 1–2 business days.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">On the way</p>
              <p className="text-sm text-muted-foreground">
                You'll receive a delivery confirmation once it ships.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <Home className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Cash on delivery</p>
              <p className="text-sm text-muted-foreground">
                Pay in cash when your order arrives. No online payment needed.
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/shop">
          <Button className="w-full sm:w-auto">Continue shopping</Button>
        </Link>
        <Link to="/">
          <Button variant="outline" className="w-full sm:w-auto">
            Back home
          </Button>
        </Link>
      </div>
    </div>
  );
}
