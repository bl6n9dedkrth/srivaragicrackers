import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const rowSchema = z.object({
  product_code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional().default(""),
  price: z.number().nonnegative(),
  image_url: z.string().trim().max(2000).optional().default(""),
  availability: z.boolean(),
});

export type ImportRow = z.infer<typeof rowSchema>;
export type ImportSummary = { added: number; updated: number; skipped: number; errors: string[] };

export const importProductsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ rows: z.array(z.unknown()).min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }): Promise<ImportSummary> => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const summary: ImportSummary = { added: 0, updated: 0, skipped: 0, errors: [] };

    const valid: ImportRow[] = [];
    const seen = new Set<string>();
    data.rows.forEach((raw, index) => {
      const parsed = rowSchema.safeParse(raw);
      if (!parsed.success) {
        summary.skipped += 1;
        summary.errors.push(`Row ${index + 2}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`);
        return;
      }
      if (seen.has(parsed.data.product_code)) {
        summary.skipped += 1;
        summary.errors.push(`Row ${index + 2}: duplicate product_code "${parsed.data.product_code}" in file`);
        return;
      }
      seen.add(parsed.data.product_code);
      valid.push(parsed.data);
    });

    if (!valid.length) return summary;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("products")
      .select("sku")
      .in("sku", valid.map((row) => row.product_code));
    if (existingError) throw new Error(existingError.message);
    const existingCodes = new Set((existing ?? []).map((row) => row.sku));

    for (const row of valid) {
      const slugBase = row.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
      const payload = {
        sku: row.product_code,
        name: row.name,
        category: row.category,
        price: row.price,
        description: row.description ?? "",
        long_description: row.description ?? "",
        available: row.availability,
        image_url: row.image_url ? row.image_url : null,
      };
      if (existingCodes.has(row.product_code)) {
        const { error } = await supabaseAdmin.from("products").update(payload).eq("sku", row.product_code);
        if (error) {
          summary.skipped += 1;
          summary.errors.push(`${row.product_code}: ${error.message}`);
        } else summary.updated += 1;
      } else {
        const { error } = await supabaseAdmin
          .from("products")
          .insert({ ...payload, slug: `${slugBase}-${row.product_code.toLowerCase()}`, image_key: row.image_url ? null : "gift-hamper", sort_order: 999 });
        if (error) {
          summary.skipped += 1;
          summary.errors.push(`${row.product_code}: ${error.message}`);
        } else summary.added += 1;
      }
    }

    return summary;
  });
