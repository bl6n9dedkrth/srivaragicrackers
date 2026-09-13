import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, LayoutGrid, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { productsQueryOptions } from "@/lib/catalogue.functions";
import { formatPrice, toProduct } from "@/lib/products";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Owner Dashboard — Shubh Utsav" }, { name: "description", content: "Frontend demonstration of the Shubh Utsav product dashboard." },
    { property: "og:title", content: "Owner Dashboard — Shubh Utsav" }, { property: "og:description", content: "Frontend demonstration of the Shubh Utsav product dashboard." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ]}),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions),
  errorComponent: ({ error }) => <div className="section-wrap py-24 text-center" role="alert">{error.message}</div>,
  notFoundComponent: () => <div className="section-wrap py-24 text-center">Dashboard not found.</div>,
  component: AdminPage,
});

const emptyProduct = { name: "", category: "Gifting", price: 0, description: "", available: true };
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";

type Editing = { rowId: string; id: string; name: string; category: string; price: number; description: string; available: boolean; image: string };

function AdminPage() {
  const { data: rows } = useSuspenseQuery(productsQueryOptions);
  const queryClient = useQueryClient();
  const items: Editing[] = rows.map(toProduct);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyProduct);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["products"] });
  const openEdit = (product: Editing) => { setEditing(product); setDraft({ name: product.name, category: product.category, price: product.price, description: product.description, available: product.available }); setPreview(product.image); };
  const openAdd = () => { setAdding(true); setDraft(emptyProduct); setPreview(""); };
  const close = () => { setEditing(null); setAdding(false); setPreview(""); };
  const isDataImage = preview.startsWith("data:");
  const save = async () => {
    if (!draft.name.trim() || busy) return;
    setBusy(true);
    if (editing) {
      await supabase.from("products").update({
        name: draft.name, category: draft.category, price: draft.price, description: draft.description,
        long_description: draft.description, available: draft.available,
        ...(isDataImage ? { image_url: preview } : {}),
      }).eq("id", editing.rowId);
    } else {
      await supabase.from("products").insert({
        slug: `${slugify(draft.name)}-${Date.now().toString(36)}`,
        name: draft.name, category: draft.category, price: draft.price, description: draft.description,
        long_description: draft.description, available: draft.available,
        image_url: isDataImage ? preview : null, image_key: isDataImage ? null : "gift-hamper", sort_order: 999,
      });
    }
    await refresh();
    setBusy(false);
    close();
  };
  const toggleAvailable = async (product: Editing, checked: boolean) => { await supabase.from("products").update({ available: checked }).eq("id", product.rowId); await refresh(); };
  const remove = async (product: Editing) => { await supabase.from("products").delete().eq("id", product.rowId); await refresh(); };
  const handleFile = (file?: File) => { if (file) { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" && setPreview(reader.result); reader.readAsDataURL(file); } };
  const availableCount = items.filter((item) => item.available).length;
  return <div className="section-wrap pt-12 sm:pt-16">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4"><div className="min-w-0"><p className="eyebrow">Owner area · Demo</p><h1 className="mt-3 truncate font-display text-4xl sm:text-6xl">Product dashboard</h1><p className="mt-3 text-sm text-muted-foreground">Changes here update the public catalogue.</p></div><Button variant="festive" onClick={openAdd}><Plus /> <span className="hidden sm:inline">Add product</span></Button></div>
    <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Overview"><div className="metric"><LayoutGrid /><span>Total products</span><strong>{items.length}</strong></div><div className="metric"><PackageCheck /><span>Available</span><strong>{availableCount}</strong></div><div className="metric"><ImagePlus /><span>Categories</span><strong>{new Set(items.map((p) => p.category)).size}</strong></div></section>
    <section className="mt-10"><div className="border-b border-border pb-4"><h2 className="font-display text-3xl">Products</h2></div><div className="divide-y divide-border">{items.map((product) => <article key={product.rowId} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-5 sm:grid-cols-[5rem_minmax(0,1fr)_8rem_auto]"><img src={product.image} alt="" className="aspect-square w-full rounded-sm object-cover" /><div className="min-w-0"><h3 className="truncate font-semibold">{product.name}</h3><p className="mt-1 truncate text-xs text-muted-foreground">{product.category} · {formatPrice(product.price)}</p></div><label className="hidden items-center justify-end gap-2 text-xs text-muted-foreground sm:flex"><Switch checked={product.available} onCheckedChange={(checked) => void toggleAvailable(product, checked)} aria-label={`Set ${product.name} availability`} />{product.available ? "Available" : "Hidden"}</label><div className="flex"><Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label={`Edit ${product.name}`}><Pencil /></Button><Button variant="ghost" size="icon" onClick={() => void remove(product)} aria-label={`Delete ${product.name}`} className="text-destructive"><Trash2 /></Button></div></article>)}</div></section>
    <Dialog open={adding || Boolean(editing)} onOpenChange={(open) => !open && close()}><DialogContent className="max-h-[90svh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>Update the catalogue presentation. Saved changes appear on the public catalogue.</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><label className="field-label">Product image<input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} /><button type="button" className="image-upload" onClick={() => fileRef.current?.click()}>{preview ? <img src={preview} alt="Product preview" /> : <><ImagePlus /><span>Choose image</span></>}</button></label><label className="field-label">Product name<Input value={draft.name} onChange={(e) => setDraft({...draft, name:e.target.value})} placeholder="Product name" /></label><div className="grid grid-cols-2 gap-4"><label className="field-label">Category<select className="form-select" value={draft.category} onChange={(e) => setDraft({...draft, category:e.target.value})}>{["Gifting","Diyas","Décor","Fragrance"].map((c) => <option key={c}>{c}</option>)}</select></label><label className="field-label">Price<Input type="number" min="0" value={draft.price} onChange={(e) => setDraft({...draft, price:Number(e.target.value)})} /></label></div><label className="field-label">Short description<Input value={draft.description} onChange={(e) => setDraft({...draft, description:e.target.value})} /></label><label className="flex items-center justify-between rounded-md border border-border p-3 text-sm">Available <Switch checked={draft.available} onCheckedChange={(checked) => setDraft({...draft, available:checked})} /></label></div><DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button variant="festive" onClick={() => void save()} disabled={busy}>Save product</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
