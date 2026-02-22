export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          phone: string | null;
          timezone: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          timezone?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          timezone?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shop_members: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["shop_role"];
          department_id: string | null;
          hourly_rate: number | null;
          max_hours_per_week: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["shop_role"];
          department_id?: string | null;
          hourly_rate?: number | null;
          max_hours_per_week?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["shop_role"];
          department_id?: string | null;
          hourly_rate?: number | null;
          max_hours_per_week?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      positions: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          color: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          color?: string;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      member_positions: {
        Row: {
          id: string;
          member_id: string;
          position_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          position_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          position_id?: string;
          created_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      shifts: {
        Row: {
          id: string;
          shop_id: string;
          schedule_id: string | null;
          user_id: string | null;
          position_id: string | null;
          start_time: string;
          end_time: string;
          break_minutes: number;
          status: Database["public"]["Enums"]["shift_status"];
          is_open: boolean;
          notes: string | null;
          color: string | null;
          recurrence_group_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          schedule_id?: string | null;
          user_id?: string | null;
          position_id?: string | null;
          start_time: string;
          end_time: string;
          break_minutes?: number;
          status?: Database["public"]["Enums"]["shift_status"];
          is_open?: boolean;
          notes?: string | null;
          color?: string | null;
          recurrence_group_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          schedule_id?: string | null;
          user_id?: string | null;
          position_id?: string | null;
          start_time?: string;
          end_time?: string;
          break_minutes?: number;
          status?: Database["public"]["Enums"]["shift_status"];
          is_open?: boolean;
          notes?: string | null;
          color?: string | null;
          recurrence_group_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shift_breaks: {
        Row: {
          id: string;
          shift_id: string;
          label: string;
          duration_minutes: number;
          is_paid: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shift_id: string;
          label?: string;
          duration_minutes?: number;
          is_paid?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          shift_id?: string;
          label?: string;
          duration_minutes?: number;
          is_paid?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      shift_tags: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      shift_tag_assignments: {
        Row: {
          id: string;
          shift_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          shift_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          shift_id?: string;
          tag_id?: string;
          created_at?: string;
        };
      };
      shift_history: {
        Row: {
          id: string;
          shift_id: string;
          shop_id: string;
          action: Database["public"]["Enums"]["shift_action"];
          changed_by: string | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shift_id: string;
          shop_id: string;
          action: Database["public"]["Enums"]["shift_action"];
          changed_by?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shift_id?: string;
          shop_id?: string;
          action?: Database["public"]["Enums"]["shift_action"];
          changed_by?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
      };
      swap_requests: {
        Row: {
          id: string;
          shop_id: string;
          requester_shift_id: string;
          target_shift_id: string | null;
          requester_id: string;
          target_id: string | null;
          status: Database["public"]["Enums"]["swap_status"];
          reason: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          requester_shift_id: string;
          target_shift_id?: string | null;
          requester_id: string;
          target_id?: string | null;
          status?: Database["public"]["Enums"]["swap_status"];
          reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          requester_shift_id?: string;
          target_shift_id?: string | null;
          requester_id?: string;
          target_id?: string | null;
          status?: Database["public"]["Enums"]["swap_status"];
          reason?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      open_shift_claims: {
        Row: {
          id: string;
          shop_id: string;
          shift_id: string;
          user_id: string;
          status: Database["public"]["Enums"]["claim_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          shift_id: string;
          user_id: string;
          status?: Database["public"]["Enums"]["claim_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          shift_id?: string;
          user_id?: string;
          status?: Database["public"]["Enums"]["claim_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      time_records: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          shift_id: string | null;
          clock_in: string;
          clock_out: string | null;
          status: Database["public"]["Enums"]["time_record_status"];
          notes: string | null;
          is_manual: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          shift_id?: string | null;
          clock_in: string;
          clock_out?: string | null;
          status?: Database["public"]["Enums"]["time_record_status"];
          notes?: string | null;
          is_manual?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string;
          shift_id?: string | null;
          clock_in?: string;
          clock_out?: string | null;
          status?: Database["public"]["Enums"]["time_record_status"];
          notes?: string | null;
          is_manual?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      breaks: {
        Row: {
          id: string;
          time_record_id: string;
          start_time: string;
          end_time: string | null;
          is_paid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          time_record_id: string;
          start_time: string;
          end_time?: string | null;
          is_paid?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          time_record_id?: string;
          start_time?: string;
          end_time?: string | null;
          is_paid?: boolean;
          created_at?: string;
        };
      };
      shift_templates: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          position_id: string | null;
          start_time: string;
          end_time: string;
          break_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          position_id?: string | null;
          start_time: string;
          end_time: string;
          break_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          position_id?: string | null;
          start_time?: string;
          end_time?: string;
          break_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      schedule_templates: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      schedule_template_entries: {
        Row: {
          id: string;
          template_id: string;
          day_of_week: number;
          position_id: string | null;
          user_id: string | null;
          start_time: string;
          end_time: string;
          break_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          day_of_week: number;
          position_id?: string | null;
          user_id?: string | null;
          start_time: string;
          end_time: string;
          break_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          day_of_week?: number;
          position_id?: string | null;
          user_id?: string | null;
          start_time?: string;
          end_time?: string;
          break_minutes?: number;
          created_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          pto_accrual_rate: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          name: string;
          pto_accrual_rate?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          name?: string;
          pto_accrual_rate?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      time_off_requests: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          hours_requested: number;
          reason: string | null;
          is_paid: boolean | null;
          status: Database["public"]["Enums"]["time_off_request_status"];
          reviewed_by: string | null;
          reviewed_at: string | null;
          reviewer_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          start_date: string;
          end_date: string;
          hours_requested: number;
          reason?: string | null;
          is_paid?: boolean | null;
          status?: Database["public"]["Enums"]["time_off_request_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string;
          start_date?: string;
          end_date?: string;
          hours_requested?: number;
          reason?: string | null;
          is_paid?: boolean | null;
          status?: Database["public"]["Enums"]["time_off_request_status"];
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reviewer_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pto_balance_adjustments: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          hours: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          hours: number;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string;
          hours?: number;
          reason?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          shop_id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          body: string | null;
          data: Json;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          shop_id: string;
          user_id: string;
          type: Database["public"]["Enums"]["notification_type"];
          title: string;
          body?: string | null;
          data?: Json;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          shop_id?: string;
          user_id?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          title?: string;
          body?: string | null;
          data?: Json;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_shop_role: {
        Args: { p_shop_id: string };
        Returns: Database["public"]["Enums"]["shop_role"];
      };
      is_shop_member: {
        Args: { p_shop_id: string };
        Returns: boolean;
      };
      is_shop_admin: {
        Args: { p_shop_id: string };
        Returns: boolean;
      };
      get_pto_balance: {
        Args: { p_shop_id: string; p_user_id: string };
        Returns: Json;
      };
      get_workforce_metrics: {
        Args: {
          p_shop_id: string;
          p_user_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Json;
      };
      get_pto_ledger: {
        Args: { p_shop_id: string; p_user_id: string };
        Returns: Json;
      };
      get_team_workforce_summary: {
        Args: {
          p_shop_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      shop_role: "owner" | "manager" | "technician";
      shift_status: "draft" | "published";
      swap_status: "pending" | "approved" | "denied" | "cancelled";
      claim_status: "pending" | "approved" | "denied";
      time_record_status: "clocked_in" | "on_break" | "clocked_out";
      time_off_request_status: "pending" | "approved" | "denied" | "cancelled";
      shift_action: "create" | "update" | "delete" | "publish" | "unpublish" | "assign" | "unassign";
      notification_type:
        | "shift_published"
        | "shift_assigned"
        | "shift_updated"
        | "shift_deleted"
        | "swap_requested"
        | "swap_approved"
        | "swap_denied"
        | "open_shift_available"
        | "open_shift_claimed"
        | "open_shift_approved"
        | "open_shift_denied"
        | "clock_reminder"
        | "schedule_updated"
        | "team_invite"
        | "time_off_requested"
        | "time_off_approved"
        | "time_off_denied";
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience type helpers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
