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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string
          data: Json
          expires_at: string
          fetched_at: string
          id: string
        }
        Insert: {
          cache_key: string
          data: Json
          expires_at: string
          fetched_at?: string
          id?: string
        }
        Update: {
          cache_key?: string
          data?: Json
          expires_at?: string
          fetched_at?: string
          id?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          id: string
          request_count: number
          usage_date: string
        }
        Insert: {
          id?: string
          request_count?: number
          usage_date?: string
        }
        Update: {
          id?: string
          request_count?: number
          usage_date?: string
        }
        Relationships: []
      }
      bonus_predictions: {
        Row: {
          answer: string
          created_at: string
          id: string
          points_awarded: number | null
          pool_id: string
          question_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          pool_id: string
          question_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          pool_id?: string
          question_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_predictions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_predictions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "bonus_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_questions: {
        Row: {
          closes_at: string
          correct_answer: string | null
          created_at: string
          id: string
          options_json: Json | null
          points: number
          question: string
          type: string
        }
        Insert: {
          closes_at: string
          correct_answer?: string | null
          created_at?: string
          id?: string
          options_json?: Json | null
          points?: number
          question: string
          type?: string
        }
        Update: {
          closes_at?: string
          correct_answer?: string | null
          created_at?: string
          id?: string
          options_json?: Json | null
          points?: number
          question?: string
          type?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          created_at: string
          detail_json: Json | null
          id: string
          match_id: string
          minute: number | null
          player_name: string | null
          team_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          detail_json?: Json | null
          id?: string
          match_id: string
          minute?: number | null
          player_name?: string | null
          team_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          detail_json?: Json | null
          id?: string
          match_id?: string
          minute?: number | null
          player_name?: string | null
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          external_id: string | null
          group: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          kickoff_utc: string
          last_updated: string | null
          needs_recalc: boolean
          points_calculated_at: string | null
          prediction_deadline_utc: string
          stage: string
          status: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          external_id?: string | null
          group?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_utc: string
          last_updated?: string | null
          needs_recalc?: boolean
          points_calculated_at?: string | null
          prediction_deadline_utc?: string
          stage?: string
          status?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          external_id?: string | null
          group?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          kickoff_utc?: string
          last_updated?: string | null
          needs_recalc?: boolean
          points_calculated_at?: string | null
          prediction_deadline_utc?: string
          stage?: string
          status?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_members: {
        Row: {
          id: string
          joined_at: string
          pool_id: string
          rival_user_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          pool_id: string
          rival_user_id?: string | null
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          pool_id?: string
          rival_user_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          pool_id: string
          reactions_json: Json | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          pool_id: string
          reactions_json?: Json | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          pool_id?: string
          reactions_json?: Json | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_messages_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "pool_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          name: string
          privacy: string
          prize_text: string | null
          scoring_rules_json: Json | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          privacy?: string
          prize_text?: string | null
          scoring_rules_json?: Json | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          privacy?: string
          prize_text?: string | null
          scoring_rules_json?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pools_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          away_pred: number | null
          created_at: string
          home_pred: number | null
          id: string
          match_id: string
          points_awarded: number | null
          pool_id: string
          updated_at: string
          user_id: string
          winner_pred: string | null
        }
        Insert: {
          away_pred?: number | null
          created_at?: string
          home_pred?: number | null
          id?: string
          match_id: string
          points_awarded?: number | null
          pool_id: string
          updated_at?: string
          user_id: string
          winner_pred?: string | null
        }
        Update: {
          away_pred?: number | null
          created_at?: string
          home_pred?: number | null
          id?: string
          match_id?: string
          points_awarded?: number | null
          pool_id?: string
          updated_at?: string
          user_id?: string
          winner_pred?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_winner_pred_fkey"
            columns: ["winner_pred"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          external_id: string | null
          flag_url: string | null
          group: string | null
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          flag_url?: string | null
          group?: string | null
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          created_at?: string
          external_id?: string | null
          flag_url?: string | null
          group?: string | null
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          allowed_email_domain: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
        }
        Insert: {
          allowed_email_domain?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
        }
        Update: {
          allowed_email_domain?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          device_info: string | null
          id: string
          login_at_utc: string
          user_id: string
        }
        Insert: {
          device_info?: string | null
          id?: string
          login_at_utc?: string
          user_id: string
        }
        Update: {
          device_info?: string | null
          id?: string
          login_at_utc?: string
          user_id?: string
        }
        Relationships: []
      }
      wk_news_cache: {
        Row: {
          away_team_name: string
          category: string
          expires_at: string
          generated_at: string
          home_team_name: string
          id: string
          match_id: string | null
          summary: string
          title: string
        }
        Insert: {
          away_team_name: string
          category: string
          expires_at?: string
          generated_at?: string
          home_team_name: string
          id?: string
          match_id?: string | null
          summary: string
          title: string
        }
        Update: {
          away_team_name?: string
          category?: string
          expires_at?: string
          generated_at?: string
          home_team_name?: string
          id?: string
          match_id?: string | null
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "wk_news_cache_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pool_member: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_pool_by_invite_code: { Args: { _code: string }; Returns: Json }
      toggle_message_reaction: {
        Args: { _emoji: string; _message_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
