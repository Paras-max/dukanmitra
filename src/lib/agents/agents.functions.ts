import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { demoParse, type Parsed, type ParsedAction } from "./demo-parser";
import {
  verifyAction,
  needsConfirmation,
  isBlocked,
  type ResolvedAction,
  type Check,
} from "./verify";
import { buildDailySeries, forecastSeries, recommendRestock } from "./forecast";
import { t, type Lang } from "./replies";

export type AgentStep = { agent: string; message: string; level?: "ok" | "warn" | "block" };
export type CommandResult = {
  runId: string;
  status: "done" | "pending" | "blocked" | "unclear" | "cancelled";
  reply: string;
  mode: "ai" | "demo";
  steps: AgentStep[];
  actions: ResolvedAction[];
  checks: Check[][];
};

const actionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "type",
    "product",
    "quantity",
    "unit_price",
    "customer",
    "amount",
    "category",
    "description",
    "on_credit",
    "topic",
  ],
  properties: {
    type: { type: "string", enum: ["sale", "restock", "expense", "credit", "payment", "query"] },
    product: {
      type: ["string", "null"],
      description: "Exact product name from the inventory list",
    },
    quantity: { type: ["number", "null"] },
    unit_price: { type: ["number", "null"], description: "Only if user stated a price" },
    customer: { type: ["string", "null"], description: "Exact customer name from the list" },
    amount: { type: ["number", "null"], description: "Rupee amount for expense/credit/payment" },
    category: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    on_credit: { type: "boolean" },
    topic: {
      type: ["string", "null"],
      enum: ["stock", "today_sales", "profit", "low_stock", "restock", "forecast", "dues", null],
    },
  },
} as const;

