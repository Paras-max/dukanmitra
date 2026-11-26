import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Mic,
  Package,
  Receipt,
  Users,
  IndianRupee,
  TrendingUp,
  Bot,
  Settings,
  WifiOff,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useShop } from "@/hooks/use-shop-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({ ssr: false, component: AppLayout });

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assistant", label: "Voice assistant", icon: Mic },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/sales", label: "Sales history", icon: Receipt },
  { to: "/customers", label: "Udhar / Credit", icon: Users },
  { to: "/finance", label: "Finance & profit", icon: IndianRupee },
  { to: "/forecast", label: "AI forecast", icon: TrendingUp },
  { to: "/agents", label: "Agent activity", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const mobileNav = [navItems[0], navItems[2], navItems[1], navItems[4], navItems[7]] as const;

function AppLayout() {
  const { user, loading } = useAuth();
  const shop = useShop();
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);
  useEffect(() => {
    if (user && shop.isSuccess && !shop.data && pathname !== "/onboarding")
      nav({ to: "/onboarding" });
  }, [user, shop.isSuccess, shop.data, pathname, nav]);

  if (loading || !user || shop.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading your dukaan…
      </div>
    );
  }
  if (pathname === "/onboarding") return <Outlet />;

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="h-2 bg-awning" />
        <div className="px-5 py-5">
          <p className="font-display text-2xl font-bold">DukaanMitra</p>
          <p className="truncate text-sm opacity-75">{shop.data?.name}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent font-semibold text-sidebar-primary" }}
            >
              <n.icon className="size-5" /> {n.label}
            </Link>
          ))}
        </nav>
        <OfflineBadge />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div>
            <p className="font-display text-xl font-bold leading-none">DukaanMitra</p>
            <p className="text-xs text-muted-foreground">{shop.data?.name}</p>
          </div>
          <Link to="/settings" aria-label="Settings">
            <Settings className="size-6 text-muted-foreground" />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-end border-t bg-card px-2 pb-2 pt-1 md:hidden">
        {mobileNav.map((n, i) =>
          i === 2 ? (
            <Link
              key={n.to}
              to={n.to}
              aria-label="Voice assistant"
              className="-mt-8 mx-auto grid size-16 place-items-center rounded-full bg-saffron text-primary-foreground shadow-mic"
            >
              <Mic className="size-7" />
            </Link>
          ) : (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 text-[0.7rem] text-muted-foreground",
              )}
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <n.icon className="size-5" /> {n.label.split(" ")[0]}
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}

function OfflineBadge() {
  return (
    <div className="m-3 flex items-center gap-2 rounded-xl bg-sidebar-accent px-3 py-2 text-xs opacity-80">
      <WifiOff className="size-4" /> Works offline — entries sync later
    </div>
  );
}
