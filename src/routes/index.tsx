import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Mic, Package, IndianRupee, Users, Brain, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import hero from "@/assets/shopkeeper-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DukaanMitra — Bolo aur dukaan chalao" },
      {
        name: "description",
        content:
          "Voice-first business assistant for kirana shops. Record sales, stock, udhar and profit by speaking in English, Hindi or Marathi.",
      },
      { property: "og:title", content: "DukaanMitra — Bolo aur dukaan chalao" },
      {
        property: "og:description",
        content: "Voice-first business assistant for kirana shops in English, Hindi and Marathi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Mic,
    title: "Speak, don't type",
    text: "“Aaj 10 doodh bech diye” — done. English, हिंदी, मराठी.",
  },
  {
    icon: Package,
    title: "Stock that updates itself",
    text: "Every sale lowers stock. Low items are flagged.",
  },
  { icon: Users, title: "Udhar khata", text: "Know who owes what, and send reminders." },
  { icon: Brain, title: "Smart forecasting", text: "Know what will run out before it does." },
  {
    icon: ShieldCheck,
    title: "Checks before saving",
    text: "Money entries are verified and confirmed.",
  },
  { icon: IndianRupee, title: "Daily profit", text: "Sales, expenses and profit in one glance." },
];

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard" });
  }, [user, loading, nav]);
  return (
    <div className="min-h-screen bg-background">
      <div className="h-3 bg-awning" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-saffron text-primary-foreground">
            <Mic className="size-5" />
          </div>
          <span className="font-display text-2xl font-bold">DukaanMitra</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
            आपकी दुकान का AI साथी
          </p>
          <h1 className="text-5xl font-extrabold leading-[1.05] md:text-6xl">
            Bolo aur <span className="text-primary">dukaan</span> chalao.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Record sales, stock, udhar and expenses just by speaking. A team of AI helpers keeps
            your books right.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="xl">
              <Link to="/auth">
                <Mic /> Start free
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/auth" search={{ mode: "signin" }}>
                I have an account
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <img
            src={hero}
            alt="Kirana shopkeeper speaking to his phone at the counter"
            width={1280}
            height={960}
            className="rounded-3xl shadow-soft"
          />
          <div className="absolute -bottom-5 left-4 right-4 rounded-2xl border bg-card p-4 shadow-soft md:left-auto md:w-80">
            <p className="text-sm text-muted-foreground">You said</p>
            <p className="font-medium">“I sold 10 milk packets today”</p>
            <p className="mt-2 text-sm text-success">✓ Sale recorded · 20 packets left</p>
          </div>
        </div>
      </main>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-5">
            <f.icon className="mb-3 size-7 text-secondary" />
            <h3 className="text-xl font-semibold">{f.title}</h3>
            <p className="text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
