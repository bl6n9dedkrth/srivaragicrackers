import giftHamper from "@/assets/gift-hamper.jpg";
import lotusDiyas from "@/assets/lotus-diyas.jpg";
import rangoliKit from "@/assets/rangoli-kit.jpg";
import candleTrio from "@/assets/candle-trio.jpg";
import dryFruitBox from "@/assets/dry-fruit-box.jpg";
import festiveToran from "@/assets/festive-toran.jpg";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  longDescription: string;
  available: boolean;
  image: string;
  featured?: boolean;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  description: string;
  long_description: string;
  available: boolean;
  image_key: string | null;
  image_url: string | null;
  featured: boolean;
  sort_order: number;
};

export const imageLibrary: Record<string, string> = {
  "gift-hamper": giftHamper,
  "lotus-diyas": lotusDiyas,
  "rangoli-kit": rangoliKit,
  "candle-trio": candleTrio,
  "dry-fruit-box": dryFruitBox,
  "festive-toran": festiveToran,
};

export const fallbackImage = giftHamper;

export function toProduct(row: ProductRow): Product & { rowId: string } {
  return {
    rowId: row.id,
    id: row.slug,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    description: row.description,
    longDescription: row.long_description || row.description,
    available: row.available,
    featured: row.featured,
    image: row.image_url || (row.image_key ? imageLibrary[row.image_key] ?? fallbackImage : fallbackImage),
  };
}

export const categories = ["All", "Gifting", "Diyas", "Décor", "Fragrance"];
export const formatPrice = (price: number) => `₹${price.toLocaleString("en-IN")}`;
