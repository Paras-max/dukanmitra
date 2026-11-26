import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mic, Send, Square, Volume2, CloudOff, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, pageHead } from "@/components/app/page-header";
import { LanguagePicker } from "@/components/app/language-picker";
import { AgentSteps } from "@/components/app/agent-steps";
import { useShop, useInvalidateAll } from "@/hooks/use-shop-data";
import { useSpeechRecognition, speak, type Lang } from "@/hooks/use-voice";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { runCommand, resolvePending, type CommandResult } from "@/lib/agents/agents.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/assistant")({
  head: pageHead("Voice assistant", "Speak to record sales, stock, expenses and udhar."),
  component: Assistant,
});

const examples: Record<Lang, string[]> = {
  en: [
    "I sold 10 milk packets today",
    "Ramesh paid 300 rupees",
    "What should I restock?",
    "20 eggs arrived",
    "How much profit this week?",
  ],
  hi: [
    "आज 10 दूध के पैकेट बेचे",
    "सुनीता ने 200 रुपये जमा किए",
    "क्या कम स्टॉक में है?",
    "आज की बिक्री कितनी हुई?",
    "बिजली का बिल 500 रुपये खर्च",
  ],
  mr: [
    "आज 5 ब्रेड विकले",
    "अब्दुल ने 100 रुपये दिले",
    "कोणता माल कमी आहे?",
    "आजची विक्री किती?",
    "भाडे 6000 खर्च",
  ],
};

type Turn = { id: string; text: string; result?: CommandResult; queued?: boolean; error?: string };

