import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, pageHead } from "@/components/app/page-header";
import { useProducts, useSales, inr } from "@/hooks/use-shop-data";
import { productInsights } from "@/lib/insights";

export const Route = createFileRoute("/_app/forecast")({
  head: pageHead("AI demand forecast", "Predicted demand, stock-out dates and restock advice."),
  component: Forecast,
});

function Forecast() {
  const products = useProducts();
  const sales = useSales(28);
  const insights = useMemo(
    () => productInsights(products.data ?? [], sales.data ?? []),
    [products.data, sales.data],
  );
  const [sel, setSel] = useState<string | null>(null);
  const cur =
    insights.find((i) => i.product.id === sel) ??
    [...insights].sort((a, b) => b.forecast.total7 - a.forecast.total7)[0];
  const recs = insights
    .filter((i) => i.restock > 0)
    .sort((a, b) => (a.forecast.daysUntilStockout ?? 99) - (b.forecast.daysUntilStockout ?? 99));
  const orderCost = recs.reduce((a, r) => a + r.restock * Number(r.product.cost_price), 0);
  const chart = cur
    ? [
        ...cur.series
          .slice(-14)
          .map((p) => ({ day: p.date.slice(5), actual: p.qty, forecast: null as number | null })),
        ...cur.forecast.next7.map((v, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return { day: d.toISOString().slice(5, 10), actual: null as number | null, forecast: v };
        }),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="AI demand forecast"
        sub="Prediction Agent · Holt seasonal model trained on your last 4 weeks"
      />
      {cur && (
        <div className="mb-6 rounded-2xl border bg-card p-4 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">{cur.product.name}</h2>
            <select
              className="h-10 rounded-xl border bg-background px-3"
              value={cur.product.id}
              onChange={(e) => setSel(e.target.value)}
            >
              {insights.map((i) => (
                <option key={i.product.id} value={i.product.id}>
                  {i.product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2 flex flex-wrap gap-4 text-sm">
            <span>
              Next 7 days:{" "}
              <b>
                {cur.forecast.total7} {cur.product.unit}
              </b>
            </span>
            <span>
              Avg/day: <b>{cur.forecast.avgDaily}</b>
            </span>
            <span>
              Trend:{" "}
              <b>
                {cur.forecast.trend >= 0 ? "▲" : "▼"} {Math.abs(cur.forecast.trend)}/day
              </b>
            </span>
            <span>
              Stock lasts: <b>{cur.forecast.daysUntilStockout ?? "—"} days</b>
            </span>
          </div>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={chart}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <Tooltip />
                <Line dataKey="actual" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
                <Line
                  dataKey="forecast"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <ShoppingCart className="size-5 text-primary" /> Procurement Agent: order list
          </h2>
          <span className="text-sm text-muted-foreground">Est. cost {inr(orderCost)}</span>
        </div>
        {recs.length === 0 && (
          <p className="text-muted-foreground">Stock covers next week's demand.</p>
        )}
        <div className="divide-y">
          {recs.map((r) => (
            <div
              key={r.product.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <p className="font-medium">{r.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Have {Number(r.product.quantity)} · need ~{r.forecast.total7} next week
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.forecast.daysUntilStockout !== null && r.forecast.daysUntilStockout <= 3 && (
                  <Badge variant="destructive">Runs out in {r.forecast.daysUntilStockout}d</Badge>
                )}
                <span className="font-display text-xl font-bold">
                  +{r.restock} {r.product.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
