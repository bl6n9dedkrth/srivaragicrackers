import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Flower2, Gift, Lamp } from "lucide-react";
import heroImage from "@/assets/diwali-hero.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productsQueryOptions } from "@/lib/catalogue.functions";
import { toProduct } from "@/lib/products";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Shubh Utsav — A Diwali Collection" },
    { name: "description", content: "Discover thoughtfully curated Diwali gifts, diyas, décor and fragrances." },
    { property: "og:title", content: "Shubh Utsav — A Diwali Collection" },
    { property: "og:description", content: "Discover thoughtfully curated Diwali gifts, diyas, décor and fragrances." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  errorComponent: ({ error }) => <div className="section-wrap py-24 text-center" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="section-wrap py-24 text-center">Page not found.</div>,
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  const { data: rows } = useSuspenseQuery(productsQueryOptions);
  const all = rows.map(toProduct);
  const featured = all.filter((product) => product.featured).slice(0, 3);
  return (
    <>
      <section className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden">
        <img src={heroImage} alt="Diwali gifts, brass diyas and marigolds arranged for the festival" width={1536} height={900} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-[68%_center]" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-7xl items-end px-5 pb-16 pt-32 sm:items-center sm:px-8 sm:py-24 lg:px-12">
          <div className="max-w-2xl">
            <p className="eyebrow">The Diwali edit · 2026</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] text-foreground sm:text-7xl lg:text-8xl">A season, beautifully illuminated.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-foreground/75 sm:text-lg">Thoughtful gifts and festive details, selected to bring warmth to every gathering.</p>
            <Button asChild variant="festive" size="lg" className="mt-8"><Link to="/catalogue">Explore products <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading"><div><p className="eyebrow">Curated for celebration</p><h2>Shop by collection</h2></div><p>From the first lamp to the final gift, find details for every festive ritual.</p></div>
        <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
          {[{name:"Gifting",copy:"For hosts, families and teams",icon:Gift},{name:"Diyas",copy:"A warmer kind of welcome",icon:Lamp},{name:"Décor",copy:"Festive details for home",icon:Flower2}].map((item) => <Link key={item.name} to="/catalogue" search={{ category: item.name.toLowerCase(), q: "" }} className="group bg-card p-7 transition hover:bg-accent"><item.icon className="text-primary" /><h3 className="mt-10 font-display text-3xl">{item.name}</h3><p className="mt-2 text-sm text-muted-foreground">{item.copy}</p><ArrowRight className="mt-6 transition group-hover:translate-x-1" /></Link>)}
        </div>
      </section>

      <section className="border-y border-border bg-surface-deep"><div className="section-wrap"><div className="section-heading"><div><p className="eyebrow">The festive shortlist</p><h2>Featured pieces</h2></div><Button asChild variant="outline"><Link to="/catalogue">View all <ArrowRight /></Link></Button></div><div className="mt-10 grid gap-5 md:grid-cols-3">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section>

      <section className="section-wrap grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end"><div><p className="eyebrow">Our story</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">Made for meaningful celebrations.</h2></div><div className="border-l border-primary/40 pl-6 text-base leading-8 text-muted-foreground"><p>Shubh Utsav brings together craft, tradition and considered presentation. Every piece is chosen to feel generous without being excessive—objects that belong in the celebration and remain long after it.</p><p className="mt-4">This seasonal catalogue is for browsing and enquiries only.</p></div></section>
    </>
  );
}
