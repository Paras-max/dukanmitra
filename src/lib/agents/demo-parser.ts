// Demo-mode Orchestrator: rule-based intent parser used when AI is unavailable.
export type ParsedAction = {
  type: "sale" | "restock" | "expense" | "credit" | "payment" | "query";
  product: string | null;
  quantity: number | null;
  unit_price: number | null;
  customer: string | null;
  amount: number | null;
  category: string | null;
  description: string | null;
  on_credit: boolean;
  topic: string | null;
};
export type Parsed = { actions: ParsedAction[]; confidence: number; clarification: string | null };

const base = (t: ParsedAction["type"]): ParsedAction => ({
  type: t,
  product: null,
  quantity: null,
  unit_price: null,
  customer: null,
  amount: null,
  category: null,
  description: null,
  on_credit: false,
  topic: null,
});

const devanagariDigits: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};
const wordNums: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twenty: 20,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  paanch: 5,
  das: 10,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  दस: 10,
  दोन: 2,
  पाच: 5,
  बीस: 20,
  वीस: 20,
};

export function normalize(text: string): string {
  let t = text.toLowerCase().replace(/[०-९]/g, (d) => devanagariDigits[d] ?? d);
  for (const [w, n] of Object.entries(wordNums))
    t = t.replace(new RegExp(`(^|\\s)${w}(?=\\s|$)`, "g"), `$1${n}`);
  return t;
}

export function demoParse(
  text: string,
  productNames: { name: string; aliases: string[] }[],
  customerNames: string[],
): Parsed {
  const t = normalize(text);
  const num = t.match(/(\d+(?:\.\d+)?)/);
  const n = num ? Number(num[1]) : null;
  const product =
    productNames.find((p) => [p.name, ...p.aliases].some((a) => t.includes(a.toLowerCase())))
      ?.name ?? null;
  const customer =
    customerNames.find((c) => t.includes(c.toLowerCase().split(" ")[0] ?? "")) ?? null;
  const has = (...ws: string[]) => ws.some((w) => t.includes(w));

  if (has("paid", "payment", "jama", "जमा", "दिए", "दिले", "chukaya")) {
    return {
      actions: [{ ...base("payment"), customer, amount: n }],
      confidence: customer && n ? 0.8 : 0.4,
      clarification: customer ? null : "Which customer paid?",
    };
  }
  if (has("udhar", "उधार", "उधारी", "credit") && !product) {
    return {
      actions: [{ ...base("credit"), customer, amount: n }],
      confidence: customer && n ? 0.8 : 0.4,
      clarification: customer ? null : "Which customer took credit?",
    };
  }
  if (has("sold", "sell", "becha", "बेचा", "बेचे", "विकले", "विकली", "sale")) {
    return {
      actions: [
        {
          ...base("sale"),
          product,
          quantity: n,
          customer,
          on_credit: has("udhar", "उधार", "credit"),
        },
      ],
      confidence: product && n ? 0.85 : 0.4,
      clarification: product ? null : "Which product did you sell?",
    };
  }
  if (has("bought", "restock", "added", "arrived", "kharida", "खरीदा", "आया", "आले", "add stock")) {
    return {
      actions: [{ ...base("restock"), product, quantity: n }],
      confidence: product && n ? 0.85 : 0.4,
      clarification: product ? null : "Which product arrived?",
    };
  }
  if (has("expense", "kharcha", "खर्च", "rent", "bill", "किराया", "bhada")) {
    return {
      actions: [
        {
          ...base("expense"),
          amount: n,
          category: has("rent", "किराया", "bhada")
            ? "Rent"
            : has("bill", "बिजली", "light")
              ? "Electricity"
              : "Other",
          description: text,
        },
      ],
      confidence: n ? 0.8 : 0.4,
      clarification: n ? null : "How much was the expense?",
    };
  }
  const topic = has("profit", "munafa", "मुनाफा", "नफा")
    ? "profit"
    : has("low", "kam", "कम", "shortage", "khatam")
      ? "low_stock"
      : has("restock", "order", "mangwa", "purchase", "kya mangana")
        ? "restock"
        : has("forecast", "predict", "agle", "next week")
          ? "forecast"
          : has("today", "aaj", "आज", "sales")
            ? "today_sales"
            : has("stock", "kitna", "कितना", "किती")
              ? "stock"
              : has("owe", "baki", "बाकी", "due")
                ? "dues"
                : null;
  if (topic)
    return {
      actions: [{ ...base("query"), topic, product }],
      confidence: 0.8,
      clarification: null,
    };
  return {
    actions: [],
    confidence: 0,
    clarification:
      "Sorry, I didn't understand. Please say it again, for example: “I sold 10 milk packets”.",
  };
}
