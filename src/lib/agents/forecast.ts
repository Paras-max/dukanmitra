// Prediction Agent model: Holt's linear exponential smoothing with day-of-week seasonality,
// fitted per product on daily sales history. Pure + deterministic so it can be tested.
export type DailyPoint = { date: string; qty: number };

export type Forecast = {
  next7: number[];
  total7: number;
  avgDaily: number;
  trend: number; // units/day change
  daysUntilStockout: number | null;
};

export function buildDailySeries(
  sales: { created_at: string; quantity: number }[],
  days: number,
  now = new Date(),
): DailyPoint[] {
  const map = new Map<string, number>();
  for (let i = days; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sales) {
    const k = s.created_at.slice(0, 10);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + Number(s.quantity));
  }
  return [...map.entries()].map(([date, qty]) => ({ date, qty }));
}

export function forecastSeries(
  series: DailyPoint[],
  stock: number,
  alpha = 0.4,
  beta = 0.15,
): Forecast {
  const ys = series.map((p) => p.qty);
  if (ys.length === 0)
    return { next7: Array(7).fill(0), total7: 0, avgDaily: 0, trend: 0, daysUntilStockout: null };
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  // day-of-week multiplicative factors
  const dowSum = Array(7).fill(0);
  const dowCnt = Array(7).fill(0);
  series.forEach((p) => {
    const dow = new Date(p.date + "T12:00:00Z").getUTCDay();
    dowSum[dow] += p.qty;
    dowCnt[dow] += 1;
  });
  const season = dowSum.map((s, i) => (mean > 0 && dowCnt[i] > 0 ? s / dowCnt[i] / mean : 1));
  let level = ys[0] ?? 0;
  let trend = 0;
  series.forEach((p, i) => {
    if (i === 0) return;
    const dow = new Date(p.date + "T12:00:00Z").getUTCDay();
    const sf = season[dow] ?? 1;
    const deseason = sf > 0 ? p.qty / sf : p.qty;
    const prevLevel = level;
    level = alpha * deseason + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  });
  const last = series[series.length - 1];
  const lastDate = new Date((last?.date ?? new Date().toISOString().slice(0, 10)) + "T12:00:00Z");
  const next7: number[] = [];
  for (let h = 1; h <= 7; h++) {
    const dow = (lastDate.getUTCDay() + h) % 7;
    next7.push(Math.max(0, Math.round((level + trend * h) * (season[dow] || 1) * 10) / 10));
  }
  const total7 = Math.round(next7.reduce((a, b) => a + b, 0) * 10) / 10;
  const avgDaily = total7 / 7;
  let daysUntilStockout: number | null = null;
  if (avgDaily > 0) {
    let remaining = stock;
    daysUntilStockout = 0;
    for (let h = 0; h < 60 && remaining > 0; h++) {
      remaining -= next7[h % 7] ?? avgDaily;
      if (remaining > 0) daysUntilStockout++;
    }
  }
  return {
    next7,
    total7,
    avgDaily: Math.round(avgDaily * 10) / 10,
    trend: Math.round(trend * 100) / 100,
    daysUntilStockout,
  };
}

// Procurement Agent: cover the next week of forecast demand plus a safety buffer and minimum stock.
export function recommendRestock(forecast: Forecast, stock: number, minStock: number): number {
  const need = Math.ceil(forecast.total7 * 1.2 + minStock - stock);
  return Math.max(0, need);
}
