import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Flower2, Gift, Lamp } from "lucide-react";
import heroImage from "@/assets/sri-varagi-fireworks-hero.jpg";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productsQueryOptions } from "@/lib/catalogue.functions";
import { toProduct } from "@/lib/products";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sri Varagi Crackers — Premium Deepavali Collection" },
    { name: "description", content: "Discover Sri Varagi Crackers' premium Deepavali catalogue, curated for celebrations filled with light." },
    { property: "og:title", content: "Sri Varagi Crackers — Premium Deepavali Collection" },
    { property: "og:description", content: "Discover a premium Deepavali catalogue curated for celebrations filled with light." },
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
      <section className="hero-glow relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden">
        <img src={heroImage} alt="Champagne-gold fireworks above a temple lake during Deepavali" width={1600} height={1000} fetchPriority="high" className="hero-image absolute inset-0 -z-20 h-full w-full object-cover object-[64%_center]" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-7xl items-end px-5 pb-16 pt-32 sm:items-center sm:px-8 sm:py-24 lg:px-12">
          <div className="hero-content max-w-3xl">
            <p className="eyebrow">The Deepavali collection · 2026</p>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] text-foreground sm:text-7xl lg:text-8xl">Sri Varagi<br className="hidden sm:block" /> Crackers</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-foreground/80 sm:text-lg">A premium celebration of colour, light and tradition—curated to make every Deepavali gathering unforgettable.</p>
            <Button asChild variant="festive" size="lg" className="mt-8"><Link to="/catalogue">Explore products <ArrowRight /></Link></Button>
          </div>
        </div>
        <div className="hero-spark hero-spark-left" aria-hidden="true">✦</div>
        <div className="hero-spark hero-spark-right" aria-hidden="true">✦</div>
      </section>

      <section className="section-wrap section-reveal">
        <div className="section-heading"><div><p className="eyebrow">Curated for celebration</p><h2>Shop by collection</h2></div><p>From the first lamp to the final gift, find details for every festive ritual.</p></div>
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {[{name:"Gifting",copy:"For hosts, families and teams",icon:Gift,className:"lg:col-span-2"},{name:"Diyas",copy:"A warmer kind of welcome",icon:Lamp,className:"lg:col-span-3"},{name:"Décor",copy:"Festive details for home",icon:Flower2,className:"md:col-span-2 lg:col-span-5"}].map((item) => <Link key={item.name} to="/catalogue" search={{ category: item.name.toLowerCase(), q: "" }} className={`collection-tile group ${item.className}`}><item.icon className="text-primary" /><h3 className="mt-10 font-display text-3xl text-card-foreground sm:text-4xl">{item.name}</h3><p className="mt-2 text-sm text-muted-foreground">{item.copy}</p><ArrowRight className="mt-6 text-primary transition-transform duration-300 group-hover:translate-x-1" /></Link>)}
        </div>
      </section>

      <section className="spark-corner border-y border-border bg-surface-deep"><div className="section-wrap section-reveal"><div className="section-heading"><div><p className="eyebrow">The festive shortlist</p><h2>Featured pieces</h2></div><Button asChild variant="outline"><Link to="/catalogue">View all <ArrowRight /></Link></Button></div><div className="mt-10 grid gap-5 md:grid-cols-3">{featured.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section>

      <section className="section-wrap section-reveal grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end"><div><p className="eyebrow">Our story</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">Made for meaningful celebrations.</h2></div><div className="border-l border-primary/40 pl-6 text-base leading-8 text-muted-foreground"><p>Sri Varagi Crackers brings together tradition, colour and considered presentation. Every piece is selected to make the celebration feel generous, memorable and full of light.</p><p className="mt-4">This seasonal catalogue is for browsing and enquiries only.</p></div></section>
    </>
  );
}
