import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Mic, AlertTriangle, TrendingUp, Lightbulb } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, pageHead } from "@/components/app/page-header";
import {
  useCustomers,
  useExpenses,
  useProducts,
  useSales,
  useShop,
  inr,
  isToday,
  profitOf,
} from "@/hooks/use-shop-data";
import { productInsights } from "@/lib/insights";

export const Route = createFileRoute("/_app/dashboard")({
  head: pageHead("Dashboard", "Today's sales, profit, stock alerts and AI tips."),
  component: Dashboard,
});

function Dashboard() {
  const shop = useShop();
  const products = useProducts();
  const sales = useSales(28);
  const expenses = useExpenses(28);
  const customers = useCustomers();
  const s = sales.data ?? [];
  const today = s.filter((x) => isToday(x.created_at));
  const todayTotal = today.reduce((a, x) => a + Number(x.total), 0);
  const todayProfit = today.reduce((a, x) => a + profitOf(x), 0);
  const todayExp = (expenses.data ?? [])
    .filter((e) => isToday(e.created_at))
    .reduce((a, e) => a + Number(e.amount), 0);
  const dues = (customers.data ?? []).reduce((a, c) => a + Math.max(0, Number(c.balance)), 0);
  const low = (products.data ?? []).filter((p) => Number(p.quantity) <= Number(p.min_stock));
  const insights = useMemo(() => productInsights(products.data ?? [], s), [products.data, s]);
  const best = [...insights].sort((a, b) => b.revenue28 - a.revenue28).slice(0, 5);
  const slow = [...insights].sort((a, b) => a.sold28 - b.sold28).slice(0, 3);
  const soon = insights
    .filter((i) => i.forecast.daysUntilStockout !== null && i.forecast.daysUntilStockout <= 5)
    .sort((a, b) => (a.forecast.daysUntilStockout ?? 0) - (b.forecast.daysUntilStockout ?? 0));

  const chart = useMemo(() => {
    const days: { day: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toDateString();
      days.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        sales: Math.round(
          s
            .filter((x) => new Date(x.created_at).toDateString() === k)
            .reduce((a, x) => a + Number(x.total), 0),
        ),
      });
    }
    return days;
  }, [s]);

  return (
    <div>
      <PageHeader
        title={`Namaste${shop.data?.owner_name ? ", " + shop.data.owner_name.split(" ")[0] : ""} 🙏`}
        sub={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      >
        <Button asChild variant="hero" size="lg" className="hidden md:inline-flex">
          <Link to="/assistant">
            <Mic /> Speak
          </Link>
        </Button>
      </PageHeader>
      <Link
        to="/assistant"
        className="mb-6 flex items-center gap-4 rounded-3xl bg-saffron p-5 text-primary-foreground shadow-mic md:hidden"
      >
        <div className="grid size-14 place-items-center rounded-full bg-primary-foreground/20">
          <Mic className="size-7" />
        </div>
        <div>
          <p className="font-display text-xl font-bold">Tap and speak</p>
          <p className="text-sm opacity-90">“10 doodh bech diye”</p>
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's sales" value={inr(todayTotal)} hint={`${today.length} bills`} />
        <StatCard
          label="Today's profit (est.)"
          value={inr(todayProfit - todayExp)}
          tone="good"
          hint={todayExp ? `after ${inr(todayExp)} expenses` : "gross margin"}
        />
        <StatCard
          label="Udhar to collect"
          value={inr(dues)}
          tone="warn"
          hint={`${(customers.data ?? []).filter((c) => Number(c.balance) > 0).length} customers`}
        />
        <StatCard
          label="Low stock items"
          value={String(low.length)}
          tone={low.length ? "bad" : "good"}
        />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-2 text-xl font-semibold">Last 7 days</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => inr(v)} />
                <Bar dataKey="sales" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
            <Lightbulb className="size-5 text-primary" /> AI tips
          </h2>
          <ul className="space-y-3 text-[0.95rem]">
            {soon.slice(0, 3).map((i) => (
              <li key={i.product.id} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>
                  <b>{i.product.name}</b> may run out in {i.forecast.daysUntilStockout} day(s).
                  Order {i.restock} {i.product.unit}.
                </span>
              </li>
            ))}
            {slow[0] && (
              <li className="flex gap-2">
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-secondary" />
                <span>
                  <b>{slow[0].product.name}</b> is slow-moving ({slow[0].sold28} sold in 4 weeks).
                  Avoid over-ordering.
                </span>
              </li>
            )}
            {dues > 0 && (
              <li className="flex gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Collect {inr(dues)} pending udhar.{" "}
                  <Link to="/customers" className="text-primary underline">
                    Send reminders
                  </Link>
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="mb-3 text-xl font-semibold">Best sellers (4 weeks)</h2>
          {best.map((b) => (
            <div key={b.product.id} className="flex justify-between border-b py-2 last:border-0">
              <span>{b.product.name}</span>
              <span className="font-semibold">{inr(b.revenue28)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="mb-3 text-xl font-semibold">Low stock</h2>
          {low.length === 0 && <p className="text-muted-foreground">All good! 👍</p>}
          {low.map((p) => (
            <div key={p.id} className="flex justify-between border-b py-2 last:border-0">
              <span>{p.name}</span>
              <span className="font-semibold text-destructive">
                {Number(p.quantity)} {p.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
