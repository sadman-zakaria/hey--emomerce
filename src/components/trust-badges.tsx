import { Truck, ShieldCheck, RefreshCw, Headphones } from "lucide-react";

export function TrustBadges() {
  const badges = [
    { icon: Truck, title: "Free shipping", desc: "On orders over $100" },
    { icon: ShieldCheck, title: "2-year warranty", desc: "On all electronics" },
    { icon: RefreshCw, title: "30-day returns", desc: "No questions asked" },
    { icon: Headphones, title: "24/7 support", desc: "We're here to help" },
  ];

  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:px-6">
        {badges.map((b) => (
          <div key={b.title} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <b.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
