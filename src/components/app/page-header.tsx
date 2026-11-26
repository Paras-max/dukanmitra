import type { ReactNode } from "react";
export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {sub && <p className="text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls = {
    default: "",
    good: "text-success",
    warn: "text-warning-foreground",
    bad: "text-destructive",
  }[tone];
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-display text-3xl font-bold ${toneCls}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — DukaanMitra` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — DukaanMitra` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
