import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, ImagePlus, LayoutGrid, LogOut, PackageCheck, Pencil, Plus, ShoppingBag, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { listProducts } from "@/lib/catalogue.functions";
import { importProductsCsv, type ImportSummary } from "@/lib/import.functions";
import { parseProductCsv, SAMPLE_CSV } from "@/lib/csv";
import { formatPrice, toProduct } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Owner Dashboard — Sri Varagi Crackers" }, { name: "description", content: "Manage the Sri Varagi Crackers product catalogue and orders." },
    { property: "og:title", content: "Owner Dashboard — Sri Varagi Crackers" }, { property: "og:description", content: "Manage the Sri Varagi Crackers product catalogue and orders." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: AdminPage,
});

const emptyProduct = { name: "", category: "Gifting", price: 0, description: "", available: true };
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
const ORDER_STATUSES = ["pending", "confirmed", "processing", "ready", "completed", "cancelled"] as const;
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

type Editing = { rowId: string; id: string; name: string; category: string; price: number; description: string; available: boolean; image: string };
type OrderRow = {
  id: string; reference: string; customer_name: string; phone: string; email: string; address: string; note: string;
  total: number; status: string; payment_status: string; created_at: string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
};

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"products" | "import" | "orders">("products");
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("claim_owner_role");
      setIsOwner(Boolean(data));
    })();
  }, []);

  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    enabled: isOwner === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, customer_name, phone, email, address, note, total, status, payment_status, created_at, order_items(id, product_name, quantity, unit_price)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const items: Editing[] = (productsQuery.data ?? []).map(toProduct);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyProduct);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openOrder, setOpenOrder] = useState<OrderRow | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["products"] });
  const openEdit = (product: Editing) => { setEditing(product); setDraft({ name: product.name, category: product.category, price: product.price, description: product.description, available: product.available }); setPreview(product.image); };
  const openAdd = () => { setAdding(true); setDraft(emptyProduct); setPreview(""); };
  const close = () => { setEditing(null); setAdding(false); setPreview(""); setError(""); };
  const isDataImage = preview.startsWith("data:");

  const save = async () => {
    if (!draft.name.trim() || busy) return;
    setBusy(true); setError("");
    const result = editing
      ? await supabase.from("products").update({
          name: draft.name, category: draft.category, price: draft.price, description: draft.description,
          long_description: draft.description, available: draft.available,
          ...(isDataImage ? { image_url: preview } : {}),
        }).eq("id", editing.rowId)
      : await supabase.from("products").insert({
          sku: `SVC-${Date.now().toString(36).toUpperCase()}`,
          slug: `${slugify(draft.name)}-${Date.now().toString(36)}`,
          name: draft.name, category: draft.category, price: draft.price, description: draft.description,
          long_description: draft.description, available: draft.available,
          image_url: isDataImage ? preview : null, image_key: isDataImage ? null : "gift-hamper", sort_order: 999,
        });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    await refresh();
    close();
  };

  const toggleAvailable = async (product: Editing, checked: boolean) => { await supabase.from("products").update({ available: checked }).eq("id", product.rowId); await refresh(); };
  const remove = async (product: Editing) => { await supabase.from("products").delete().eq("id", product.rowId); await refresh(); };
  const handleFile = (file?: File) => { if (file) { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" && setPreview(reader.result); reader.readAsDataURL(file); } };

  const handleCsv = async (file?: File) => {
    if (!file) return;
    setImporting(true); setSummary(null);
    const parsed = parseProductCsv(await file.text());
    if (!parsed.rows.length) { setSummary({ added: 0, updated: 0, skipped: 0, errors: parsed.errors.length ? parsed.errors : ["No valid rows found."] }); setImporting(false); return; }
    try {
      const result = await importProductsCsv({ data: { rows: parsed.rows } });
      setSummary({ ...result, errors: [...parsed.errors, ...result.errors] });
      await refresh();
    } catch (importError) {
      setSummary({ added: 0, updated: 0, skipped: parsed.rows.length, errors: [(importError as Error).message] });
    }
    setImporting(false);
    if (csvRef.current) csvRef.current.value = "";
  };

  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = "sri-varagi-products-sample.csv"; link.click();
    URL.revokeObjectURL(url);
  };

  const updateOrder = async (id: string, patch: { status?: string; payment_status?: string }) => {
    await supabase.from("orders").update(patch).eq("id", id);
    await ordersQuery.refetch();
    setOpenOrder((current) => (current && current.id === id ? { ...current, ...patch } as OrderRow : current));
  };

  const signOut = async () => { await supabase.auth.signOut(); void navigate({ to: "/" }); };

  const orders = (ordersQuery.data ?? []).filter((order) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const needle = orderQuery.trim().toLowerCase();
    const matchesQuery = !needle || order.reference.toLowerCase().includes(needle) || order.customer_name.toLowerCase().includes(needle) || order.phone.includes(needle);
    return matchesStatus && matchesQuery;
  });

  if (isOwner === false) {
    return <div className="section-wrap py-24 text-center"><h1 className="font-display text-4xl text-primary">Owner access only</h1><p className="mt-3 text-sm text-muted-foreground">This account is not the registered owner of this store.</p><Button variant="outline" className="mt-6" onClick={() => void signOut()}>Sign out</Button></div>;
  }

  return <div className="section-wrap page-enter pt-12 sm:pt-16">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0"><p className="eyebrow">Owner area</p><h1 className="mt-3 truncate font-display text-4xl text-primary sm:text-6xl">Dashboard</h1><p className="mt-3 text-sm text-muted-foreground">Manage products, imports and customer orders.</p></div>
      <Button variant="outline" onClick={() => void signOut()}><LogOut /> <span className="hidden sm:inline">Sign out</span></Button>
    </div>

    <div className="mt-8 flex gap-2 overflow-x-auto border-b border-border pb-3">
      {([["products","Products"],["import","Bulk import"],["orders","Orders"]] as const).map(([value, label]) => (
        <Button key={value} size="sm" variant={tab === value ? "default" : "ghost"} onClick={() => setTab(value)}>{label}</Button>
      ))}
    </div>

    {tab === "products" && <>
      <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Overview">
        <div className="metric"><LayoutGrid /><span>Total products</span><strong>{items.length}</strong></div>
        <div className="metric"><PackageCheck /><span>Available</span><strong>{items.filter((item) => item.available).length}</strong></div>
        <div className="metric"><ShoppingBag /><span>Orders</span><strong>{ordersQuery.data?.length ?? 0}</strong></div>
      </section>
      <section className="mt-10">
        <div className="flex items-center justify-between border-b border-border pb-4"><h2 className="font-display text-3xl">Products</h2><Button variant="festive" onClick={openAdd}><Plus /> <span className="hidden sm:inline">Add product</span></Button></div>
        <div className="divide-y divide-border">{items.map((product) => <article key={product.rowId} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:grid-cols-[5rem_minmax(0,1fr)_8rem_auto]">
          <img src={product.image} alt="" className="aspect-square w-full rounded-sm object-cover" />
          <div className="min-w-0"><h3 className="truncate font-semibold">{product.name}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{product.category} · {formatPrice(product.price)}</p></div>
          <label className="hidden items-center justify-end gap-2 text-xs text-muted-foreground sm:flex"><Switch checked={product.available} onCheckedChange={(checked) => void toggleAvailable(product, checked)} aria-label={`Set ${product.name} availability`} />{product.available ? "Available" : "Hidden"}</label>
          <div className="flex"><Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label={`Edit ${product.name}`}><Pencil /></Button><Button variant="ghost" size="icon" onClick={() => void remove(product)} aria-label={`Delete ${product.name}`} className="text-destructive"><Trash2 /></Button></div>
        </article>)}</div>
      </section>
    </>}

    {tab === "import" && <section className="mt-8 max-w-3xl">
      <h2 className="font-display text-3xl">Bulk import products</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Upload a CSV with the columns below. Rows with an existing <strong>product_code</strong> update that product; new codes create a product. Products missing from the file are left untouched.</p>
      <div className="mt-5 overflow-x-auto rounded-md border border-border bg-card p-4 text-xs"><code className="whitespace-pre text-muted-foreground">product_code,name,category,description,price,image_url,availability</code></div>
      <div className="mt-5 flex flex-wrap gap-3">
        <input ref={csvRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void handleCsv(e.target.files?.[0])} />
        <Button variant="festive" onClick={() => csvRef.current?.click()} disabled={importing}><Upload /> {importing ? "Importing…" : "Upload CSV"}</Button>
        <Button variant="outline" onClick={downloadSample}><Download /> Sample CSV</Button>
      </div>
      {summary && <div className="mt-6 rounded-md border border-border bg-card p-5" role="status">
        <h3 className="font-display text-2xl text-primary">Import summary</h3>
        <ul className="mt-3 grid gap-1 text-sm text-muted-foreground"><li>Added: <strong className="text-foreground">{summary.added}</strong></li><li>Updated: <strong className="text-foreground">{summary.updated}</strong></li><li>Skipped: <strong className="text-foreground">{summary.skipped}</strong></li><li>Errors: <strong className="text-foreground">{summary.errors.length}</strong></li></ul>
        {summary.errors.length > 0 && <ul className="mt-4 grid gap-1 text-xs text-destructive">{summary.errors.slice(0, 20).map((message) => <li key={message}>{message}</li>)}</ul>}
      </div>}
    </section>}

    {tab === "orders" && <section className="mt-8">
      <h2 className="font-display text-3xl">Orders</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Input value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)} placeholder="Search order ID, name or phone" />
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="all">All statuses</option>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select>
      </div>
      {ordersQuery.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading orders…</p> : orders.length === 0 ? <p className="mt-8 text-sm text-muted-foreground">No orders yet.</p> : <div className="mt-6 divide-y divide-border border-y border-border">
        {orders.map((order) => <article key={order.id} className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="font-semibold text-primary">{order.reference}</p>
            <p className="mt-1 truncate text-sm">{order.customer_name} · {order.phone}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("en-IN")} · {order.order_items.length} item(s) · {formatPrice(Number(order.total))} · payment {order.payment_status}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="form-select w-36" value={order.status} onChange={(e) => void updateOrder(order.id, { status: e.target.value })} aria-label={`Status for ${order.reference}`}>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select>
            <Button variant="outline" size="sm" onClick={() => setOpenOrder(order)}>View</Button>
          </div>
        </article>)}
      </div>}
    </section>}

    <Dialog open={Boolean(openOrder)} onOpenChange={(open) => !open && setOpenOrder(null)}><DialogContent className="max-h-[90svh] overflow-y-auto">
      <DialogHeader><DialogTitle>Order {openOrder?.reference}</DialogTitle><DialogDescription>Customer details and purchased items.</DialogDescription></DialogHeader>
      {openOrder && <div className="grid gap-4 text-sm">
        <div><p className="eyebrow">Customer</p><p className="mt-2 font-semibold">{openOrder.customer_name}</p><p className="text-muted-foreground">{openOrder.phone}{openOrder.email ? ` · ${openOrder.email}` : ""}</p><p className="mt-1 text-muted-foreground">{openOrder.address}</p>{openOrder.note && <p className="mt-2 text-muted-foreground">Note: {openOrder.note}</p>}</div>
        <div><p className="eyebrow">Items</p><ul className="mt-2 grid gap-2">{openOrder.order_items.map((item) => <li key={item.id} className="flex justify-between gap-4"><span className="min-w-0 truncate">{item.product_name} × {item.quantity}</span><span>{formatPrice(Number(item.unit_price) * item.quantity)}</span></li>)}</ul><div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold"><span>Total</span><span className="text-primary">{formatPrice(Number(openOrder.total))}</span></div></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="field-label">Order status<select className="form-select" value={openOrder.status} onChange={(e) => void updateOrder(openOrder.id, { status: e.target.value })}>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="field-label">Payment status<select className="form-select" value={openOrder.payment_status} onChange={(e) => void updateOrder(openOrder.id, { payment_status: e.target.value })}>{PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
        </div>
      </div>}
      <DialogFooter><Button variant="outline" onClick={() => setOpenOrder(null)}>Close</Button></DialogFooter>
    </DialogContent></Dialog>

    <Dialog open={adding || Boolean(editing)} onOpenChange={(open) => !open && close()}><DialogContent className="max-h-[90svh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>Saved changes appear on the public catalogue.</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-2">
        <label className="field-label">Product image<input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} /><button type="button" className="image-upload" onClick={() => fileRef.current?.click()}>{preview ? <img src={preview} alt="Product preview" /> : <><ImagePlus /><span>Choose image</span></>}</button></label>
        <label className="field-label">Product name<Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Product name" /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="field-label">Category<select className="form-select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{["Gifting","Diyas","Décor","Fragrance"].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="field-label">Price<Input type="number" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></label>
        </div>
        <label className="field-label">Short description<Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
        <label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">Available <Switch checked={draft.available} onCheckedChange={(checked) => setDraft({ ...draft, available: checked })} /></label>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
      <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button variant="festive" onClick={() => void save()} disabled={busy}>Save product</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
