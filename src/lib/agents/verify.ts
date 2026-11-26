// Verification Agent rules. Pure so they can be unit tested.
export type ResolvedAction =
  | {
      type: "sale";
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      stock: number;
      unit: string;
      customerId: string | null;
      customerName: string | null;
      onCredit: boolean;
    }
  | {
      type: "restock";
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      stock: number;
    }
  | { type: "expense"; category: string; description: string; amount: number }
  | {
      type: "credit" | "payment";
      customerId: string;
      customerName: string;
      amount: number;
      balance: number;
    }
  | { type: "query"; topic: string; productId: string | null; productName: string | null };

export type Check = { level: "ok" | "warn" | "block"; message: string };

export const LARGE_AMOUNT = 2000;
export const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

export function verifyAction(
  a: ResolvedAction,
  recentSales: { product_id: string | null; quantity: number; created_at: string }[],
  now = Date.now(),
): Check[] {
  const checks: Check[] = [];
  if (a.type === "sale") {
    if (!(a.quantity > 0))
      checks.push({ level: "block", message: "Quantity must be more than zero." });
    if (a.quantity > a.stock)
      checks.push({
        level: "block",
        message: `Only ${a.stock} ${a.unit} of ${a.productName} in stock.`,
      });
    const total = Math.round(a.quantity * a.unitPrice * 100) / 100;
    checks.push({ level: "ok", message: `${a.quantity} × ₹${a.unitPrice} = ₹${total}` });
    if (total >= LARGE_AMOUNT)
      checks.push({ level: "warn", message: `Large sale of ₹${total} — please confirm.` });
    if (a.onCredit && !a.customerId)
      checks.push({ level: "block", message: "Credit sale needs a known customer." });
    if (a.onCredit)
      checks.push({
        level: "warn",
        message: `₹${total} will be added to ${a.customerName}'s credit.`,
      });
    const dup = recentSales.find(
      (s) =>
        s.product_id === a.productId &&
        Number(s.quantity) === a.quantity &&
        now - new Date(s.created_at).getTime() < DUPLICATE_WINDOW_MS,
    );
    if (dup)
      checks.push({
        level: "warn",
        message: "A same sale was recorded in the last 2 minutes — possible duplicate.",
      });
  }
  if (a.type === "restock" && !(a.quantity > 0))
    checks.push({ level: "block", message: "Quantity must be more than zero." });
  if (a.type === "expense" || a.type === "credit" || a.type === "payment") {
    if (!(a.amount > 0)) checks.push({ level: "block", message: "Amount must be more than zero." });
    checks.push({ level: "warn", message: `Money entry of ₹${a.amount} — please confirm.` });
    if (a.type === "payment" && a.amount > a.balance)
      checks.push({ level: "warn", message: `${a.customerName} only owes ₹${a.balance}.` });
  }
  return checks;
}

/** Any money or stock change from an unclear command, or any warning, needs explicit confirmation. */
export function needsConfirmation(
  actions: ResolvedAction[],
  checks: Check[][],
  confidence: number,
): boolean {
  const changes = actions.some((a) => a.type !== "query");
  if (!changes) return false;
  if (confidence < 0.75) return true;
  return checks.flat().some((c) => c.level === "warn");
}

export function isBlocked(checks: Check[][]): boolean {
  return checks.flat().some((c) => c.level === "block");
}
