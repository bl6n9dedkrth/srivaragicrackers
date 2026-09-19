import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) });

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().max(160).optional().default(""),
  address: z.string().trim().min(5).max(500),
  note: z.string().trim().max(500).optional().default(""),
  clientToken: z.string().min(8).max(64),
  items: z.array(itemSchema).min(1).max(100),
});

export type PlacedOrder = {
  id: string;
  reference: string;
  total: number;
  status: string;
  paymentStatus: string;
};

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }): Promise<PlacedOrder> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotency: returning from payment or refreshing must not duplicate the order.
    const existing = await supabaseAdmin
      .from("orders")
      .select("id, reference, total, status, payment_status")
      .eq("client_token", data.clientToken)
      .maybeSingle();
    if (existing.data) {
      return {
        id: existing.data.id,
        reference: existing.data.reference,
        total: Number(existing.data.total),
        status: existing.data.status,
        paymentStatus: existing.data.payment_status,
      };
    }

    const ids = [...new Set(data.items.map((item) => item.productId))];
    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, available")
      .in("id", ids);
    if (productError) throw new Error(productError.message);
    if (!products || products.length !== ids.length) throw new Error("One or more products are no longer available.");

    // Prices/totals always come from the database, never from the browser.
    let total = 0;
    const lines = data.items.map((item) => {
      const product = products.find((entry) => entry.id === item.productId)!;
      if (!product.available) throw new Error(`${product.name} is currently unavailable.`);
      total += Number(product.price) * item.quantity;
      return { product_id: product.id, product_name: product.name, unit_price: Number(product.price), quantity: item.quantity };
    });

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customerName,
        phone: data.phone,
        email: data.email ?? "",
        address: data.address,
        note: data.note ?? "",
        total,
        status: "pending",
        payment_status: "pending",
        payment_method: "pay_on_delivery",
        client_token: data.clientToken,
      })
      .select("id, reference, total, status, payment_status")
      .single();
    if (orderError || !order) throw new Error(orderError?.message ?? "Could not place the order.");

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((line) => ({ ...line, order_id: order.id })));
    if (itemsError) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(itemsError.message);
    }

    return { id: order.id, reference: order.reference, total: Number(order.total), status: order.status, paymentStatus: order.payment_status };
  });

export type OrderSummary = {
  reference: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
};

export const getOrderByReference = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ reference: z.string().trim().min(4).max(40) }).parse(input))
  .handler(async ({ data }): Promise<OrderSummary | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("reference, customer_name, phone, email, address, note, total, status, payment_status, payment_method, created_at, order_items(product_name, quantity, unit_price)")
      .eq("reference", data.reference.toUpperCase())
      .maybeSingle();
    if (!order) return null;
    return {
      reference: order.reference,
      customerName: order.customer_name,
      phone: order.phone,
      email: order.email,
      address: order.address,
      note: order.note,
      total: Number(order.total),
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      items: (order.order_items ?? []).map((item) => ({ name: item.product_name, quantity: item.quantity, unitPrice: Number(item.unit_price) })),
    };
  });
