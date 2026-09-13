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

export const products: Product[] = [
  {
    id: "royal-celebration-hamper",
    name: "Royal Celebration Hamper",
    category: "Gifting",
    price: 2499,
    description: "A keepsake box of festive mithai and a handcrafted diya.",
    longDescription: "A considered festive gift presented in an ornate keepsake box. It pairs a curated assortment of traditional mithai with a handcrafted brass diya for a celebration that feels generous and personal.",
    available: true,
    image: giftHamper,
    featured: true,
  },
  {
    id: "lotus-diya-set",
    name: "Lotus Diya Set",
    category: "Diyas",
    price: 899,
    description: "Three polished brass lamps centred around a lotus silhouette.",
    longDescription: "A luminous trio of polished brass diyas, anchored by a sculptural lotus lamp. Designed to bring a warm, ceremonial glow to entrances, pooja spaces and festive tables.",
    available: true,
    image: lotusDiyas,
    featured: true,
  },
  {
    id: "heritage-rangoli-kit",
    name: "Heritage Rangoli Kit",
    category: "Décor",
    price: 749,
    description: "Rich festive colours with a detailed reusable centrepiece.",
    longDescription: "Create a vivid welcome with jewel-toned rangoli colours, fine applicators and a detailed reusable centrepiece, all arranged in a presentation box made for festive gifting.",
    available: true,
    image: rangoliKit,
    featured: true,
  },
  {
    id: "evening-bloom-candles",
    name: "Evening Bloom Candle Trio",
    category: "Fragrance",
    price: 1199,
    description: "Three floral fragrances poured into jewel-toned glass.",
    longDescription: "A trio of slow-burning festive candles with notes of tuberose, sandalwood and rose. Each candle is poured into a richly coloured glass vessel finished with delicate gold botanical detailing.",
    available: true,
    image: candleTrio,
  },
  {
    id: "heirloom-dry-fruit-box",
    name: "Heirloom Dry Fruit Box",
    category: "Gifting",
    price: 1799,
    description: "Premium nuts and dates in a carved wooden keepsake box.",
    longDescription: "An abundant selection of pistachios, almonds, cashews and dates presented in a hand-finished wooden keepsake box with brass-toned compartments.",
    available: true,
    image: dryFruitBox,
  },
  {
    id: "marigold-toran",
    name: "Marigold Bell Toran",
    category: "Décor",
    price: 649,
    description: "Textile marigolds, festive beadwork and antiqued bells.",
    longDescription: "A richly layered doorway toran crafted from textile marigolds, deep crimson accents, gold beadwork and softly chiming antiqued bells.",
    available: false,
    image: festiveToran,
  },
];

export const categories = ["All", "Gifting", "Diyas", "Décor", "Fragrance"];
export const formatPrice = (price: number) => `₹${price.toLocaleString("en-IN")}`;
