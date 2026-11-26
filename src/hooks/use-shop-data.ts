import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type Sale = Tables<"sales">;
export type Customer = Tables<"customers">;
export type Expense = Tables<"expenses">;
export type Shop = Tables<"shops">;

const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

export const useShop = () =>
  useQuery({
    queryKey: ["shop"],
    queryFn: async () => (await supabase.from("shops").select("*").maybeSingle()).data,
  });
export const useProducts = () =>
  useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("name")).data ?? [],
  });
export const useCustomers = () =>
  useQuery({
    queryKey: ["customers"],
    queryFn: async () =>
      (await supabase.from("customers").select("*").order("balance", { ascending: false })).data ??
      [],
  });
export const useSales = (days = 28) =>
  useQuery({
    queryKey: ["sales", days],
    queryFn: async () =>
      (
        await supabase
          .from("sales")
          .select("*")
          .gte("created_at", since(days))
          .order("created_at", { ascending: false })
          .limit(1000)
      ).data ?? [],
  });
export const useExpenses = (days = 28) =>
  useQuery({
    queryKey: ["expenses", days],
    queryFn: async () =>
      (
        await supabase
          .from("expenses")
          .select("*")
          .gte("created_at", since(days))
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
export const useAgentRuns = () =>
  useQuery({
    queryKey: ["agent_runs"],
    queryFn: async () =>
      (
        await supabase
          .from("agent_runs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    ["products", "customers", "sales", "expenses", "agent_runs", "shop"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const profitOf = (s: Sale) => Number(s.total) - Number(s.cost_price) * Number(s.quantity);
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
