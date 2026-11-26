import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader, pageHead } from "@/components/app/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProducts, useInvalidateAll, inr, type Product } from "@/hooks/use-shop-data";

export const Route = createFileRoute("/_app/inventory")({
  head: pageHead("Inventory", "Manage products, prices and stock levels."),
  component: Inventory,
});

const empty = {
  name: "",
  category: "General",
  unit: "pcs",
  price: "",
  cost_price: "",
  quantity: "",
  min_stock: "5",
  aliases: "",
};

function Inventory() {
  const { user } = useAuth();
  const products = useProducts();
  const invalidate = useInvalidateAll();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [f, setF] = useState(empty);

  const startEdit = (p: Product | null) => {
    setEditing(p);
    setF(
      p
        ? {
            name: p.name,
            category: p.category,
            unit: p.unit,
            price: String(p.price),
            cost_price: String(p.cost_price),
            quantity: String(p.quantity),
            min_stock: String(p.min_stock),
            aliases: p.aliases.join(", "),
          }
        : empty,
    );
    setOpen(true);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const row = {
      name: f.name.trim(),
      category: f.category,
      unit: f.unit,
      price: Number(f.price),
      cost_price: Number(f.cost_price || 0),
      quantity: Number(f.quantity || 0),
      min_stock: Number(f.min_stock || 0),
      aliases: f.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };
    if (!row.name || !(row.price >= 0) || row.quantity < 0) {
      toast.error("Please check name, price and quantity.");
      return;
    }
    const { error } = editing
      ? await supabase.from("products").update(row).eq("id", editing.id)
      : await supabase.from("products").insert({ ...row, owner_id: user.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Product updated" : "Product added");
    setOpen(false);
    invalidate();
  };
  const remove = async (p: Product) => {
    if (!confirm(`Remove ${p.name}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
  };
  const list = (products.data ?? []).filter((p) =>
    (p.name + p.category + p.aliases.join(" ")).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="Inventory" sub={`${products.data?.length ?? 0} products`}>
        <Button variant="hero" onClick={() => startEdit(null)}>
          <Plus /> Add product
        </Button>
      </PageHeader>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
        <Input
          className="h-11 pl-10"
          placeholder="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const low = Number(p.quantity) <= Number(p.min_stock);
          return (
            <div key={p.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.category} · {inr(Number(p.price))}/{p.unit}
                  </p>
                </div>
                {low && <Badge variant="destructive">Low</Badge>}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <span
                    className={`font-display text-3xl font-bold ${low ? "text-destructive" : ""}`}
                  >
                    {Number(p.quantity)}
                  </span>{" "}
                  <span className="text-muted-foreground">{p.unit}</span>
                  <p className="text-xs text-muted-foreground">
                    min {Number(p.min_stock)} · cost {inr(Number(p.cost_price))}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${p.name}`}
                    onClick={() => startEdit(p)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => void remove(p)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input
                required
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={f.category}
                onChange={(e) => setF({ ...f, category: e.target.value })}
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
            </div>
            <div>
              <Label>Selling price ₹</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                value={f.price}
                onChange={(e) => setF({ ...f, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Cost price ₹</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={f.cost_price}
                onChange={(e) => setF({ ...f, cost_price: e.target.value })}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: e.target.value })}
              />
            </div>
            <div>
              <Label>Minimum stock</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={f.min_stock}
                onChange={(e) => setF({ ...f, min_stock: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Other names (for voice)</Label>
              <Input
                placeholder="doodh, दूध"
                value={f.aliases}
                onChange={(e) => setF({ ...f, aliases: e.target.value })}
              />
            </div>
            <DialogFooter className="col-span-2">
              <Button type="submit" variant="hero">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
