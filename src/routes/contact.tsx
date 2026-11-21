import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Maison" },
      { name: "description", content: "Get in touch with the Maison team." },
      { property: "og:title", content: "Contact — Maison" },
      { property: "og:description", content: "Get in touch with the Maison team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back home
      </Link>
      <h1 className="font-display text-4xl font-semibold text-foreground">Contact us</h1>
      <p className="mt-2 text-muted-foreground">
        Questions about an order or a product? Reach out.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-sm">hello@maison.demo</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-sm">+1 (555) 010-0000</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="text-sm">123 Studio Lane, Portland, OR</span>
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Message sent! We'll get back to you soon.");
            (e.target as HTMLFormElement).reset();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" required placeholder="How can we help?" />
          </div>
          <Button type="submit" className="w-full">
            Send message
          </Button>
        </form>
      </div>
    </div>
  );
}
