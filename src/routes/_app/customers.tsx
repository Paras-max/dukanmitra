import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MessageCircle, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader, StatCard, pageHead } from "@/components/app/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCustomers, useInvalidateAll, useShop, inr, type Customer } from "@/hooks/use-shop-data";

export const Route = createFileRoute("/_app/customers")({
  head: pageHead("Udhar / Credit", "Track customer credit, payments and reminders."),
  component: Customers,
});

function Customers() {
  const { user } = useAuth();
  const shop = useShop();
  const customers = useCustomers();
  const invalidate = useInvalidateAll();
  const [addOpen, setAddOpen] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "" });
  const [entry, setEntry] = useState<{ c: Customer; kind: "credit" | "payment" } | null>(null);
  const [amount, setAmount] = useState("");
  const list = customers.data ?? [];
  const due = list.reduce((a, c) => a + Math.max(0, Number(c.balance)), 0);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase
      .from("customers")
      .insert({ owner_id: user.id, name: nc.name.trim(), phone: nc.phone.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAddOpen(false);
    setNc({ name: "", phone: "" });
    invalidate();
  };
  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast.error("Enter an amount");
      return;
    }
    if (
      entry.kind === "payment" &&
      amt > Number(entry.c.balance) &&
      !confirm(`${entry.c.name} only owes ${inr(Number(entry.c.balance))}. Save anyway?`)
    )
      return;
    const { error } = await supabase.rpc("record_credit", {
      p_customer_id: entry.c.id,
      p_kind: entry.kind,
      p_amount: amt,
      p_note: "Manual entry",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(entry.kind === "credit" ? "Udhar added" : "Payment received");
    setEntry(null);
    setAmount("");
    invalidate();
  };
  const remind = async (c: Customer) => {
    const msg = `Namaste ${c.name}, ${shop.data?.name ?? "our shop"} par aapka ₹${Number(c.balance)} baaki hai. Kripya jaldi jama karein. Dhanyavaad 🙏`;
    await supabase
      .from("customers")
      .update({ last_reminder_at: new Date().toISOString() })
      .eq("id", c.id);
    invalidate();
    window.open(
      `https://wa.me/91${c.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  return (
    <div>
      <PageHeader title="Udhar / Credit" sub="Who owes you money">
        <Button variant="hero" onClick={() => setAddOpen(true)}>
          <Plus /> Customer
        </Button>
      </PageHeader>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Total to collect" value={inr(due)} tone="warn" />
        <StatCard
          label="Customers with dues"
          value={String(list.filter((c) => Number(c.balance) > 0).length)}
        />
      </div>
      <div className="space-y-3">
        {list.map((c) => (
          <div
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft"
          >
            <div>
              <p className="text-lg font-semibold">{c.name}</p>
              <p className="text-sm text-muted-foreground">
                {c.phone || "No phone"}
                {c.last_reminder_at &&
                  ` · reminded ${new Date(c.last_reminder_at).toLocaleDateString("en-IN")}`}
              </p>
            </div>
            <p
              className={`font-display text-2xl font-bold ${Number(c.balance) > 0 ? "text-destructive" : "text-success"}`}
            >
              {inr(Number(c.balance))}
            </p>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" onClick={() => setEntry({ c, kind: "credit" })}>
                + Udhar
              </Button>
              <Button variant="success" onClick={() => setEntry({ c, kind: "payment" })}>
                <IndianRupee /> Paid
              </Button>
              {Number(c.balance) > 0 && c.phone && (
                <Button variant="secondary" onClick={() => void remind(c)}>
                  <MessageCircle /> Remind
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={add} className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                required
                value={nc.name}
                onChange={(e) => setNc({ ...nc, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                inputMode="tel"
                value={nc.phone}
                onChange={(e) => setNc({ ...nc, phone: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="hero">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!entry} onOpenChange={(o) => !o && setEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entry?.kind === "credit" ? "Add udhar for" : "Payment from"} {entry?.c.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEntry} className="space-y-3">
            <div>
              <Label>Amount ₹</Label>
              <Input
                autoFocus
                required
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="hero">
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
