export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "17.1";
  };
  public: {
    Tables: {
      agent_runs: {
        Row: {
          command: string;
          created_at: string;
          id: string;
          language: string;
          mode: string;
          owner_id: string;
          reply: string;
          status: string;
          steps: Json;
        };
        Insert: {
          command: string;
          created_at?: string;
          id?: string;
          language?: string;
          mode?: string;
          owner_id: string;
          reply?: string;
          status?: string;
          steps?: Json;
        };
        Update: {
          command?: string;
          created_at?: string;
          id?: string;
          language?: string;
          mode?: string;
          owner_id?: string;
          reply?: string;
          status?: string;
          steps?: Json;
        };
        Relationships: [];
      };
      credit_entries: {
        Row: {
          amount: number;
          created_at: string;
          customer_id: string;
          id: string;
          kind: string;
          note: string;
          owner_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          customer_id: string;
          id?: string;
          kind: string;
          note?: string;
          owner_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          customer_id?: string;
          id?: string;
          kind?: string;
          note?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_entries_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          balance: number;
          created_at: string;
          id: string;
          last_reminder_at: string | null;
          name: string;
          owner_id: string;
          phone: string;
        };
        Insert: {
          balance?: number;
          created_at?: string;
          id?: string;
          last_reminder_at?: string | null;
          name: string;
          owner_id: string;
          phone?: string;
        };
        Update: {
          balance?: number;
          created_at?: string;
          id?: string;
          last_reminder_at?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          description: string;
          id: string;
          owner_id: string;
        };
        Insert: {
          amount: number;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          owner_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          owner_id?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          aliases: string[];
          category: string;
          cost_price: number;
          created_at: string;
          id: string;
          min_stock: number;
          name: string;
          owner_id: string;
          price: number;
          quantity: number;
          unit: string;
        };
        Insert: {
          aliases?: string[];
          category?: string;
          cost_price?: number;
          created_at?: string;
          id?: string;
          min_stock?: number;
          name: string;
          owner_id: string;
          price?: number;
          quantity?: number;
          unit?: string;
        };
        Update: {
          aliases?: string[];
          category?: string;
          cost_price?: number;
          created_at?: string;
          id?: string;
          min_stock?: number;
          name?: string;
          owner_id?: string;
          price?: number;
          quantity?: number;
          unit?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          cost_price: number;
          created_at: string;
          customer_id: string | null;
          id: string;
          on_credit: boolean;
          owner_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          source: string;
          total: number;
          unit_price: number;
        };
        Insert: {
          cost_price?: number;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          on_credit?: boolean;
          owner_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          source?: string;
          total: number;
          unit_price: number;
        };
        Update: {
          cost_price?: number;
          created_at?: string;
          customer_id?: string | null;
          id?: string;
          on_credit?: boolean;
          owner_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          source?: string;
          total?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      shops: {
        Row: {
          city: string;
          created_at: string;
          id: string;
          language: string;
          name: string;
          owner_id: string;
          owner_name: string;
          phone: string;
          voice_replies: boolean;
        };
        Insert: {
          city?: string;
          created_at?: string;
          id?: string;
          language?: string;
          name: string;
          owner_id: string;
          owner_name?: string;
          phone?: string;
          voice_replies?: boolean;
        };
        Update: {
          city?: string;
          created_at?: string;
          id?: string;
          language?: string;
          name?: string;
          owner_id?: string;
          owner_name?: string;
          phone?: string;
          voice_replies?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_credit: {
        Args: {
          p_amount: number;
          p_customer_id: string;
          p_kind: string;
          p_note?: string;
        };
        Returns: Json;
      };
      record_sale: {
        Args: {
          p_customer_id?: string;
          p_on_credit?: boolean;
          p_product_id: string;
          p_quantity: number;
          p_source?: string;
          p_unit_price: number;
        };
        Returns: Json;
      };
      seed_demo_data: { Args: never; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
