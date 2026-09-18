export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      battles: {
        Row: {
          attacker_id: string
          created_at: string
          defender_id: string | null
          id: string
          npc_id: string | null
          state: Json
          status: string
          updated_at: string
        }
        Insert: {
          attacker_id: string
          created_at?: string
          defender_id?: string | null
          id?: string
          npc_id?: string | null
          state: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attacker_id?: string
          created_at?: string
          defender_id?: string | null
          id?: string
          npc_id?: string | null
          state?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          art_key: string
          art_url: string | null
          attack: number
          cost: number
          default_art_url: string | null
          durability: number
          effect: Json | null
          flavor: string | null
          health: number
          id: string
          keywords: string[]
          name: string
          price: number
          rarity: string
          requirements: Json
          type: string
        }
        Insert: {
          art_key?: string
          art_url?: string | null
          attack?: number
          cost: number
          default_art_url?: string | null
          durability?: number
          effect?: Json | null
          flavor?: string | null
          health?: number
          id: string
          keywords?: string[]
          name: string
          price: number
          rarity?: string
          requirements?: Json
          type: string
        }
        Update: {
          art_key?: string
          art_url?: string | null
          attack?: number
          cost?: number
          default_art_url?: string | null
          durability?: number
          effect?: Json | null
          flavor?: string | null
          health?: number
          id?: string
          keywords?: string[]
          name?: string
          price?: number
          rarity?: string
          requirements?: Json
          type?: string
        }
        Relationships: []
      }
      crime_log: {
        Row: {
          cash: number
          created_at: string
          crime_id: string
          id: string
          message: string | null
          success: boolean
          user_id: string
          xp: number
        }
        Insert: {
          cash?: number
          created_at?: string
          crime_id: string
          id?: string
          message?: string | null
          success: boolean
          user_id: string
          xp?: number
        }
        Update: {
          cash?: number
          created_at?: string
          crime_id?: string
          id?: string
          message?: string | null
          success?: boolean
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      crimes: {
        Row: {
          base_success: number
          cash_max: number
          cash_min: number
          description: string
          fail_hospital_minutes: number
          id: string
          name: string
          nerve_cost: number
          stat: string
          stat_divisor: number
          xp: number
        }
        Insert: {
          base_success: number
          cash_max: number
          cash_min: number
          description: string
          fail_hospital_minutes?: number
          id: string
          name: string
          nerve_cost: number
          stat: string
          stat_divisor: number
          xp: number
        }
        Update: {
          base_success?: number
          cash_max?: number
          cash_min?: number
          description?: string
          fail_hospital_minutes?: number
          id?: string
          name?: string
          nerve_cost?: number
          stat?: string
          stat_divisor?: number
          xp?: number
        }
        Relationships: []
      }
      decks: {
        Row: {
          card_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          card_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          card_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      npcs: {
        Row: {
          blurb: string | null
          deck: string[]
          defense: number
          dexterity: number
          hospital_minutes: number
          id: string
          name: string
          reward_cash: number
          reward_xp: number
          speed: number
          strength: number
          tier: number
        }
        Insert: {
          blurb?: string | null
          deck: string[]
          defense: number
          dexterity: number
          hospital_minutes: number
          id: string
          name: string
          reward_cash: number
          reward_xp: number
          speed: number
          strength: number
          tier: number
        }
        Update: {
          blurb?: string | null
          deck?: string[]
          defense?: number
          dexterity?: number
          hospital_minutes?: number
          id?: string
          name?: string
          reward_cash?: number
          reward_xp?: number
          speed?: number
          strength?: number
          tier?: number
        }
        Relationships: []
      }
      player_cards: {
        Row: {
          card_id: string
          custom_art_url: string | null
          id: string
          quantity: number
          user_id: string
        }
        Insert: {
          card_id: string
          custom_art_url?: string | null
          id?: string
          quantity?: number
          user_id: string
        }
        Update: {
          card_id?: string
          custom_art_url?: string | null
          id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cash: number
          created_at: string
          defense: number
          dexterity: number
          energy: number
          energy_updated_at: string
          hospital_until: string | null
          level: number
          life: number
          life_updated_at: string
          losses: number
          name: string
          nerve: number
          nerve_updated_at: string
          speed: number
          strength: number
          user_id: string
          wins: number
          xp: number
        }
        Insert: {
          cash?: number
          created_at?: string
          defense?: number
          dexterity?: number
          energy?: number
          energy_updated_at?: string
          hospital_until?: string | null
          level?: number
          life?: number
          life_updated_at?: string
          losses?: number
          name: string
          nerve?: number
          nerve_updated_at?: string
          speed?: number
          strength?: number
          user_id: string
          wins?: number
          xp?: number
        }
        Update: {
          cash?: number
          created_at?: string
          defense?: number
          dexterity?: number
          energy?: number
          energy_updated_at?: string
          hospital_until?: string | null
          level?: number
          life?: number
          life_updated_at?: string
          losses?: number
          name?: string
          nerve?: number
          nerve_updated_at?: string
          speed?: number
          strength?: number
          user_id?: string
          wins?: number
          xp?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
