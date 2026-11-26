import { Bot, Boxes, Receipt, Wallet, LineChart, ShoppingCart, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStep } from "@/lib/agents/agents.functions";

const icons: Record<string, typeof Bot> = {
  Orchestrator: Bot,
  Inventory: Boxes,
  Sales: Receipt,
  Finance: Wallet,
  Prediction: LineChart,
  Procurement: ShoppingCart,
  Verification: ShieldCheck,
};

export function AgentSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const Icon = icons[s.agent] ?? Bot;
        return (
          <li key={i} className="flex gap-3 text-sm">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg",
                s.level === "block"
                  ? "bg-destructive text-destructive-foreground"
                  : s.level === "warn"
                    ? "bg-warning text-warning-foreground"
                    : s.level === "ok"
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span>
              <b>{s.agent}</b> — {s.message}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
