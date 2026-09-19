export const CSV_COLUMNS = ["product_code", "name", "category", "description", "price", "image_url", "availability"] as const;

export const SAMPLE_CSV = `product_code,name,category,description,price,image_url,availability
SVC-101,Royal Gift Hamper,Gifting,Curated festive hamper with sweets and diyas,2450,,TRUE
SVC-102,Lotus Brass Diya Set,Diyas,Set of six hand-finished brass lotus diyas,1150,,TRUE
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

export type ParsedCsv = { rows: Record<string, unknown>[]; errors: string[] };

export function parseProductCsv(text: string): ParsedCsv {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  if (!lines.length) return { rows: [], errors: ["The file is empty."] };
  const header = splitLine(lines[0]!).map((column) => column.toLowerCase());
  const missing = CSV_COLUMNS.filter((column) => column !== "description" && column !== "image_url" && !header.includes(column));
  if (missing.length) return { rows: [], errors: [`Missing required column(s): ${missing.join(", ")}`] };

  const errors: string[] = [];
  const rows: Record<string, unknown>[] = [];
  lines.slice(1).forEach((line, index) => {
    const cells = splitLine(line);
    const record: Record<string, string> = {};
    header.forEach((column, position) => { record[column] = cells[position] ?? ""; });
    const priceValue = Number(record["price"]);
    if (!Number.isFinite(priceValue)) {
      errors.push(`Row ${index + 2}: price "${record["price"]}" is not a number`);
      return;
    }
    const availability = (record["availability"] ?? "").toLowerCase();
    rows.push({
      product_code: record["product_code"] ?? "",
      name: record["name"] ?? "",
      category: record["category"] ?? "",
      description: record["description"] ?? "",
      price: priceValue,
      image_url: record["image_url"] ?? "",
      availability: !["false", "0", "no", "unavailable", "n"].includes(availability),
    });
  });
  return { rows, errors };
}
