import { useCallback, useEffect, useRef, useState } from "react";

export const speechLang = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" } as const;
export type Lang = keyof typeof speechLang;

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult:
    | ((e: {
        results: ArrayLike<
          ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function useSpeechRecognition(
  lang: Lang,
  onFinal: (text: string, confidence: number) => void,
) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<Rec | null>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Rec;
      webkitSpeechRecognition?: new () => Rec;
    };
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => recRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => Rec;
      webkitSpeechRecognition?: new () => Rec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Voice input is not supported in this browser. Please type instead.");
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new Ctor();
    rec.lang = speechLang[lang];
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let text = "";
      let final = false;
      let conf = 1;
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        text += r[0]?.transcript ?? "";
        if (r.isFinal) {
          final = true;
          conf = r[0]?.confidence ?? 1;
        }
      }
      setInterim(text);
      if (final) cb.current(text.trim(), conf);
    };
    rec.onerror = (e) => {
      setError(
        e.error === "no-speech"
          ? "I didn't hear anything. Please try again closer to the phone."
          : e.error === "not-allowed"
            ? "Microphone permission is blocked."
            : "Couldn't hear clearly. Please repeat.",
      );
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setError(null);
    setInterim("");
    setListening(true);
    rec.start();
  }, [lang]);

  const stop = useCallback(() => recRef.current?.stop(), []);
  return { listening, interim, error, supported, start, stop };
}

export function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = speechLang[lang];
  const voice =
    window.speechSynthesis.getVoices().find((v) => v.lang === speechLang[lang]) ??
    window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang));
  if (voice) u.voice = voice;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
