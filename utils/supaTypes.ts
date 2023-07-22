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
          id?: number
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
          id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
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
          }
        ]
      }
    }
    Views: {
      agents: {
        Row: {
          app: string | null
          count: number | null
          name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      get_runs_usage: {
        Args: {
          app_id: string
          days: number
        }
        Returns: {
          model: string
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

