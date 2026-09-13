CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  long_description TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  image_key TEXT,
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Demo dashboard can insert products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Demo dashboard can update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Demo dashboard can delete products" ON public.products FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_products_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_products_updated_at();

INSERT INTO public.products (slug, name, category, price, description, long_description, available, image_key, featured, sort_order) VALUES
('royal-celebration-hamper','Royal Celebration Hamper','Gifting',2499,'A keepsake box of festive mithai and a handcrafted diya.','A considered festive gift presented in an ornate keepsake box. It pairs a curated assortment of traditional mithai with a handcrafted brass diya for a celebration that feels generous and personal.',true,'gift-hamper',true,1),
('lotus-diya-set','Lotus Diya Set','Diyas',899,'Three polished brass lamps centred around a lotus silhouette.','A luminous trio of polished brass diyas, anchored by a sculptural lotus lamp. Designed to bring a warm, ceremonial glow to entrances, pooja spaces and festive tables.',true,'lotus-diyas',true,2),
('heritage-rangoli-kit','Heritage Rangoli Kit','Décor',749,'Rich festive colours with a detailed reusable centrepiece.','Create a vivid welcome with jewel-toned rangoli colours, fine applicators and a detailed reusable centrepiece, all arranged in a presentation box made for festive gifting.',true,'rangoli-kit',true,3),
('evening-bloom-candles','Evening Bloom Candle Trio','Fragrance',1199,'Three floral fragrances poured into jewel-toned glass.','A trio of slow-burning festive candles with notes of tuberose, sandalwood and rose. Each candle is poured into a richly coloured glass vessel finished with delicate gold botanical detailing.',true,'candle-trio',false,4),
('heirloom-dry-fruit-box','Heirloom Dry Fruit Box','Gifting',1799,'Premium nuts and dates in a carved wooden keepsake box.','An abundant selection of pistachios, almonds, cashews and dates presented in a hand-finished wooden keepsake box with brass-toned compartments.',true,'dry-fruit-box',false,5),
('marigold-toran','Marigold Bell Toran','Décor',649,'Textile marigolds, festive beadwork and antiqued bells.','A richly layered doorway toran crafted from textile marigolds, deep crimson accents, gold beadwork and softly chiming antiqued bells.',false,'festive-toran',false,6);