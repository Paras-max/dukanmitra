import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { runCommand } from "@/lib/agents/agents.functions";
import type { Lang } from "./use-voice";

const KEY = "dukaanmitra-offline-queue";
type Queued = { id: string; text: string; language: Lang; at: string };

const read = (): Queued[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const write = (q: Queued[]) => localStorage.setItem(KEY, JSON.stringify(q));

/** Commands spoken while offline are stored on the phone and sent through the agents when the internet returns. */
export function useOfflineQueue(onSynced?: () => void) {
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<Queued[]>([]);

  const sync = useCallback(async () => {
    const q = read();
    if (!q.length || !navigator.onLine) return;
    let ok = 0;
    for (const item of q) {
      try {
        const r = await runCommand({
          data: { text: item.text, language: item.language, source: "offline" },
        });
        write(read().filter((x) => x.id !== item.id));
        ok++;
        if (r.status === "pending")
          toast.warning(`Offline entry needs confirmation: “${item.text}”. Open Agent activity.`);
      } catch {
        break;
      }
    }
    setQueue(read());
    if (ok) {
      toast.success(`Synced ${ok} offline entr${ok > 1 ? "ies" : "y"}.`);
      onSynced?.();
    }
  }, [onSynced]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueue(read());
    const on = () => {
      setOnline(true);
      void sync();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    void sync();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [sync]);

  const enqueue = (text: string, language: Lang) => {
    const q = [
      ...read(),
      { id: crypto.randomUUID(), text, language, at: new Date().toISOString() },
    ];
    write(q);
    setQueue(q);
  };
  return { online, queue, enqueue, sync };
}
