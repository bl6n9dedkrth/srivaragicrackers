# Finish the owner bulk CSV import

## What the audit found

Checked the import screen, the CSV reader, the server-side import routine, the database rules, and the catalogue.

Already working correctly, no changes needed:
- Bulk import sits inside the owner dashboard, which is behind sign-in; the server also re-checks that the signed-in account is the owner before importing anything.
- Product codes are unique in the database, so a repeated import updates the existing product instead of creating a duplicate.
- Products not mentioned in the file are left untouched.
- A summary of added / updated / skipped / errors is shown after each import.
- Imported products show up on the customer catalogue after the list refreshes.

Problems that stop the feature being trustworthy:
1. **Wrong line numbers in error messages.** Rows rejected for a bad price are dropped before the rest of the checks, so every later error points at the wrong line of the spreadsheet.
2. **Blank required fields give a confusing message.** A missing name or product code is only caught at the end, phrased in technical terms.
3. **Import can fail with a raw database message.** A new product whose web-address name clashes with an existing one fails with an unhelpful technical error instead of being handled.
4. **Unknown categories silently disappear from filters.** A category that isn't one of Gifting, Diyas, Décor or Fragrance still imports, but the product then appears only under "All" and never under a category tab.
5. **Availability column is too forgiving.** Any unrecognised word (including blank or a typo) is read as "available", so mistakes go unnoticed.
6. **Image links aren't checked**, so a malformed address imports and shows a broken picture.

## What will change

Minimum edits, no design or unrelated changes.

- Carry the real spreadsheet line number through the whole import so every error message names the right row.
- Report each rejected row with a plain message: which row, which column, what's wrong.
- Check the category against the existing four categories (case-insensitive, corrected to the standard spelling); reject anything else with a message listing the allowed values.
- Accept true/false, yes/no, 1/0, available/unavailable for availability; reject anything else instead of assuming available. Blank stays "available" and is documented on screen.
- Reject an image link that isn't a normal http/https web address.
- When a new product's generated web-address name clashes, add a short unique suffix automatically instead of failing.
- Split the summary counters so "skipped" means rejected-by-validation and "errored" means failed while saving, with both counts shown.
- Update the on-screen column guide and the downloadable sample file to state the allowed categories and availability values.

## Technical notes

- `src/lib/csv.ts` — `parseProductCsv` keeps a `line` number per row, no longer drops rows early; all field-level validation messages reference that line. Sample CSV text updated.
- `src/lib/import.functions.ts` — zod schema extended with `line`, category enum coercion, availability already boolean from the parser, `image_url` URL check; error strings use `row.line`; insert path retries the slug with a random suffix on unique-violation (`23505`); `ImportSummary` gains `errored`.
- `src/routes/_authenticated/admin.tsx` — summary block renders the extra counter and the updated column guide text. No other UI change.
- No database migration required: `products_sku_key` unique index and the owner-only RLS policies are already in place, and `importProductsCsv` already gates on `has_role(..., 'owner')`.

## Verification

Run through the owner dashboard with test files: valid file (adds), same file again (updates, no duplicates), file with a bad price / missing name / unknown category / bad availability / bad image link (each rejected with the correct row number), duplicate product_code within one file, and then confirm the imported products appear on the customer catalogue under the right category filter after refresh.
