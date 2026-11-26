import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, pageHead } from "@/components/app/page-header";
import { useSales, useCustomers, inr, profitOf } from "@/hooks/use-shop-data";

export const Route = createFileRoute("/_app/sales")({
  head: pageHead("Sales history", "Every sale recorded by voice or by hand."),
  component: Sales,
});

function Sales() {
  const [days, setDays] = useState(7);
  const sales = useSales(28);
  const customers = useCustomers();
  const cutoff = Date.now() - days * 86400000;
  const rows = (sales.data ?? []).filter((s) => new Date(s.created_at).getTime() >= cutoff);
  const total = rows.reduce((a, s) => a + Number(s.total), 0);
  const profit = rows.reduce((a, s) => a + profitOf(s), 0);
  const cname = useMemo(
    () => new Map((customers.data ?? []).map((c) => [c.id, c.name])),
    [customers.data],
  );
  const grouped = useMemo(() => {
    const m = new Map<string, typeof rows>();
    rows.forEach((r) => {
      const k = new Date(r.created_at).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      m.set(k, [...(m.get(k) ?? []), r]);
    });
    return [...m.entries()];
  }, [rows]);
  return (
    <div>
      <PageHeader title="Sales history">
        {[1, 7, 28].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-full border px-3 py-1.5 text-sm ${days === d ? "border-primary bg-accent font-semibold" : "bg-card"}`}
          >
            {d === 1 ? "Today" : `${d} days`}
          </button>
        ))}
      </PageHeader>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Revenue" value={inr(total)} />
        <StatCard label="Gross profit" value={inr(profit)} tone="good" />
        <StatCard label="Bills" value={String(rows.length)} />
      </div>
      {grouped.map(([day, items]) => (
        <div key={day} className="mb-5">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span className="font-semibold">{day}</span>
            <span>{inr(items.reduce((a, s) => a + Number(s.total), 0))}</span>
          </div>
          <div className="divide-y rounded-2xl border bg-card">
            {items.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {Number(s.quantity)} × {s.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · ₹{Number(s.unit_price)} each
                    {s.customer_id && ` · ${cname.get(s.customer_id) ?? ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.source === "voice" && <Badge variant="secondary">Voice</Badge>}
                  {s.on_credit && <Badge variant="outline">Udhar</Badge>}
                  <span className="font-semibold">{inr(Number(s.total))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-muted-foreground">No sales in this period yet.</p>}
    </div>
  );
}
