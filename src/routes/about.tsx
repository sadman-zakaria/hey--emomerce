import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Maison" },
      {
        name: "description",
        content: "The story behind Maison — curating objects worth keeping since 2025.",
      },
      { property: "og:title", content: "About — Maison" },
      {
        property: "og:description",
        content: "The story behind Maison — curating objects worth keeping since 2025.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back home
      </Link>
      <h1 className="font-display text-4xl font-semibold text-foreground">Our story</h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
        <p>
          Maison began with a simple belief: the things we live with should be made to last. In a
          world of disposable everything, we curate a tight edit of electronics, fashion, and home
          goods chosen for craft, longevity, and quiet design.
        </p>
        <p>
          Every product on our shelves is one we use ourselves. We work directly with makers, skip
          the middlemen, and pass the savings on — with the convenience of cash on delivery and no
          account required to check out.
        </p>
        <p>This is a demo store. Orders are simulated and no real payment is processed.</p>
      </div>
    </div>
  );
}
