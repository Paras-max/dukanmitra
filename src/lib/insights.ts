import { buildDailySeries, forecastSeries, recommendRestock } from "@/lib/agents/forecast";
import type { Product, Sale } from "@/hooks/use-shop-data";

export function productInsights(products: Product[], sales: Sale[]) {
  return products.map((p) => {
    const ps = sales.filter((s) => s.product_id === p.id);
    const series = buildDailySeries(ps, 28);
    const f = forecastSeries(series, Number(p.quantity));
    const sold28 = ps.reduce((a, s) => a + Number(s.quantity), 0);
    const revenue28 = ps.reduce((a, s) => a + Number(s.total), 0);
    return {
      product: p,
      series,
      forecast: f,
      sold28,
      revenue28,
      restock: recommendRestock(f, Number(p.quantity), Number(p.min_stock)),
    };
  });
}
