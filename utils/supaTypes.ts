export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agent_run: {
        Row: {
          app: string | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          id: string
          input: Json | null
          name: string | null
          output: Json | null
          status: string | null
          tags: string[] | null
        }
        Insert: {
          app?: string | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          name?: string | null
          output?: Json | null
          status?: string | null
          tags?: string[] | null
        }
        Update: {
          app?: string | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          name?: string | null
          output?: Json | null
          status?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          }
        ]
      }
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
      llm_run: {
        Row: {
          agent_run: string | null
          app: string
          completion_tokens: number | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          id: string
          input: Json | null
          model: string | null
          output: Json | null
          params: Json | null
          prompt_tokens: number | null
          status: string | null
          tags: string[] | null
        }
        Insert: {
          agent_run?: string | null
          app: string
          completion_tokens?: number | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          model?: string | null
          output?: Json | null
          params?: Json | null
          prompt_tokens?: number | null
          status?: string | null
          tags?: string[] | null
        }
        Update: {
          agent_run?: string | null
          app?: string
          completion_tokens?: number | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          model?: string | null
          output?: Json | null
          params?: Json | null
          prompt_tokens?: number | null
          status?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_run_agent_run_fkey"
            columns: ["agent_run"]
            referencedRelation: "agent_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "llm_run_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          }
        ]
      }
      log: {
        Row: {
          agent_run: string | null
          app: string
          created_at: string | null
          extra: Json | null
          id: number
          level: string | null
          message: string | null
          tool_run: string | null
        }
        Insert: {
          agent_run?: string | null
          app: string
          created_at?: string | null
          extra?: Json | null
          id?: number
          level?: string | null
          message?: string | null
          tool_run?: string | null
        }
        Update: {
          agent_run?: string | null
          app?: string
          created_at?: string | null
          extra?: Json | null
          id?: number
          level?: string | null
          message?: string | null
          tool_run?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_agent_run_fkey"
            columns: ["agent_run"]
            referencedRelation: "agent_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_tool_run_fkey"
            columns: ["tool_run"]
            referencedRelation: "tool_run"
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
      tool_run: {
        Row: {
          agent_run: string | null
          app: string
          created_at: string | null
          ended_at: string | null
          error: Json | null
          id: string
          input: Json | null
          name: string | null
          output: Json | null
          status: string | null
        }
        Insert: {
          agent_run?: string | null
          app: string
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          name?: string | null
          output?: Json | null
          status?: string | null
        }
        Update: {
          agent_run?: string | null
          app?: string
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          name?: string | null
          output?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_run_agent_run_fkey"
            columns: ["agent_run"]
            referencedRelation: "agent_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_run_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_convos: {
        Args: {
          _app: string
          _offset?: number
        }
        Returns: {
          id: string
          app: string
          tags: string[]
          messages: number
          calls: number
          start: string
          end: string
          first_message: string
        }[]
      }
      upsert_convo: {
        Args: {
          _id: string
          _app: string
          _tags: string[]
        }
        Returns: undefined
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

