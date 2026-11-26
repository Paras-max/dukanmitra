import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
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
import { useExpenses, useSales, useInvalidateAll, inr, profitOf } from "@/hooks/use-shop-data";

export const Route = createFileRoute("/_app/finance")({
  head: pageHead("Finance & profit", "Revenue, expenses and profit over time."),
  component: Finance,
});

const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Finance() {
  const { user } = useAuth();
  const sales = useSales(28);
  const expenses = useExpenses(28);
  const invalidate = useInvalidateAll();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ category: "Other", description: "", amount: "" });
  const s = sales.data ?? [];
  const e = expenses.data ?? [];
  const revenue = s.reduce((a, x) => a + Number(x.total), 0);
  const gross = s.reduce((a, x) => a + profitOf(x), 0);
  const exp = e.reduce((a, x) => a + Number(x.amount), 0);

  const daily = useMemo(() => {
    const out: { day: string; revenue: number; profit: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toDateString();
      const ds = s.filter((x) => new Date(x.created_at).toDateString() === k);
      const de = e
        .filter((x) => new Date(x.created_at).toDateString() === k)
        .reduce((a, x) => a + Number(x.amount), 0);
      out.push({
        day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        revenue: Math.round(ds.reduce((a, x) => a + Number(x.total), 0)),
        profit: Math.round(ds.reduce((a, x) => a + profitOf(x), 0) - de),
      });
    }
    return out;
  }, [s, e]);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    e.forEach((x) => m.set(x.category, (m.get(x.category) ?? 0) + Number(x.amount)));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [e]);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    const amount = Number(f.amount);
    if (!(amount > 0)) {
      toast.error("Enter an amount");
      return;
    }
    const { error } = await supabase
      .from("expenses")
      .insert({ owner_id: user.id, category: f.category, description: f.description, amount });
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setF({ category: "Other", description: "", amount: "" });
    invalidate();
  };

  return (
    <div>
      <PageHeader title="Finance & profit" sub="Last 4 weeks">
        <Button variant="hero" onClick={() => setOpen(true)}>
          <Plus /> Expense
        </Button>
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue" value={inr(revenue)} />
        <StatCard
          label="Gross margin"
          value={inr(gross)}
          hint={revenue ? `${Math.round((gross / revenue) * 100)}% of sales` : undefined}
        />
        <StatCard label="Expenses" value={inr(exp)} tone="bad" />
        <StatCard
          label="Net profit"
          value={inr(gross - exp)}
          tone={gross - exp >= 0 ? "good" : "bad"}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-2 text-xl font-semibold">Daily revenue & profit</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={daily}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} interval={6} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Area
                  dataKey="revenue"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.2}
                />
                <Area
                  dataKey="profit"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="mb-2 text-xl font-semibold">Expenses by type</h2>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                  {byCat.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {byCat.map((c, i) => (
            <div key={c.name} className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
                {c.name}
              </span>
              <span>{inr(c.value)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 divide-y rounded-2xl border bg-card">
        {e.slice(0, 15).map((x) => (
          <div key={x.id} className="flex justify-between px-4 py-3">
            <span>
              <b>{x.category}</b>{" "}
              <span className="text-sm text-muted-foreground">
                {x.description} · {new Date(x.created_at).toLocaleDateString("en-IN")}
              </span>
            </span>
            <span className="font-semibold">{inr(Number(x.amount))}</span>
          </div>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label>Type</Label>
              <Input
                value={f.category}
                onChange={(ev) => setF({ ...f, category: ev.target.value })}
                placeholder="Rent, Electricity, Transport…"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={f.description}
                onChange={(ev) => setF({ ...f, description: ev.target.value })}
              />
            </div>
            <div>
              <Label>Amount ₹</Label>
              <Input
                required
                type="number"
                min="1"
                value={f.amount}
                onChange={(ev) => setF({ ...f, amount: ev.target.value })}
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
    </div>
  );
}
