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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          created_at: string | null
          id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_applications: {
        Row: {
          account_name: string | null
          account_number: string | null
          account_type: string | null
          amount_received: number | null
          application_date: string | null
          approval_date: string | null
          approved_by: string | null
          bank_name: string | null
          draft: boolean | null
          guarantor_1_member_number: string | null
          guarantor_1_name: string | null
          guarantor_1_phone: string | null
          guarantor_2_member_number: string | null
          guarantor_2_name: string | null
          guarantor_2_phone: string | null
          id: string
          interest_amount: number | null
          loan_type: Database["public"]["Enums"]["loan_type"]
          monthly_income: number | null
          monthly_payment: number | null
          notes: string | null
          purpose: string
          repayment_period: number | null
          requested_amount: number
          status: Database["public"]["Enums"]["application_status"]
          terms_accepted: boolean | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          account_type?: string | null
          amount_received?: number | null
          application_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          bank_name?: string | null
          draft?: boolean | null
          guarantor_1_member_number?: string | null
          guarantor_1_name?: string | null
          guarantor_1_phone?: string | null
          guarantor_2_member_number?: string | null
          guarantor_2_name?: string | null
          guarantor_2_phone?: string | null
          id?: string
          interest_amount?: number | null
          loan_type: Database["public"]["Enums"]["loan_type"]
          monthly_income?: number | null
          monthly_payment?: number | null
          notes?: string | null
          purpose: string
          repayment_period?: number | null
          requested_amount: number
          status?: Database["public"]["Enums"]["application_status"]
          terms_accepted?: boolean | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          account_type?: string | null
          amount_received?: number | null
          application_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          bank_name?: string | null
          draft?: boolean | null
          guarantor_1_member_number?: string | null
          guarantor_1_name?: string | null
          guarantor_1_phone?: string | null
          guarantor_2_member_number?: string | null
          guarantor_2_name?: string | null
          guarantor_2_phone?: string | null
          id?: string
          interest_amount?: number | null
          loan_type?: Database["public"]["Enums"]["loan_type"]
          monthly_income?: number | null
          monthly_payment?: number | null
          notes?: string | null
          purpose?: string
          repayment_period?: number | null
          requested_amount?: number
          status?: Database["public"]["Enums"]["application_status"]
          terms_accepted?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_guarantor_approvals: {
        Row: {
          applicant_member_id: string
          applicant_name: string
          created_at: string | null
          expires_at: string
          guarantor_member_id: string
          guarantor_name: string
          guarantor_position: number
          guarantor_user_id: string | null
          id: string
          loan_amount: number
          loan_application_number: string | null
          loan_id: string | null
          loan_type: Database["public"]["Enums"]["loan_type"]
          response_date: string | null
          response_reason: string | null
          status: string
        }
        Insert: {
          applicant_member_id: string
          applicant_name: string
          created_at?: string | null
          expires_at?: string
          guarantor_member_id: string
          guarantor_name: string
          guarantor_position: number
          guarantor_user_id?: string | null
          id?: string
          loan_amount: number
          loan_application_number?: string | null
          loan_id?: string | null
          loan_type: Database["public"]["Enums"]["loan_type"]
          response_date?: string | null
          response_reason?: string | null
          status?: string
        }
        Update: {
          applicant_member_id?: string
          applicant_name?: string
          created_at?: string | null
          expires_at?: string
          guarantor_member_id?: string
          guarantor_name?: string
          guarantor_position?: number
          guarantor_user_id?: string | null
          id?: string
          loan_amount?: number
          loan_application_number?: string | null
          loan_id?: string | null
          loan_type?: Database["public"]["Enums"]["loan_type"]
          response_date?: string | null
          response_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_guarantor_approvals_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string | null
          id: string
          interest_rate: number
          loan_type: Database["public"]["Enums"]["loan_type"]
          monthly_payment: number | null
          next_payment_date: string | null
          outstanding_balance: number
          principal_amount: number
          repayment_period: number
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interest_rate: number
          loan_type: Database["public"]["Enums"]["loan_type"]
          monthly_payment?: number | null
          next_payment_date?: string | null
          outstanding_balance: number
          principal_amount: number
          repayment_period: number
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interest_rate?: number
          loan_type?: Database["public"]["Enums"]["loan_type"]
          monthly_payment?: number | null
          next_payment_date?: string | null
          outstanding_balance?: number
          principal_amount?: number
          repayment_period?: number
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read_status: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read_status?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read_status?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          address: string | null
          alternative_phone: string | null
          bank_name: string | null
          bvn: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string | null
          designation: string | null
          email: string
          email_notifications: boolean | null
          full_name: string
          gender: string | null
          id: string
          member_number: string | null
          next_of_kin_address: string | null
          next_of_kin_email: string | null
          next_of_kin_name: string | null
          next_of_kin_phone: string | null
          next_of_kin_relationship: string | null
          phone: string | null
          profile_photo_url: string | null
          sms_notifications: boolean | null
          staff_id: string | null
          state_of_deployment: string | null
          state_of_residence: string | null
          updated_at: string | null
          years_of_service: number | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          address?: string | null
          alternative_phone?: string | null
          bank_name?: string | null
          bvn?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          email: string
          email_notifications?: boolean | null
          full_name: string
          gender?: string | null
          id: string
          member_number?: string | null
          next_of_kin_address?: string | null
          next_of_kin_email?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          sms_notifications?: boolean | null
          staff_id?: string | null
          state_of_deployment?: string | null
          state_of_residence?: string | null
          updated_at?: string | null
          years_of_service?: number | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          address?: string | null
          alternative_phone?: string | null
          bank_name?: string | null
          bvn?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          email?: string
          email_notifications?: boolean | null
          full_name?: string
          gender?: string | null
          id?: string
          member_number?: string | null
          next_of_kin_address?: string | null
          next_of_kin_email?: string | null
          next_of_kin_name?: string | null
          next_of_kin_phone?: string | null
          next_of_kin_relationship?: string | null
          phone?: string | null
          profile_photo_url?: string | null
          sms_notifications?: boolean | null
          staff_id?: string | null
          state_of_deployment?: string | null
          state_of_residence?: string | null
          updated_at?: string | null
          years_of_service?: number | null
        }
        Relationships: []
      }
      special_contribution_deductions: {
        Row: {
          amount: number
          contribution_id: string
          created_at: string | null
          deduction_date: string | null
          deduction_month: number
          deduction_year: number
          id: string
          reference_number: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contribution_id: string
          created_at?: string | null
          deduction_date?: string | null
          deduction_month: number
          deduction_year: number
          id?: string
          reference_number?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contribution_id?: string
          created_at?: string | null
          deduction_date?: string | null
          deduction_month?: number
          deduction_year?: number
          id?: string
          reference_number?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_contribution_deductions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "special_contributions"
            referencedColumns: ["id"]
          },
        ]
      }
      special_contributions: {
        Row: {
          account_name: string
          account_number: string
          application_status: Database["public"]["Enums"]["contribution_status"]
          approved_by: string | null
          approved_date: string | null
          balance: number | null
          bank_name: string
          contribution_year: number
          created_at: string | null
          department: string | null
          duration_months: number
          id: string
          maturity_date: string | null
          member_number: string | null
          monthly_amount: number
          purpose_category: Database["public"]["Enums"]["contribution_purpose"]
          purpose_description: string | null
          state_of_assignment: string | null
          total_contributed: number | null
          total_expected: number | null
          updated_at: string | null
          user_id: string
          withdrawal_amount: number | null
          withdrawal_date: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          application_status?: Database["public"]["Enums"]["contribution_status"]
          approved_by?: string | null
          approved_date?: string | null
          balance?: number | null
          bank_name: string
          contribution_year: number
          created_at?: string | null
          department?: string | null
          duration_months?: number
          id?: string
          maturity_date?: string | null
          member_number?: string | null
          monthly_amount: number
          purpose_category: Database["public"]["Enums"]["contribution_purpose"]
          purpose_description?: string | null
          state_of_assignment?: string | null
          total_contributed?: number | null
          total_expected?: number | null
          updated_at?: string | null
          user_id: string
          withdrawal_amount?: number | null
          withdrawal_date?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          application_status?: Database["public"]["Enums"]["contribution_status"]
          approved_by?: string | null
          approved_date?: string | null
          balance?: number | null
          bank_name?: string
          contribution_year?: number
          created_at?: string | null
          department?: string | null
          duration_months?: number
          id?: string
          maturity_date?: string | null
          member_number?: string | null
          monthly_amount?: number
          purpose_category?: Database["public"]["Enums"]["contribution_purpose"]
          purpose_description?: string | null
          state_of_assignment?: string | null
          total_contributed?: number | null
          total_expected?: number | null
          updated_at?: string | null
          user_id?: string
          withdrawal_amount?: number | null
          withdrawal_date?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_number: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_number?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_number?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      recalculate_account_balance: {
        Args: {
          p_account_type: Database["public"]["Enums"]["account_type"]
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_status: "active" | "inactive" | "closed"
      account_type: "savings" | "loan"
      app_role: "member" | "admin" | "loan_officer"
      application_status: "pending" | "approved" | "rejected"
      contribution_purpose:
        | "emergency_fund"
        | "house_purchase"
        | "car_purchase"
        | "children_education"
        | "wedding"
        | "medical"
        | "business_capital"
        | "end_of_year_expenses"
        | "other"
      contribution_status:
        | "draft"
        | "pending"
        | "approved"
        | "active"
        | "completed"
        | "rejected"
        | "cancelled"
      loan_status: "pending" | "approved" | "active" | "closed" | "rejected"
      loan_type: "normal" | "trade" | "special" | "long_term"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "loan_disbursement"
        | "repayment"
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
      account_status: ["active", "inactive", "closed"],
      account_type: ["savings", "loan"],
      app_role: ["member", "admin", "loan_officer"],
      application_status: ["pending", "approved", "rejected"],
      contribution_purpose: [
        "emergency_fund",
        "house_purchase",
        "car_purchase",
        "children_education",
        "wedding",
        "medical",
        "business_capital",
        "end_of_year_expenses",
        "other",
      ],
      contribution_status: [
        "draft",
        "pending",
        "approved",
        "active",
        "completed",
        "rejected",
        "cancelled",
      ],
      loan_status: ["pending", "approved", "active", "closed", "rejected"],
      loan_type: ["normal", "trade", "special", "long_term"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "loan_disbursement",
        "repayment",
      ],
    },
  },
} as const
