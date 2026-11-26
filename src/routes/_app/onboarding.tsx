import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useInvalidateAll } from "@/hooks/use-shop-data";
import { pageHead } from "@/components/app/page-header";
import { LanguagePicker } from "@/components/app/language-picker";
import type { Lang } from "@/hooks/use-voice";

export const Route = createFileRoute("/_app/onboarding")({
  head: pageHead("Set up your shop", "Register your shop profile and language."),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const invalidate = useInvalidateAll();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", owner_name: "", city: "", phone: "" });
  const [lang, setLang] = useState<Lang>("hi");
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("shops")
      .insert({ ...f, owner_id: user.id, language: lang });
    if (!error && demo) {
      const r = await supabase.rpc("seed_demo_data");
      if (r.error) toast.error(r.error.message);
    }
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.refetchQueries({ queryKey: ["shop"] });
    invalidate();
    toast.success("Your shop is ready!");
    nav({ to: "/dashboard" });
  };
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-2 h-2 rounded-full bg-awning" />
      <h1 className="mt-6 text-4xl font-bold">Set up your shop</h1>
      <p className="mb-6 text-muted-foreground">Tell us a little about your dukaan.</p>
      <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <div>
          <Label>Shop name</Label>
          <Input
            required
            className="h-11"
            placeholder="Shree Ganesh Kirana Store"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Your name</Label>
          <Input
            className="h-11"
            value={f.owner_name}
            onChange={(e) => setF({ ...f, owner_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City / village</Label>
            <Input
              className="h-11"
              value={f.city}
              onChange={(e) => setF({ ...f, city: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              className="h-11"
              inputMode="tel"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Language for voice</Label>
          <LanguagePicker value={lang} onChange={setLang} />
        </div>
        <label className="flex items-center justify-between rounded-xl bg-muted p-3">
          <span>
            <span className="block font-medium">Load sample shop data</span>
            <span className="text-sm text-muted-foreground">
              14 products, 3 weeks of sales, udhar customers
            </span>
          </span>
          <Switch checked={demo} onCheckedChange={setDemo} />
        </label>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
          {busy ? "Setting up…" : "Open my dukaan"}
        </Button>
      </form>
    </div>
  );
}
