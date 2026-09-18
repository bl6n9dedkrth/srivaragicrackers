import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";

export function AvailabilityBadge({ available }: { available: boolean }) {
  return <span className={available ? "status-available" : "status-unavailable"}>{available ? "Available" : "Unavailable"}</span>;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card group overflow-hidden rounded-md border border-border bg-card">
      <Link to="/products/$productId" params={{ productId: product.id }} className="block overflow-hidden">
        <img src={product.image} alt={product.name} loading="lazy" width={1024} height={1024} className="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4"><p className="eyebrow">{product.category}</p><AvailabilityBadge available={product.available} /></div>
        <h2 className="mt-3 font-display text-2xl leading-tight text-card-foreground">{product.name}</h2>
        <p className="mt-2 text-lg font-semibold text-primary">{formatPrice(product.price)}</p>
        <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{product.description}</p>
        <Button asChild variant="outline" className="mt-5 w-full justify-between hover:shadow-gold">
          <Link to="/products/$productId" params={{ productId: product.id }}>View product <ArrowUpRight /></Link>
        </Button>
      </div>
    </article>
  );
}
