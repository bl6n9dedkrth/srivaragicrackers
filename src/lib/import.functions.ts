import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED_CATEGORIES = ["Gifting", "Diyas", "Décor", "Fragrance"] as const;

const rowSchema = z.object({
  line: z.number().int().positive().optional().default(0),
  product_code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  category: z.enum(ALLOWED_CATEGORIES),
  description: z.string().trim().max(500).optional().default(""),
  price: z.number().nonnegative(),
  image_url: z.string().trim().max(2000).optional().default(""),
  availability: z.boolean(),
});

export type ImportRow = z.infer<typeof rowSchema>;
export type ImportSummary = { added: number; updated: number; skipped: number; errored: number; errors: string[] };

const slugify = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";

export const importProductsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ rows: z.array(z.unknown()).min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }): Promise<ImportSummary> => {
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const summary: ImportSummary = { added: 0, updated: 0, skipped: 0, errored: 0, errors: [] };

    const valid: ImportRow[] = [];
    const seen = new Set<string>();
    data.rows.forEach((raw, index) => {
      const parsed = rowSchema.safeParse(raw);
      const line = (raw as { line?: number } | null)?.line ?? index + 2;
      if (!parsed.success) {
        summary.skipped += 1;
        summary.errors.push(`Row ${line}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`);
        return;
      }
      const key = parsed.data.product_code.toLowerCase();
      if (seen.has(key)) {
        summary.skipped += 1;
        summary.errors.push(`Row ${line}: duplicate product_code "${parsed.data.product_code}" in file`);
        return;
      }
      seen.add(key);
      valid.push({ ...parsed.data, line });
    });

    if (!valid.length) return summary;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("products")
      .select("sku")
      .in("sku", valid.map((row) => row.product_code));
    if (existingError) throw new Error(existingError.message);
    const existingCodes = new Set((existing ?? []).map((row) => row.sku));

    for (const row of valid) {
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
          summary.errored += 1;
          summary.errors.push(`Row ${row.line} (${row.product_code}): ${error.message}`);
        } else summary.updated += 1;
        continue;
      }

      const baseSlug = `${slugify(row.name)}-${slugify(row.product_code)}`;
      let inserted = false;
      let lastMessage = "";
      for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
        const { error } = await supabaseAdmin
          .from("products")
          .insert({ ...payload, slug, image_key: row.image_url ? null : "gift-hamper", sort_order: 999 });
        if (!error) { inserted = true; break; }
        lastMessage = error.message;
        if (error.code !== "23505" || !error.message.includes("slug")) break;
      }
      if (inserted) summary.added += 1;
      else {
        summary.errored += 1;
        summary.errors.push(`Row ${row.line} (${row.product_code}): ${lastMessage}`);
      }
    }

    return summary;
  });
