import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/use-store";
import { Button } from "@/components/ui/button";

type ParsedLink = {
  path: string;
  search: Record<string, string | boolean>;
};

function parseLink(to: string): ParsedLink {
  const [rawPath = "", query = ""] = to.split("?");
  const search: Record<string, string | boolean> = {};
  if (query) {
    for (const pair of query.split("&")) {
      const [k, v] = pair.split("=");
      if (!k) continue;
      const val = decodeURIComponent(v ?? "");
      if (val === "true") search[k] = true;
      else if (val === "false") search[k] = false;
      else if (val !== "") search[k] = val;
    }
  }
  return { path: rawPath, search };
}

/**
 * Internal-link-aware button. Banner CTAs can be internal paths
 * (e.g. "/shop?category=electronics") or external URLs.
 */
function BannerCta({ to, label }: { to: string; label: string }) {
  const router = useRouter();

  if (to.startsWith("/")) {
    const { path, search } = parseLink(to);
    const hasSearch = Object.keys(search).length > 0;
    return (
      <Button
        size="lg"
        className="gap-2"
        onClick={() => {
          if (hasSearch) {
            void router.navigate({ to: path, search } as never);
          } else {
            void router.navigate({ to: path } as never);
          }
        }}
      >
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <a href={to} target="_blank" rel="noopener noreferrer">
      <Button size="lg" className="gap-2">
        {label} <ArrowRight className="h-4 w-4" />
      </Button>
    </a>
  );
}

export function BannerCarousel() {
  useStore();
  const banners = useStore().activeBanners;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (banners.length === 0 ? 0 : (i + 1) % banners.length));
  }, [banners.length]);

  const prev = useCallback(() => {
    setIndex((i) => (banners.length === 0 ? 0 : (i - 1 + banners.length) % banners.length));
  }, [banners.length]);

  // Reset index if it drifts out of range after banner edits
  useEffect(() => {
    if (index > banners.length - 1) setIndex(0);
  }, [banners.length, index]);

  // Autoplay
  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [paused, banners.length, next]);

  if (banners.length === 0) {
    return (
      <section className="relative flex min-h-[60vh] items-center justify-center border-b border-border bg-muted text-center">
        <p className="text-sm text-muted-foreground">
          No active banners. Add one from the admin Banners panel.
        </p>
      </section>
    );
  }

  const current = banners[index];
  if (!current) return null;

  const alignClass =
    current.align === "center"
      ? "items-center text-center"
      : current.align === "right"
        ? "items-end text-right"
        : "items-start text-left";

  return (
    <section
      className="relative overflow-hidden border-b border-border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Promotional banners"
    >
      <div className="relative min-h-[58vh] md:min-h-[64vh]">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <img
              src={b.image}
              alt={b.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-foreground/20" />
            <div className="relative z-10 flex h-full items-center">
              <div
                className={`mx-auto flex max-w-7xl flex-col gap-6 px-4 py-16 md:px-6 md:py-24 ${alignClass}`}
              >
                <h1 className="max-w-2xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
                  {b.title}
                </h1>
                <p className="max-w-xl text-base text-white/85 md:text-lg">{b.subtitle}</p>
                <div>
                  <BannerCta to={b.ctaLink} label={b.ctaText} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/30 text-white backdrop-blur-md transition-colors hover:bg-background/50 md:left-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/30 text-white backdrop-blur-md transition-colors hover:bg-background/50 md:right-4"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-8 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