function Assistant() {
  const shop = useShop();
  const invalidate = useInvalidateAll();
  const [lang, setLang] = useState<Lang>("en");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const offline = useOfflineQueue(invalidate);
  const voiceOn = shop.data?.voice_replies ?? true;

  useEffect(() => {
    if (shop.data?.language) setLang(shop.data.language as Lang);
  }, [shop.data?.language]);

  const send = async (cmd: string, source: "voice" | "text" = "text", conf = 1) => {
    const clean = cmd.trim();
    if (!clean) return;
    if (source === "voice" && conf > 0 && conf < 0.45) {
      const msg =
        lang === "hi"
          ? "आवाज़ साफ़ नहीं आई, कृपया फिर से बोलिए।"
          : lang === "mr"
            ? "आवाज स्पष्ट आला नाही, कृपया पुन्हा सांगा."
            : "I couldn't hear that clearly. Please say it again.";
      toast.warning(`Heard: “${clean}”. ${msg}`);
      if (voiceOn) speak(msg, lang);
      return;
    }
    const id = crypto.randomUUID();
    setText("");
    if (!navigator.onLine) {
      offline.enqueue(clean, lang);
      setTurns((t) => [{ id, text: clean, queued: true }, ...t]);
      return;
    }
    setTurns((t) => [{ id, text: clean }, ...t]);
    setBusy(true);
    try {
      const r = await runCommand({ data: { text: clean, language: lang, source } });
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, result: r } : x)));
      if (voiceOn) speak(r.reply, lang);
      invalidate();
    } catch (e) {
      setTurns((t) =>
        t.map((x) =>
          x.id === id
            ? { ...x, error: e instanceof Error ? e.message : "Something went wrong" }
            : x,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const decide = async (turnId: string, runId: string, confirm: boolean) => {
    setBusy(true);
    try {
      const r = await resolvePending({ data: { runId, confirm } });
      setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, result: r } : x)));
      if (voiceOn) speak(r.reply, lang);
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const rec = useSpeechRecognition(lang, (t, c) => void send(t, "voice", c));

  return (
    <div>
      <PageHeader title="Voice assistant" sub="Speak naturally — mix languages if you like." />
      <div className="mb-5 max-w-md">
        <LanguagePicker value={lang} onChange={setLang} />
      </div>
      {!offline.online && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-warning p-3 text-warning-foreground">
          <CloudOff className="size-5" /> You are offline. Commands are saved on this phone and will
          sync automatically.
        </div>
      )}
      {offline.queue.length > 0 && offline.online && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-accent p-3">
          <span>
            {offline.queue.length} offline entr{offline.queue.length > 1 ? "ies" : "y"} waiting
          </span>
          <Button size="sm" onClick={() => void offline.sync()}>
            Sync now
          </Button>
        </div>
      )}
      <div className="flex flex-col items-center rounded-3xl border bg-card px-4 py-8 shadow-soft">
        <button
          type="button"
          onClick={() => (rec.listening ? rec.stop() : rec.start())}
          disabled={busy}
          aria-label={rec.listening ? "Stop listening" : "Start speaking"}
          className={cn(
            "grid size-32 place-items-center rounded-full bg-saffron text-primary-foreground shadow-mic transition active:scale-95 disabled:opacity-60",
            rec.listening && "animate-mic",
          )}
        >
          {rec.listening ? <Square className="size-12" /> : <Mic className="size-14" />}
        </button>
        <div className="mt-5 flex h-8 items-end gap-1" aria-hidden>
          {rec.listening
            ? [0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-primary animate-bar"
                  style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
                />
              ))
            : null}
        </div>
        <p className="min-h-7 text-center text-lg font-medium">
          {rec.listening
            ? rec.interim || "Listening…"
            : busy
              ? "Agents are working…"
              : "Tap the mic and speak"}
        </p>
        {rec.error && <p className="mt-1 text-center text-sm text-destructive">{rec.error}</p>}
        {!rec.supported && (
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Voice input needs Chrome or Edge. You can type below.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
          className="mt-5 flex w-full max-w-xl gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or type: sold 5 bread to Ramesh on udhar"
            className="h-12 rounded-xl text-base"
          />
          <Button type="submit" size="lg" disabled={busy || !text.trim()} aria-label="Send">
            <Send />
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {examples[lang].map((ex) => (
            <button
              key={ex}
              onClick={() => void send(ex)}
              disabled={busy}
              className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-accent"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {turns.map((t) => (
          <div key={t.id} className="rounded-2xl border bg-card p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">You said</p>
            <p className="mb-3 text-lg font-medium">“{t.text}”</p>
            {t.queued && <Badge variant="secondary">Saved offline — will sync</Badge>}
            {t.error && <p className="text-destructive">{t.error}</p>}
            {!t.result && !t.queued && !t.error && (
              <p className="text-muted-foreground">Thinking…</p>
            )}
            {t.result && (
              <>
                <div
                  className={cn(
                    "mb-3 flex items-start gap-3 rounded-xl p-3",
                    t.result.status === "done"
                      ? "bg-success/10"
                      : t.result.status === "pending"
                        ? "bg-warning/30"
                        : t.result.status === "cancelled"
                          ? "bg-muted"
                          : "bg-destructive/10",
                  )}
                >
                  <p className="flex-1 text-[1.05rem] font-medium">{t.result.reply}</p>
                  <button
                    aria-label="Repeat reply aloud"
                    onClick={() => speak(t.result!.reply, lang)}
                  >
                    <Volume2 className="size-5 text-muted-foreground" />
                  </button>
                </div>
                {t.result.status === "pending" && (
                  <div className="mb-3 flex gap-2">
                    <Button
                      variant="success"
                      size="lg"
                      onClick={() => void decide(t.id, t.result!.runId, true)}
                      disabled={busy}
                    >
                      <Check /> Yes, save it
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => void decide(t.id, t.result!.runId, false)}
                      disabled={busy}
                    >
                      <X /> Cancel
                    </Button>
                  </div>
                )}
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground">
                    How the agents handled it{" "}
                    {t.result.mode === "demo" && (
                      <Badge variant="outline" className="ml-2">
                        Demo mode
                      </Badge>
                    )}
                  </summary>
                  <div className="mt-3">
                    <AgentSteps steps={t.result.steps} />
                  </div>
                </details>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
