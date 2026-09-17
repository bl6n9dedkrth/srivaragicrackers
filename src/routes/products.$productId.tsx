import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AvailabilityBadge } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { productsQueryOptions } from "@/lib/catalogue.functions";
import { formatPrice, toProduct } from "@/lib/products";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({ meta: [
    { title: "Product Details — Sri Varagi Crackers" }, { name: "description", content: "View details from the Sri Varagi Crackers Deepavali collection." },
    { property: "og:title", content: "Product Details — Sri Varagi Crackers" }, { property: "og:description", content: "View details from the Sri Varagi Crackers Deepavali collection." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  errorComponent: ({ error }) => <div className="section-wrap py-24 text-center" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="section-wrap py-24 text-center">Product not found.</div>,
  component: ProductDetails,
});
function ProductDetails() {
  const { productId } = Route.useParams();
  const { data: rows } = useSuspenseQuery(productsQueryOptions);
  const product = rows.map(toProduct).find((item) => item.id === productId);
  if (!product) return <div className="section-wrap text-center"><h1 className="font-display text-5xl">Product not found</h1><Button asChild variant="outline" className="mt-8"><Link to="/catalogue">Back to catalogue</Link></Button></div>;
  return <div className="section-wrap detail-enter pt-10 sm:pt-16"><Button asChild variant="ghost" className="mb-8 -ml-3"><Link to="/catalogue"><ArrowLeft /> Back to catalogue</Link></Button><article className="grid gap-8 lg:grid-cols-2 lg:gap-16"><div className="image-frame overflow-hidden rounded-md border border-border"><img src={product.image} alt={product.name} width={1024} height={1024} className="aspect-square w-full object-cover" /></div><div className="flex flex-col justify-center"><div className="flex items-center justify-between gap-4"><p className="eyebrow">{product.category}</p><AvailabilityBadge available={product.available} /></div><h1 className="mt-5 font-display text-5xl leading-tight text-primary sm:text-6xl">{product.name}</h1><p className="mt-4 text-2xl font-semibold text-primary">{formatPrice(product.price)}</p><div className="my-8 h-px bg-border" /><p className="text-base leading-8 text-muted-foreground">{product.longDescription}</p><dl className="mt-10 grid grid-cols-2 gap-5 border-y border-border py-6 text-sm"><div><dt className="text-muted-foreground">Category</dt><dd className="mt-1 font-semibold">{product.category}</dd></div><div><dt className="text-muted-foreground">Availability</dt><dd className="mt-1 font-semibold">{product.available ? "In season" : "Currently unavailable"}</dd></div></dl><p className="mt-6 text-xs leading-5 text-muted-foreground">Catalogue display only. Contact the business directly for product enquiries.</p></div></article></div>;
}