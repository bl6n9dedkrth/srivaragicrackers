import { createFileRoute } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productsQueryOptions } from "@/lib/catalogue.functions";
import { categories, toProduct } from "@/lib/products";

const searchSchema = z.object({ category: z.string().catch("all"), q: z.string().catch("") });
export const Route = createFileRoute("/catalogue")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Diwali Product Catalogue — Shubh Utsav" },
    { name: "description", content: "Browse premium Diwali gifts, diyas, festive décor and home fragrances." },
    { property: "og:title", content: "Diwali Product Catalogue — Shubh Utsav" },
    { property: "og:description", content: "Browse premium Diwali gifts, diyas, festive décor and home fragrances." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  errorComponent: ({ error }) => <div className="section-wrap py-24 text-center" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="section-wrap py-24 text-center">Catalogue not found.</div>,
  component: CataloguePage,
});

function CataloguePage() {
  const { category, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const filtered = products.filter((p) => (category === "all" || p.category.toLowerCase() === category) && p.name.toLowerCase().includes(q.toLowerCase()));
  return <div className="section-wrap pt-14 sm:pt-20">
    <div className="max-w-3xl"><p className="eyebrow">Diwali 2026</p><h1 className="mt-4 font-display text-5xl sm:text-7xl">The festive catalogue</h1><p className="mt-5 text-muted-foreground">Objects to gift, gather around and glow beside.</p></div>
    <div className="mt-10 grid gap-4 border-y border-border py-5 lg:grid-cols-[1fr_22rem] lg:items-center">
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Product categories">{categories.map((item) => { const value = item.toLowerCase(); const active = category === value; return <Button key={item} variant={active ? "default" : "ghost"} size="sm" onClick={() => navigate({ search: (prev) => ({...prev, category:value}) })}>{item}</Button>; })}</div>
      <label className="relative block"><span className="sr-only">Search products</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => navigate({ search: (prev) => ({...prev, q:e.target.value}), replace:true })} placeholder="Search the collection" className="h-11 pl-10 pr-10" />{q && <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-9" onClick={() => navigate({ search: (prev) => ({...prev, q:""}) })} aria-label="Clear search"><X /></Button>}</label>
    </div>
    <p className="mt-8 text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</p>
    {filtered.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="my-20 border-y border-border py-16 text-center"><h2 className="font-display text-3xl">Nothing matched your search.</h2><Button variant="link" onClick={() => navigate({ search:{category:"all",q:""} })}>Clear all filters</Button></div>}
  </div>;
}
