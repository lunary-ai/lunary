export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      app: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_owner_fkey"
            columns: ["owner"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      app_user: {
        Row: {
          app: string | null
          created_at: string | null
          external_id: string | null
          id: number
          last_seen: string | null
          props: Json | null
        }
        Insert: {
          app?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: number
          last_seen?: string | null
          props?: Json | null
        }
        Update: {
          app?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: number
          last_seen?: string | null
          props?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "app_user_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          }
        ]
      }
      log: {
        Row: {
          app: string
          created_at: string | null
          extra: Json | null
          id: number
          level: string | null
          message: string | null
          run: string | null
        }
        Insert: {
          app: string
          created_at?: string | null
          extra?: Json | null
          id: number
          level?: string | null
          message?: string | null
          run?: string | null
        }
        Update: {
          app?: string
          created_at?: string | null
          extra?: Json | null
          id?: number
          level?: string | null
          message?: string | null
          run?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_run_fkey"
            columns: ["run"]
            referencedRelation: "run"
            referencedColumns: ["id"]
          }
        ]
      }
      profile: {
        Row: {
          email: string | null
          id: string
          name: string | null
          plan: string
          updated_at: string | null
        }
        Insert: {
          email?: string | null
          id: string
          name?: string | null
          plan?: string
          updated_at?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string | null
          plan?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      run: {
        Row: {
          app: string | null
          completion_tokens: number | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          id: string
          input: Json | null
          name: string | null
          output: Json | null
          params: Json | null
          parent_run: string | null
          prompt_tokens: number | null
          status: string | null
          tags: string[] | null
          type: string
          user: number | null
        }
        Insert: {
          app?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          name?: string | null
          output?: Json | null
          params?: Json | null
          parent_run?: string | null
          prompt_tokens?: number | null
          status?: string | null
          tags?: string[] | null
          type: string
          user?: number | null
        }
        Update: {
          app?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          name?: string | null
          output?: Json | null
          params?: Json | null
          parent_run?: string | null
          prompt_tokens?: number | null
          status?: string | null
          tags?: string[] | null
          type?: string
          user?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "run_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_parent_run_fkey"
            columns: ["parent_run"]
            referencedRelation: "run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_user_fkey"
            columns: ["user"]
            referencedRelation: "app_user"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_related_runs: {
        Args: {
          run_id: string
        }
        Returns: {
          created_at: string
          tags: string[]
          app: string
          id: string
          status: string
          name: string
          ended_at: string
          error: Json
          input: Json
          output: Json
          params: Json
          type: string
          parent_run: string
          completion_tokens: number
          prompt_tokens: number
        }[]
      }
      get_runs_usage: {
        Args: {
          app_id: string
          days: number
          user_id?: number
        }
        Returns: {
          name: string
          type: string
          completion_tokens: number
          prompt_tokens: number
          errors: number
          success: number
        }[]
      }
      get_runs_usage_by_user: {
        Args: {
          app_id: string
          days: number
        }
        Returns: {
          user_id: number
          name: string
          type: string
          completion_tokens: number
          prompt_tokens: number
          errors: number
          success: number
        }[]
      }
      get_runs_usage_daily: {
        Args: {
          app_id: string
          days: number
          user_id?: number
        }
        Returns: {
          date: string
          name: string
          type: string
          completion_tokens: number
          prompt_tokens: number
          errors: number
          success: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

