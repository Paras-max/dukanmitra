import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, pageHead } from "@/components/app/page-header";
import { LanguagePicker } from "@/components/app/language-picker";
import { supabase } from "@/integrations/supabase/client";
import { useShop, useInvalidateAll } from "@/hooks/use-shop-data";
import { speak, type Lang } from "@/hooks/use-voice";

export const Route = createFileRoute("/_app/settings")({
  head: pageHead("Settings", "Shop profile, language and voice settings."),
  component: Settings,
});

function Settings() {
  const shop = useShop();
  const invalidate = useInvalidateAll();
  const nav = useNavigate();
  const [f, setF] = useState({
    name: "",
    owner_name: "",
    city: "",
    phone: "",
    language: "en" as Lang,
    voice_replies: true,
  });
  useEffect(() => {
    if (shop.data)
      setF({
        name: shop.data.name,
        owner_name: shop.data.owner_name,
        city: shop.data.city,
        phone: shop.data.phone,
        language: shop.data.language as Lang,
        voice_replies: shop.data.voice_replies,
      });
  }, [shop.data]);
  const save = async () => {
    if (!shop.data) return;
    const { error } = await supabase.from("shops").update(f).eq("id", shop.data.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    invalidate();
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/" });
  };
  const loadDemo = async () => {
    const r = await supabase.rpc("seed_demo_data");
    if (r.error) toast.error(r.error.message);
    else {
      toast.success("Sample data loaded (skipped if you already have products)");
      invalidate();
    }
  };
  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" />
      <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-xl font-semibold">Shop profile</h2>
        <div>
          <Label>Shop name</Label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <Label>Owner name</Label>
          <Input
            value={f.owner_name}
            onChange={(e) => setF({ ...f, owner_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City</Label>
            <Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Default language</Label>
          <LanguagePicker value={f.language} onChange={(language) => setF({ ...f, language })} />
        </div>
        <label className="flex items-center justify-between rounded-xl bg-muted p-3">
          <span>Speak replies aloud</span>
          <Switch
            checked={f.voice_replies}
            onCheckedChange={(voice_replies) => setF({ ...f, voice_replies })}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="hero" onClick={() => void save()}>
            Save changes
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              speak(
                f.language === "hi"
                  ? "नमस्ते, मैं दुकानमित्र हूँ।"
                  : f.language === "mr"
                    ? "नमस्कार, मी दुकानमित्र आहे."
                    : "Hello, I am DukaanMitra.",
                f.language,
              )
            }
          >
            Test voice
          </Button>
        </div>
      </div>
      <div className="mt-4 space-y-3 rounded-2xl border bg-card p-5">
        <h2 className="text-xl font-semibold">Data</h2>
        <Button variant="outline" onClick={() => void loadDemo()}>
          Load sample shop data
        </Button>
        <Button variant="destructive" className="ml-2" onClick={() => void signOut()}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}
