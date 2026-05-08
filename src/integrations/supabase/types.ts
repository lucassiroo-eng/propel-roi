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
      app_documentation: {
        Row: {
          audience: string
          category: string
          content_md: string
          display_order: number | null
          id: number
          is_published: boolean | null
          slug: string
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          audience?: string
          category: string
          content_md: string
          display_order?: number | null
          id?: number
          is_published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          audience?: string
          category?: string
          content_md?: string
          display_order?: number | null
          id?: number
          is_published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      bundle_recommendation_rules: {
        Row: {
          min_pains: number | null
          rationale: string | null
          recommended_bundle: string
          rule_id: string
          triggering_pains: string
        }
        Insert: {
          min_pains?: number | null
          rationale?: string | null
          recommended_bundle: string
          rule_id: string
          triggering_pains: string
        }
        Update: {
          min_pains?: number | null
          rationale?: string | null
          recommended_bundle?: string
          rule_id?: string
          triggering_pains?: string
        }
        Relationships: []
      }
      bundles: {
        Row: {
          bundle_name: string
          business_pepm_monthly: number | null
          business_pepm_yearly: number | null
          country: string
          enterprise_pepm_monthly: number | null
          enterprise_pepm_yearly: number | null
          floor_seats: number | null
          id: number
          included_modules: string | null
          tier: string | null
        }
        Insert: {
          bundle_name: string
          business_pepm_monthly?: number | null
          business_pepm_yearly?: number | null
          country: string
          enterprise_pepm_monthly?: number | null
          enterprise_pepm_yearly?: number | null
          floor_seats?: number | null
          id?: number
          included_modules?: string | null
          tier?: string | null
        }
        Update: {
          bundle_name?: string
          business_pepm_monthly?: number | null
          business_pepm_yearly?: number | null
          country?: string
          enterprise_pepm_monthly?: number | null
          enterprise_pepm_yearly?: number | null
          floor_seats?: number | null
          id?: number
          included_modules?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      country_defaults: {
        Row: {
          avg_loaded_hourly_cost_eur: number
          country: string
          currency: string
          source_note: string | null
        }
        Insert: {
          avg_loaded_hourly_cost_eur: number
          country: string
          currency: string
          source_note?: string | null
        }
        Update: {
          avg_loaded_hourly_cost_eur?: number
          country?: string
          currency?: string
          source_note?: string | null
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          body: string | null
          cc_email: string | null
          delivery_status: string | null
          id: string
          resend_message_id: string | null
          sent_at: string | null
          session_id: string | null
          subject: string | null
          to_email: string
        }
        Insert: {
          body?: string | null
          cc_email?: string | null
          delivery_status?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          session_id?: string | null
          subject?: string | null
          to_email: string
        }
        Update: {
          body?: string | null
          cc_email?: string | null
          delivery_status?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          session_id?: string | null
          subject?: string | null
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "roi_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      factorial_one_packs: {
        Row: {
          credits_included: number | null
          id: number
          notes: string | null
          pack_name: string | null
          price_eur_monthly: number | null
          price_eur_yearly_per_month: number | null
          segment: string | null
        }
        Insert: {
          credits_included?: number | null
          id?: number
          notes?: string | null
          pack_name?: string | null
          price_eur_monthly?: number | null
          price_eur_yearly_per_month?: number | null
          segment?: string | null
        }
        Update: {
          credits_included?: number | null
          id?: number
          notes?: string | null
          pack_name?: string | null
          price_eur_monthly?: number | null
          price_eur_yearly_per_month?: number | null
          segment?: string | null
        }
        Relationships: []
      }
      industry_benchmarks: {
        Row: {
          attach_rates: Json | null
          avg_cmrr_eur: number | null
          avg_seats: number | null
          country: string
          id: number
          median_cmrr_eur: number | null
          median_seats: number | null
          n_customers: number | null
          refreshed_at: string | null
          sector: string
        }
        Insert: {
          attach_rates?: Json | null
          avg_cmrr_eur?: number | null
          avg_seats?: number | null
          country: string
          id?: number
          median_cmrr_eur?: number | null
          median_seats?: number | null
          n_customers?: number | null
          refreshed_at?: string | null
          sector: string
        }
        Update: {
          attach_rates?: Json | null
          avg_cmrr_eur?: number | null
          avg_seats?: number | null
          country?: string
          id?: number
          median_cmrr_eur?: number | null
          median_seats?: number | null
          n_customers?: number | null
          refreshed_at?: string | null
          sector?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          available_es: boolean | null
          available_fr: boolean | null
          description: string | null
          features: string | null
          module: string
          notes: string | null
        }
        Insert: {
          available_es?: boolean | null
          available_fr?: boolean | null
          description?: string | null
          features?: string | null
          module: string
          notes?: string | null
        }
        Update: {
          available_es?: boolean | null
          available_fr?: boolean | null
          description?: string | null
          features?: string | null
          module?: string
          notes?: string | null
        }
        Relationships: []
      }
      pain_formula_vars: {
        Row: {
          auto_manual: string
          default_value_es: number | null
          default_value_fr: number | null
          default_value_other: number | null
          id: number
          is_headline: boolean
          label_en: string
          label_es: string
          label_fr: string
          pain_id: string
          sort_order: number
          source: string
          unit: string
          var_key: string
        }
        Insert: {
          auto_manual?: string
          default_value_es?: number | null
          default_value_fr?: number | null
          default_value_other?: number | null
          id?: number
          is_headline?: boolean
          label_en: string
          label_es: string
          label_fr: string
          pain_id: string
          sort_order?: number
          source?: string
          unit?: string
          var_key: string
        }
        Update: {
          auto_manual?: string
          default_value_es?: number | null
          default_value_fr?: number | null
          default_value_other?: number | null
          id?: number
          is_headline?: boolean
          label_en?: string
          label_es?: string
          label_fr?: string
          pain_id?: string
          sort_order?: number
          source?: string
          unit?: string
          var_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_formula_vars_pain_id_fkey"
            columns: ["pain_id"]
            isOneToOne: false
            referencedRelation: "pain_library"
            referencedColumns: ["pain_id"]
          },
        ]
      }
      pain_library: {
        Row: {
          benefit_driver: string | null
          benefit_type: string | null
          default_kpi: string | null
          default_value_es: number | null
          default_value_fr: number | null
          display_order: number | null
          formula_expression: string | null
          is_archived: boolean | null
          pain_description: string | null
          pain_description_es: string | null
          pain_description_fr: string | null
          pain_id: string
          pain_statement: string
          pain_statement_es: string | null
          pain_statement_fr: string | null
          persona: string
          primary_module: string | null
          sub_group: string | null
          trigger_phrases: string | null
        }
        Insert: {
          benefit_driver?: string | null
          benefit_type?: string | null
          default_kpi?: string | null
          default_value_es?: number | null
          default_value_fr?: number | null
          display_order?: number | null
          formula_expression?: string | null
          is_archived?: boolean | null
          pain_description?: string | null
          pain_description_es?: string | null
          pain_description_fr?: string | null
          pain_id: string
          pain_statement: string
          pain_statement_es?: string | null
          pain_statement_fr?: string | null
          persona: string
          primary_module?: string | null
          sub_group?: string | null
          trigger_phrases?: string | null
        }
        Update: {
          benefit_driver?: string | null
          benefit_type?: string | null
          default_kpi?: string | null
          default_value_es?: number | null
          default_value_fr?: number | null
          display_order?: number | null
          formula_expression?: string | null
          is_archived?: boolean | null
          pain_description?: string | null
          pain_description_es?: string | null
          pain_description_fr?: string | null
          pain_id?: string
          pain_statement?: string
          pain_statement_es?: string | null
          pain_statement_fr?: string | null
          persona?: string
          primary_module?: string | null
          sub_group?: string | null
          trigger_phrases?: string | null
        }
        Relationships: []
      }
      pain_module_map: {
        Row: {
          id: number
          module: string | null
          notes: string | null
          pain_id: string | null
          role: string | null
        }
        Insert: {
          id?: number
          module?: string | null
          notes?: string | null
          pain_id?: string | null
          role?: string | null
        }
        Update: {
          id?: number
          module?: string | null
          notes?: string | null
          pain_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pain_module_map_module_fkey"
            columns: ["module"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["module"]
          },
          {
            foreignKeyName: "pain_module_map_pain_id_fkey"
            columns: ["pain_id"]
            isOneToOne: false
            referencedRelation: "pain_library"
            referencedColumns: ["pain_id"]
          },
        ]
      }
      pricing: {
        Row: {
          architecture: string | null
          country: string
          credits_or_seats: string | null
          floor: string | null
          id: number
          includes_modules: string | null
          notes: string | null
          price_business_monthly: string | null
          price_business_yearly: string | null
          price_enterprise_monthly: string | null
          price_enterprise_yearly: string | null
          sku_name: string
          sku_type: string
        }
        Insert: {
          architecture?: string | null
          country: string
          credits_or_seats?: string | null
          floor?: string | null
          id?: number
          includes_modules?: string | null
          notes?: string | null
          price_business_monthly?: string | null
          price_business_yearly?: string | null
          price_enterprise_monthly?: string | null
          price_enterprise_yearly?: string | null
          sku_name: string
          sku_type: string
        }
        Update: {
          architecture?: string | null
          country?: string
          credits_or_seats?: string | null
          floor?: string | null
          id?: number
          includes_modules?: string | null
          notes?: string | null
          price_business_monthly?: string | null
          price_business_yearly?: string | null
          price_enterprise_monthly?: string | null
          price_enterprise_yearly?: string | null
          sku_name?: string
          sku_type?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_name: string | null
          country: string
          created_at: string | null
          hubspot_deal_url: string | null
          id: string
          pae_id: string
          seats: number | null
          sector: string | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          country: string
          created_at?: string | null
          hubspot_deal_url?: string | null
          id?: string
          pae_id: string
          seats?: number | null
          sector?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          country?: string
          created_at?: string | null
          hubspot_deal_url?: string | null
          id?: string
          pae_id?: string
          seats?: number | null
          sector?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reference_data_audit: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          changed_at: string | null
          changed_by: string | null
          id: number
          reason: string | null
          row_id: string
          table_name: string
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          reason?: string | null
          row_id: string
          table_name: string
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          reason?: string | null
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      roi_sessions: {
        Row: {
          created_at: string | null
          factorial_annual_cost_eur: number | null
          id: string
          pae_id: string
          pain_overrides: Json | null
          payback_months: number | null
          pdf_url: string | null
          prospect_id: string | null
          roi_eur: number | null
          roi_pct: number | null
          selected_offering: Json | null
          selected_pains: string[]
          snapshot: Json | null
          status: string | null
          total_annual_benefit_eur: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          factorial_annual_cost_eur?: number | null
          id?: string
          pae_id: string
          pain_overrides?: Json | null
          payback_months?: number | null
          pdf_url?: string | null
          prospect_id?: string | null
          roi_eur?: number | null
          roi_pct?: number | null
          selected_offering?: Json | null
          selected_pains?: string[]
          snapshot?: Json | null
          status?: string | null
          total_annual_benefit_eur?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          factorial_annual_cost_eur?: number | null
          id?: string
          pae_id?: string
          pain_overrides?: Json | null
          payback_months?: number | null
          pdf_url?: string | null
          prospect_id?: string | null
          roi_eur?: number | null
          roi_pct?: number | null
          selected_offering?: Json | null
          selected_pains?: string[]
          snapshot?: Json | null
          status?: string | null
          total_annual_benefit_eur?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roi_sessions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      similar_companies: {
        Row: {
          avg_cmrr_eur: number | null
          avg_seats: number | null
          common_addons: string | null
          core_modules_top3: string | null
          country: string
          id: number
          n_customers: number | null
          refreshed_at: string | null
          sector: string
          size_bucket: string
        }
        Insert: {
          avg_cmrr_eur?: number | null
          avg_seats?: number | null
          common_addons?: string | null
          core_modules_top3?: string | null
          country: string
          id?: number
          n_customers?: number | null
          refreshed_at?: string | null
          sector: string
          size_bucket: string
        }
        Update: {
          avg_cmrr_eur?: number | null
          avg_seats?: number | null
          common_addons?: string | null
          core_modules_top3?: string | null
          country?: string
          id?: number
          n_customers?: number | null
          refreshed_at?: string | null
          sector?: string
          size_bucket?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          manager_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          manager_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          manager_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_emails: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