async function aiOrchestrate(
  text: string,
  products: { name: string; aliases: string[]; unit: string }[],
  customers: string[],
): Promise<Parsed> {
  const { generateResponse } = await import("@lovable.dev/ai-gateway");
  const res = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions:
      "You are the Orchestrator Agent of DukaanMitra, a voice assistant for Indian kirana shopkeepers. The user speaks English, Hindi, Marathi or a mix (Hinglish), possibly transcribed with errors. Convert the command into structured actions for the Sales, Inventory, Finance, Prediction and Procurement agents. Map spoken product words to the closest exact product name in the inventory (e.g. doodh -> Milk Packet). Map people to exact customer names. 'udhar'/'उधार' means credit. Questions about stock, sales, profit, low stock, what to order, demand forecast or dues become a 'query' action with a topic. Set confidence 0-1 honestly; use low confidence for unclear or ambiguous speech and put a short clarification question in the user's language. Never invent quantities or amounts.",
    input: [
      {
        role: "user",
        content: `Inventory: ${JSON.stringify(products.map((p) => ({ name: p.name, aka: p.aliases, unit: p.unit })))}\nCustomers: ${JSON.stringify(customers)}\nCommand: ${text}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "orchestration",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["actions", "confidence", "clarification"],
          properties: {
            actions: { type: "array", items: actionSchema },
            confidence: { type: "number" },
            clarification: { type: ["string", "null"] },
          },
        },
      },
    },
  });
  let out = "";
  for (const item of (res as { output?: unknown[] }).output ?? []) {
    const it = item as { type?: string; content?: { type?: string; text?: string }[] };
    if (it.type === "message")
      for (const c of it.content ?? []) if (c.type === "output_text" && c.text) out += c.text;
  }
  const parsed = JSON.parse(out) as Parsed;
  return parsed;
}

const inputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  language: z.enum(["en", "hi", "mr"]),
  source: z.enum(["voice", "text", "offline"]).default("text"),
});

export const runCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<CommandResult> => {
    const sb = context.supabase;
    const uid = context.userId;
    const lang = data.language as Lang;
    const steps: AgentStep[] = [];
    const [{ data: products }, { data: customers }, { data: recent }] = await Promise.all([
      sb.from("products").select("*").order("name"),
      sb.from("customers").select("*").order("name"),
      sb
        .from("sales")
        .select("product_id, quantity, created_at")
        .gte("created_at", new Date(Date.now() - 5 * 60000).toISOString()),
    ]);
    const prods = products ?? [];
    const custs = customers ?? [];

    // 1. Orchestrator
    let mode: "ai" | "demo" = "ai";
    let parsed: Parsed;
    try {
      parsed = await aiOrchestrate(
        data.text,
        prods,
        custs.map((c) => c.name),
      );
      steps.push({
        agent: "Orchestrator",
        message: `Understood ${parsed.actions.length} task(s) with ${Math.round(parsed.confidence * 100)}% confidence.`,
      });
    } catch (e) {
      console.error("AI orchestrator failed, using demo mode", e);
      mode = "demo";
      parsed = demoParse(
        data.text,
        prods,
        custs.map((c) => c.name),
      );
      steps.push({
        agent: "Orchestrator",
        message: `Demo mode (AI unavailable): rule-based parsing found ${parsed.actions.length} task(s).`,
        level: "warn",
      });
    }

    const save = async (
      status: CommandResult["status"],
      reply: string,
      actions: ResolvedAction[],
      checks: Check[][],
    ) => {
      const { data: run } = await sb
        .from("agent_runs")
        .insert({
          owner_id: uid,
          command: data.text,
          language: lang,
          mode,
          status,
          reply,
          steps: { steps, actions, checks, source: data.source } as never,
        })
        .select("id")
        .single();
      return {
        runId: run?.id ?? "",
        status,
        reply,
        mode,
        steps,
        actions,
        checks,
      } satisfies CommandResult;
    };

    if (parsed.actions.length === 0) {
      return save("unclear", parsed.clarification || t(lang, "unclear"), [], []);
    }

    // 2. Resolve with Inventory / Finance agents
    const findProduct = (name: string | null) => {
      if (!name) return null;
      const n = name.toLowerCase();
      return (
        prods.find((p) => p.name.toLowerCase() === n) ??
        prods.find(
          (p) =>
            p.name.toLowerCase().includes(n) ||
            p.aliases.some((a) => a.toLowerCase() === n || n.includes(a.toLowerCase())),
        ) ??
        null
      );
    };
    const findCustomer = (name: string | null) => {
      if (!name) return null;
      const n = name.toLowerCase();
      return (
        custs.find((c) => c.name.toLowerCase() === n) ??
        custs.find(
          (c) =>
            c.name.toLowerCase().includes(n) ||
            n.includes(c.name.toLowerCase().split(" ")[0] ?? "~"),
        ) ??
        null
      );
    };
    const resolved: ResolvedAction[] = [];
    const missing: string[] = [];
    for (const a of parsed.actions as ParsedAction[]) {
      if (a.type === "sale" || a.type === "restock") {
        const p = findProduct(a.product);
        if (!p) {
          missing.push(`product “${a.product ?? "?"}”`);
          continue;
        }
        if (!a.quantity) {
          missing.push(`quantity for ${p.name}`);
          continue;
        }
        if (a.type === "sale") {
          const c = findCustomer(a.customer);
          resolved.push({
            type: "sale",
            productId: p.id,
            productName: p.name,
            quantity: a.quantity,
            unitPrice: a.unit_price ?? Number(p.price),
            stock: Number(p.quantity),
            unit: p.unit,
            customerId: c?.id ?? null,
            customerName: c?.name ?? a.customer,
            onCredit: a.on_credit,
          });
          steps.push({
            agent: "Sales",
            message: `Prepared sale: ${a.quantity} ${p.unit} ${p.name} @ ₹${a.unit_price ?? p.price}${a.on_credit ? ` on credit for ${c?.name ?? a.customer}` : ""}.`,
          });
          steps.push({
            agent: "Inventory",
            message: `${p.name} has ${p.quantity} ${p.unit} in stock.`,
          });
        } else {
          resolved.push({
            type: "restock",
            productId: p.id,
            productName: p.name,
            quantity: a.quantity,
            unit: p.unit,
            stock: Number(p.quantity),
          });
          steps.push({
            agent: "Inventory",
            message: `Prepared stock-in: +${a.quantity} ${p.unit} ${p.name}.`,
          });
        }
      } else if (a.type === "expense") {
        if (!a.amount) {
          missing.push("expense amount");
          continue;
        }
        resolved.push({
          type: "expense",
          category: a.category || "Other",
          description: a.description || data.text,
          amount: a.amount,
        });
        steps.push({
          agent: "Finance",
          message: `Prepared expense ₹${a.amount} (${a.category || "Other"}).`,
        });
      } else if (a.type === "credit" || a.type === "payment") {
        const c = findCustomer(a.customer);
        if (!c) {
          missing.push(`customer “${a.customer ?? "?"}”`);
          continue;
        }
        if (!a.amount) {
          missing.push("amount");
          continue;
        }
        resolved.push({
          type: a.type,
          customerId: c.id,
          customerName: c.name,
          amount: a.amount,
          balance: Number(c.balance),
        });
        steps.push({
          agent: "Finance",
          message: `Prepared ${a.type} of ₹${a.amount} for ${c.name} (owes ₹${c.balance}).`,
        });
      } else {
        const p = findProduct(a.product);
        resolved.push({
          type: "query",
          topic: a.topic || "today_sales",
          productId: p?.id ?? null,
          productName: p?.name ?? null,
        });
      }
    }
    if (missing.length) {
      steps.push({
        agent: "Verification",
        message: `Missing or unknown: ${missing.join(", ")}.`,
        level: "block",
      });
      return save(
        "unclear",
        (parsed.clarification ? parsed.clarification + " " : "") +
          t(lang, "blocked", { reason: `${missing.join(", ")}` }),
        resolved,
        [],
      );
    }

    // 3. Verification agent
    const checks = resolved.map((a) => verifyAction(a, recent ?? []));
    checks
      .flat()
      .forEach((c) => steps.push({ agent: "Verification", message: c.message, level: c.level }));
    if (isBlocked(checks)) {
      const reason = checks
        .flat()
        .filter((c) => c.level === "block")
        .map((c) => c.message)
        .join(" ");
      return save("blocked", t(lang, "blocked", { reason }), resolved, checks);
    }
    if (needsConfirmation(resolved, checks, parsed.confidence)) {
      steps.push({
        agent: "Verification",
        message: "Waiting for your confirmation.",
        level: "warn",
      });
      return save("pending", t(lang, "confirm"), resolved, checks);
    }
    const replies = await execute(sb, uid, resolved, lang, steps, data.source);
    return save("done", replies.join(" "), resolved, checks);
  });

type SB = SupabaseClient<Database>;

async function execute(
  sb: SB,
  uid: string,
  actions: ResolvedAction[],
  lang: Lang,
  steps: AgentStep[],
  source: string,
): Promise<string[]> {
  const replies: string[] = [];
  for (const a of actions) {
    if (a.type === "sale") {
      const { data, error } = await sb.rpc("record_sale", {
        p_product_id: a.productId,
        p_quantity: a.quantity,
        p_unit_price: a.unitPrice,
        ...(a.customerId ? { p_customer_id: a.customerId } : {}),
        p_on_credit: a.onCredit,
        p_source: source,
      });
      if (error) {
        steps.push({ agent: "Sales", message: error.message, level: "block" });
        replies.push(t(lang, "blocked", { reason: error.message }));
        continue;
      }
      const r = data as { total: number; remaining: number; unit: string; product: string };
      steps.push({ agent: "Sales", message: `Saved sale ₹${r.total}.`, level: "ok" });
      steps.push({
        agent: "Inventory",
        message: `${r.product} stock now ${r.remaining} ${r.unit}.`,
        level: "ok",
      });
      replies.push(
        t(lang, "sale", {
          qty: a.quantity,
          unit: r.unit,
          product: r.product,
          total: r.total,
          remaining: r.remaining,
        }),
      );
    } else if (a.type === "restock") {
      const { data: p } = await sb
        .from("products")
        .select("quantity")
        .eq("id", a.productId)
        .single();
      const stock = Number(p?.quantity ?? 0) + a.quantity;
      await sb.from("products").update({ quantity: stock }).eq("id", a.productId);
      steps.push({
        agent: "Inventory",
        message: `Stock updated to ${stock} ${a.unit}.`,
        level: "ok",
      });
      replies.push(
        t(lang, "restock", { qty: a.quantity, unit: a.unit, product: a.productName, stock }),
      );
    } else if (a.type === "expense") {
      await sb.from("expenses").insert({
        owner_id: uid,
        category: a.category,
        description: a.description,
        amount: a.amount,
      });
      steps.push({ agent: "Finance", message: `Expense saved.`, level: "ok" });
      replies.push(t(lang, "expense", { amount: a.amount, category: a.category }));
    } else if (a.type === "credit" || a.type === "payment") {
      const { data, error } = await sb.rpc("record_credit", {
        p_customer_id: a.customerId,
        p_kind: a.type,
        p_amount: a.amount,
        p_note: "Voice entry",
      });
      if (error) {
        replies.push(t(lang, "blocked", { reason: error.message }));
        continue;
      }
      const r = data as { customer: string; balance: number };
      steps.push({
        agent: "Finance",
        message: `${r.customer} balance now ₹${r.balance}.`,
        level: "ok",
      });
      replies.push(t(lang, a.type, { amount: a.amount, customer: r.customer, balance: r.balance }));
      continue;
    } else if (a.type === "query") {
      replies.push(await answerQuery(sb, a, lang, steps));
    }
  }
  return replies;
}

async function answerQuery(
  sb: SB,
  a: Extract<ResolvedAction, { type: "query" }>,
  lang: Lang,
  steps: AgentStep[],
): Promise<string> {
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const since28 = new Date(Date.now() - 28 * 86400000).toISOString();
  const { data: products } = await sb.from("products").select("*");
  const prods = (products ?? []) as {
    id: string;
    name: string;
    unit: string;
    quantity: number;
    min_stock: number;
  }[];
  if (a.topic === "stock" && a.productId) {
    const p = prods.find((x) => x.id === a.productId);
    steps.push({ agent: "Inventory", message: `Looked up ${p?.name}.`, level: "ok" });
    return t(lang, "stock", {
      product: p?.name ?? "",
      qty: Number(p?.quantity ?? 0),
      unit: p?.unit ?? "",
    });
  }
  if (a.topic === "today_sales" || (a.topic === "stock" && !a.productId)) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { data } = await sb
      .from("sales")
      .select("total, cost_price, quantity")
      .gte("created_at", start.toISOString());
    const rows = (data ?? []) as { total: number; cost_price: number; quantity: number }[];
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const profit = rows.reduce(
      (s, r) => s + Number(r.total) - Number(r.cost_price) * Number(r.quantity),
      0,
    );
    steps.push({ agent: "Sales", message: `Summed ${rows.length} sales today.`, level: "ok" });
    return t(lang, "today", {
      count: rows.length,
      total: Math.round(total),
      profit: Math.round(profit),
    });
  }
  if (a.topic === "profit") {
    const [{ data: s }, { data: e }] = await Promise.all([
      sb.from("sales").select("total, cost_price, quantity").gte("created_at", since7),
      sb.from("expenses").select("amount").gte("created_at", since7),
    ]);
    const sales = ((s ?? []) as { total: number }[]).reduce((x, r) => x + Number(r.total), 0);
    const gross = ((s ?? []) as { total: number; cost_price: number; quantity: number }[]).reduce(
      (x, r) => x + Number(r.total) - Number(r.cost_price) * Number(r.quantity),
      0,
    );
    const exp = ((e ?? []) as { amount: number }[]).reduce((x, r) => x + Number(r.amount), 0);
    steps.push({
      agent: "Finance",
      message: `Gross margin ₹${Math.round(gross)} minus expenses ₹${Math.round(exp)}.`,
      level: "ok",
    });
    return t(lang, "profit", {
      sales: Math.round(sales),
      expenses: Math.round(exp),
      profit: Math.round(gross - exp),
    });
  }
  if (a.topic === "low_stock") {
    const low = prods.filter((p) => Number(p.quantity) <= Number(p.min_stock));
    steps.push({
      agent: "Inventory",
      message: `${low.length} item(s) at or below minimum.`,
      level: low.length ? "warn" : "ok",
    });
    return t(lang, "low", { list: low.map((p) => `${p.name} (${p.quantity})`).join(", ") });
  }
  if (a.topic === "dues") {
    const { data } = await sb
      .from("customers")
      .select("name, balance")
      .gt("balance", 0)
      .order("balance", { ascending: false });
    const list = ((data ?? []) as { name: string; balance: number }[])
      .map((c) => `${c.name} ₹${c.balance}`)
      .join(", ");
    steps.push({ agent: "Finance", message: `Checked customer dues.`, level: "ok" });
    return t(lang, "dues", { list });
  }
  // forecast / restock
  const { data: s } = await sb
    .from("sales")
    .select("product_id, quantity, created_at")
    .gte("created_at", since28);
  const rows = (s ?? []) as { product_id: string; quantity: number; created_at: string }[];
  const fc = (p: (typeof prods)[number]) =>
    forecastSeries(
      buildDailySeries(
        rows.filter((r) => r.product_id === p.id),
        28,
      ),
      Number(p.quantity),
    );
  if (a.topic === "forecast" && a.productId) {
    const p = prods.find((x) => x.id === a.productId)!;
    const f = fc(p);
    steps.push({
      agent: "Prediction",
      message: `Holt-seasonal model: ${f.total7} ${p.unit} next 7 days, trend ${f.trend}/day.`,
      level: "ok",
    });
    return t(lang, "forecast", {
      product: p.name,
      qty: f.total7,
      unit: p.unit,
      days: f.daysUntilStockout !== null && f.daysUntilStockout < 14 ? f.daysUntilStockout : "",
    });
  }
  const recs = prods
    .map((p) => ({ p, q: recommendRestock(fc(p), Number(p.quantity), Number(p.min_stock)) }))
    .filter((r) => r.q > 0)
    .sort((x, y) => y.q - x.q);
  steps.push({
    agent: "Prediction",
    message: `Forecasted 7-day demand for ${prods.length} products.`,
    level: "ok",
  });
  steps.push({
    agent: "Procurement",
    message: `${recs.length} product(s) need restocking.`,
    level: recs.length ? "warn" : "ok",
  });
  return t(lang, "restockAdvice", {
    list: recs
      .slice(0, 6)
      .map((r) => `${r.p.name} ${r.q} ${r.p.unit}`)
      .join(", "),
  });
}

export const resolvePending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ runId: z.string().uuid(), confirm: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CommandResult> => {
    const sb = context.supabase;
    const { data: run, error } = await sb
      .from("agent_runs")
      .select("*")
      .eq("id", data.runId)
      .single();
    if (error || !run) throw new Error("Request not found");
    if (run.status !== "pending") throw new Error("This request was already handled");
    const payload = run.steps as unknown as {
      steps: AgentStep[];
      actions: ResolvedAction[];
      checks: Check[][];
      source?: string;
    };
    const lang = run.language as Lang;
    const steps = [...payload.steps];
    let status: CommandResult["status"];
    let reply: string;
    if (!data.confirm) {
      steps.push({ agent: "Verification", message: "Cancelled by shopkeeper.", level: "warn" });
      status = "cancelled";
      reply = t(lang, "cancelled");
    } else {
      steps.push({ agent: "Verification", message: "Confirmed by shopkeeper.", level: "ok" });
      const replies = await execute(
        sb,
        context.userId,
        payload.actions,
        lang,
        steps,
        payload.source ?? "voice",
      );
      status = "done";
      reply = replies.join(" ");
    }
    await sb
      .from("agent_runs")
      .update({ status, reply, steps: { ...payload, steps } as never })
      .eq("id", run.id)
      .eq("status", "pending");
    return {
      runId: run.id,
      status,
      reply,
      mode: run.mode as "ai" | "demo",
      steps,
      actions: payload.actions,
      checks: payload.checks,
    };
  });
