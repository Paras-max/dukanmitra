import { cn } from "@/lib/utils";
import type { Lang } from "@/hooks/use-voice";
const langs: { v: Lang; label: string; sub: string }[] = [
  { v: "en", label: "English", sub: "EN" },
  { v: "hi", label: "हिंदी", sub: "Hindi" },
  { v: "mr", label: "मराठी", sub: "Marathi" },
];
export function LanguagePicker({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Language">
      {langs.map((l) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === l.v}
          key={l.v}
          onClick={() => onChange(l.v)}
          className={cn(
            "rounded-xl border-2 px-3 py-2 text-center transition",
            value === l.v ? "border-primary bg-accent" : "border-border bg-card",
          )}
        >
          <span className="block font-display text-lg font-semibold">{l.label}</span>
          <span className="text-xs text-muted-foreground">{l.sub}</span>
        </button>
      ))}
    </div>
  );
}
