export const CSV_COLUMNS = ["product_code", "name", "category", "description", "price", "image_url", "availability"] as const;

export const ALLOWED_CATEGORIES = ["Gifting", "Diyas", "Décor", "Fragrance"] as const;
export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

const TRUE_VALUES = ["true", "yes", "1", "y", "available", ""];
const FALSE_VALUES = ["false", "no", "0", "n", "unavailable"];

export const SAMPLE_CSV = `product_code,name,category,description,price,image_url,availability
SVC-101,Royal Gift Hamper,Gifting,Curated festive hamper with sweets and diyas,2450,,TRUE
SVC-102,Lotus Brass Diya Set,Diyas,Set of six hand-finished brass lotus diyas,1150,,TRUE
SVC-103,Champagne Rose Candle,Fragrance,Hand-poured soy candle with rose and amber,890,https://example.com/candle.jpg,FALSE
`;

function splitLine(line: string): string[] {
  const out: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { out.push(value); value = ""; }
    else value += char;
  }
  out.push(value);
  return out.map((entry) => entry.trim());
}

const normaliseCategory = (value: string): AllowedCategory | null => {
  const needle = value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ALLOWED_CATEGORIES.find((category) => category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === needle) ?? null;
};

export type ParsedRow = {
  line: number;
  product_code: string;
  name: string;
  category: AllowedCategory;
  description: string;
  price: number;
  image_url: string;
  availability: boolean;
};

export type ParsedCsv = { rows: ParsedRow[]; errors: string[]; skipped: number };

export function parseProductCsv(text: string): ParsedCsv {
  const rawLines = text.split(/\r?\n/);
  const indexed = rawLines.map((content, index) => ({ content, line: index + 1 })).filter((entry) => entry.content.trim().length);
  if (!indexed.length) return { rows: [], errors: ["The file is empty."], skipped: 0 };

  const headerEntry = indexed[0]!;
  const header = splitLine(headerEntry.content).map((column) => column.toLowerCase());
  const missing = CSV_COLUMNS.filter((column) => column !== "description" && column !== "image_url" && !header.includes(column));
  if (missing.length) return { rows: [], errors: [`Missing required column(s): ${missing.join(", ")}`], skipped: 0 };

  const errors: string[] = [];
  const rows: ParsedRow[] = [];
  let skipped = 0;
  const seen = new Map<string, number>();

  indexed.slice(1).forEach(({ content, line }) => {
    const cells = splitLine(content);
    const record: Record<string, string> = {};
    header.forEach((column, position) => { record[column] = cells[position] ?? ""; });

    const rowErrors: string[] = [];
    const productCode = (record["product_code"] ?? "").trim();
    const name = (record["name"] ?? "").trim();
    const categoryRaw = (record["category"] ?? "").trim();
    const priceRaw = (record["price"] ?? "").trim();
    const imageUrl = (record["image_url"] ?? "").trim();
    const availabilityRaw = (record["availability"] ?? "").trim().toLowerCase();

    if (!productCode) rowErrors.push("product_code is required");
    else if (productCode.length > 64) rowErrors.push("product_code is longer than 64 characters");
    if (!name) rowErrors.push("name is required");
    else if (name.length > 160) rowErrors.push("name is longer than 160 characters");

    const category = normaliseCategory(categoryRaw);
    if (!categoryRaw) rowErrors.push("category is required");
    else if (!category) rowErrors.push(`category "${categoryRaw}" is not one of ${ALLOWED_CATEGORIES.join(", ")}`);

    const price = Number(priceRaw);
    if (!priceRaw) rowErrors.push("price is required");
    else if (!Number.isFinite(price)) rowErrors.push(`price "${priceRaw}" is not a number`);
    else if (price < 0) rowErrors.push("price cannot be negative");

    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) rowErrors.push(`image_url "${imageUrl}" must be a http:// or https:// web address`);

    let availability = true;
    if (TRUE_VALUES.includes(availabilityRaw)) availability = true;
    else if (FALSE_VALUES.includes(availabilityRaw)) availability = false;
    else rowErrors.push(`availability "${availabilityRaw}" must be one of TRUE, FALSE, yes, no, 1, 0`);

    const description = (record["description"] ?? "").trim();
    if (description.length > 500) rowErrors.push("description is longer than 500 characters");

    if (productCode) {
      const firstLine = seen.get(productCode.toLowerCase());
      if (firstLine) rowErrors.push(`duplicate product_code "${productCode}" (already used on row ${firstLine})`);
      else seen.set(productCode.toLowerCase(), line);
    }

    if (rowErrors.length) {
      skipped += 1;
      errors.push(`Row ${line}: ${rowErrors.join("; ")}`);
      return;
    }

    rows.push({ line, product_code: productCode, name, category: category!, description, price, image_url: imageUrl, availability });
  });

  return { rows, errors, skipped };
}
