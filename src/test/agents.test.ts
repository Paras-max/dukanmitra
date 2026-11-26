import { describe, expect, it } from "vitest";
import {
  verifyAction,
  needsConfirmation,
  isBlocked,
  type ResolvedAction,
} from "@/lib/agents/verify";
import { demoParse } from "@/lib/agents/demo-parser";
import { forecastSeries, recommendRestock } from "@/lib/agents/forecast";

const sale = (q: number, stock = 30, price = 30): ResolvedAction => ({
  type: "sale",
  productId: "p1",
  productName: "Milk Packet",
  quantity: q,
  unitPrice: price,
  stock,
  unit: "packets",
  customerId: null,
  customerName: null,
  onCredit: false,
});

describe("Verification agent", () => {
  it("blocks a sale larger than stock", () => {
    expect(isBlocked([verifyAction(sale(31), [])])).toBe(true);
  });
  it("saves a normal clear sale without asking", () => {
    const a = sale(10);
    expect(needsConfirmation([a], [verifyAction(a, [])], 0.9)).toBe(false);
  });
  it("asks for confirmation on a duplicate sale within 2 minutes", () => {
    const a = sale(10);
    const checks = verifyAction(a, [
      { product_id: "p1", quantity: 10, created_at: new Date().toISOString() },
    ]);
    expect(needsConfirmation([a], [checks], 0.9)).toBe(true);
  });
  it("asks for confirmation on sales of ₹2000 or more", () => {
    const a = sale(10, 30, 200);
    expect(needsConfirmation([a], [verifyAction(a, [])], 0.95)).toBe(true);
  });
  it("never silently saves money entries (payments)", () => {
    const a: ResolvedAction = {
      type: "payment",
      customerId: "c",
      customerName: "Ramesh",
      amount: 300,
      balance: 850,
    };
    expect(needsConfirmation([a], [verifyAction(a, [])], 0.99)).toBe(true);
  });
  it("asks when the command was unclear", () => {
    const a = sale(2);
    expect(needsConfirmation([a], [verifyAction(a, [])], 0.5)).toBe(true);
  });
});

describe("Demo orchestrator", () => {
  const products = [{ name: "Milk Packet", aliases: ["milk", "doodh", "दूध"] }];
  it("parses an English sale", () => {
    const r = demoParse("I sold 10 milk packets today", products, []);
    expect(r.actions[0]).toMatchObject({ type: "sale", product: "Milk Packet", quantity: 10 });
  });
  it("parses a Hindi sale with Devanagari digits", () => {
    const r = demoParse("आज १० दूध बेचे", products, []);
    expect(r.actions[0]).toMatchObject({ type: "sale", product: "Milk Packet", quantity: 10 });
  });
});

describe("Prediction & procurement", () => {
  it("forecasts steady demand and recommends a restock", () => {
    const series = Array.from({ length: 28 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
      qty: 10,
    }));
    const f = forecastSeries(series, 20);
    expect(f.total7).toBeCloseTo(70, 0);
    expect(f.daysUntilStockout).toBe(1);
    expect(recommendRestock(f, 20, 15)).toBe(79);
  });
});
