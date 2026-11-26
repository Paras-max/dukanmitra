import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bot, Boxes, Receipt, Wallet, LineChart, ShoppingCart, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, pageHead } from "@/components/app/page-header";
import { AgentSteps } from "@/components/app/agent-steps";
import { useAgentRuns, useInvalidateAll } from "@/hooks/use-shop-data";
import { resolvePending, type AgentStep } from "@/lib/agents/agents.functions";

export const Route = createFileRoute("/_app/agents")({
  head: pageHead("Agent activity", "See how each AI agent handled your commands."),
  component: Agents,
});

const team = [
  { name: "Orchestrator", icon: Bot, role: "Understands you and assigns work" },
  { name: "Inventory", icon: Boxes, role: "Stock levels and alerts" },
  { name: "Sales", icon: Receipt, role: "Records bills and revenue" },
  { name: "Finance", icon: Wallet, role: "Expenses, profit, udhar" },
  { name: "Prediction", icon: LineChart, role: "Forecasts demand" },
  { name: "Procurement", icon: ShoppingCart, role: "Suggests what to order" },
  { name: "Verification", icon: ShieldCheck, role: "Checks maths, stock & duplicates" },
];
const statusVariant = {
  done: "secondary",
  pending: "default",
  blocked: "destructive",
  unclear: "outline",
  cancelled: "outline",
} as const;

function Agents() {
  const runs = useAgentRuns();
  const invalidate = useInvalidateAll();
  const decide = async (runId: string, confirm: boolean) => {
    try {
      const r = await resolvePending({ data: { runId, confirm } });
      toast.success(r.reply);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };
  return (
    <div>
      <PageHeader title="Agent activity" sub="Your AI team and everything they did" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {team.map((a) => (
          <div key={a.name} className="rounded-2xl border bg-card p-3 text-center">
            <a.icon className="mx-auto mb-1 size-6 text-secondary" />
            <p className="font-semibold">{a.name}</p>
            <p className="text-xs text-muted-foreground">{a.role}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {(runs.data ?? []).map((r) => {
          const payload = r.steps as unknown as { steps?: AgentStep[] };
          return (
            <details
              key={r.id}
              className="rounded-2xl border bg-card p-4 shadow-soft"
              open={r.status === "pending"}
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-medium">“{r.command}”</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {r.mode === "demo" && <Badge variant="outline">Demo mode</Badge>}
                  <Badge
                    variant={statusVariant[r.status as keyof typeof statusVariant] ?? "outline"}
                  >
                    {r.status === "pending" ? "Needs confirmation" : r.status}
                  </Badge>
                  {new Date(r.created_at).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </summary>
              <p className="my-3 rounded-xl bg-muted p-3">{r.reply}</p>
              {r.status === "pending" && (
                <div className="mb-3 flex gap-2">
                  <Button variant="success" onClick={() => void decide(r.id, true)}>
                    Confirm
                  </Button>
                  <Button variant="outline" onClick={() => void decide(r.id, false)}>
                    Cancel
                  </Button>
                </div>
              )}
              <AgentSteps steps={payload.steps ?? []} />
            </details>
          );
        })}
        {runs.data?.length === 0 && (
          <p className="text-muted-foreground">No commands yet. Try the voice assistant.</p>
        )}
      </div>
    </div>
  );
}
