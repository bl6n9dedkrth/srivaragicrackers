-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('owner');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Bootstrap: the first signed-in account may claim the owner role once.
CREATE OR REPLACE FUNCTION public.claim_owner_role()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'owner') ON CONFLICT DO NOTHING;
  END IF;
  RETURN public.has_role(uid, 'owner');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_owner_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 2. Products: stable import code + owner-only writes
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
UPDATE public.products SET sku = slug WHERE sku IS NULL;
ALTER TABLE public.products ALTER COLUMN sku SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_key ON public.products (sku);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category);

DROP POLICY IF EXISTS "Demo dashboard can insert products" ON public.products;
DROP POLICY IF EXISTS "Demo dashboard can update products" ON public.products;
DROP POLICY IF EXISTS "Demo dashboard can delete products" ON public.products;

CREATE POLICY "Owners can insert products" ON public.products FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update products" ON public.products FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete products" ON public.products FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

-- 3. Orders / enquiries
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL DEFAULT ('SVC-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 6))),
  customer_name text NOT NULL,
  phone text NOT NULL,
  note text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);

GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read orders" ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update orders" ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete orders" ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can read order items" ON public.order_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete order items" ON public.order_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE OR REPLACE FUNCTION public.set_orders_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_orders_updated_at();

-- Public submission path: validated, server-priced, no direct table writes.
CREATE OR REPLACE FUNCTION public.submit_order(
  p_customer_name text, p_phone text, p_note text, p_items jsonb
) RETURNS TABLE (id uuid, reference text, total numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_order public.orders%ROWTYPE;
  item jsonb;
  prod public.products%ROWTYPE;
  qty integer;
  running numeric := 0;
BEGIN
  IF length(trim(coalesce(p_customer_name,''))) < 2 THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  IF length(regexp_replace(coalesce(p_phone,''), '\D', '', 'g')) < 7 THEN RAISE EXCEPTION 'A valid phone number is required'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Select at least one product'; END IF;
  IF jsonb_array_length(p_items) > 100 THEN RAISE EXCEPTION 'Too many items'; END IF;

  INSERT INTO public.orders (customer_name, phone, note)
  VALUES (left(trim(p_customer_name), 120), left(trim(p_phone), 40), left(coalesce(p_note,''), 500))
  RETURNING * INTO new_order;

  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO prod FROM public.products WHERE public.products.id = (item->>'product_id')::uuid;
    IF prod.id IS NULL THEN RAISE EXCEPTION 'Unknown product'; END IF;
    qty := greatest(1, least(999, coalesce((item->>'quantity')::int, 1)));
    INSERT INTO public.order_items (order_id, product_id, product_name, unit_price, quantity)
    VALUES (new_order.id, prod.id, prod.name, prod.price, qty);
    running := running + (prod.price * qty);
  END LOOP;

  UPDATE public.orders SET total = running WHERE public.orders.id = new_order.id;
  RETURN QUERY SELECT new_order.id, new_order.reference, running;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_order(text, text, text, jsonb) TO anon, authenticated;

-- Bulk import helper: upsert by sku, never duplicating existing rows.
CREATE OR REPLACE FUNCTION public.import_products(p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; n integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'Not authorised'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO public.products (sku, slug, name, category, price, description, long_description, available, image_url, sort_order)
    VALUES (
      r->>'sku',
      coalesce(r->>'slug', r->>'sku'),
      r->>'name',
      coalesce(r->>'category', 'Gifting'),
      coalesce((r->>'price')::numeric, 0),
      coalesce(r->>'description', ''),
      coalesce(r->>'long_description', coalesce(r->>'description','')),
      coalesce((r->>'available')::boolean, true),
      r->>'image_url',
      coalesce((r->>'sort_order')::int, 999)
    )
    ON CONFLICT (sku) DO UPDATE SET
      name = excluded.name, category = excluded.category, price = excluded.price,
      description = excluded.description, long_description = excluded.long_description,
      available = excluded.available,
      image_url = coalesce(excluded.image_url, public.products.image_url),
      sort_order = excluded.sort_order;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_products(jsonb) TO authenticated;