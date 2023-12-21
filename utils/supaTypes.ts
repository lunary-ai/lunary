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
      api_key: {
        Row: {
          api_key: string
          created_at: string
          id: number
          org_id: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: number
          org_id?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: number
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_key_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "profile"
            referencedColumns: ["id"]
          }
        ]
      }
      app: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org_id: string | null
          owner: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org_id?: string | null
          owner?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string | null
          owner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_owner_fkey"
            columns: ["owner"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_owner_fkey1"
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
            foreignKeyName: "log_app_fkey1"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_run_fkey"
            columns: ["run"]
            referencedRelation: "run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_run_fkey1"
            columns: ["run"]
            referencedRelation: "run"
            referencedColumns: ["id"]
          }
        ]
      }
      org: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          limited: boolean
          name: string
          plan: Database["public"]["Enums"]["org_plan"]
          play_allowance: number
          stripe_customer: string | null
          stripe_subscription: string | null
        }
        Insert: {
          api_key?: string
          created_at?: string | null
          id?: string
          limited?: boolean
          name: string
          plan: Database["public"]["Enums"]["org_plan"]
          play_allowance?: number
          stripe_customer?: string | null
          stripe_subscription?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          limited?: boolean
          name?: string
          plan?: Database["public"]["Enums"]["org_plan"]
          play_allowance?: number
          stripe_customer?: string | null
          stripe_subscription?: string | null
        }
        Relationships: []
      }
      profile: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          org_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          team_owner: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          team_owner?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          team_owner?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profile_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_id_fkey1"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "org"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_team_owner_fkey"
            columns: ["team_owner"]
            referencedRelation: "profile"
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
          error_text: string | null
          feedback: Json | null
          id: string
          input: Json | null
          input_text: string | null
          is_public: boolean | null
          name: string | null
          output: Json | null
          output_text: string | null
          params: Json | null
          parent_run: string | null
          prompt_tokens: number | null
          retry_of: string | null
          runtime: string | null
          sibling_of: string | null
          status: string | null
          tags: string[] | null
          template_version_id: number | null
          type: string
          user: number | null
        }
        Insert: {
          app?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          error_text?: string | null
          feedback?: Json | null
          id?: string
          input?: Json | null
          input_text?: string | null
          is_public?: boolean | null
          name?: string | null
          output?: Json | null
          output_text?: string | null
          params?: Json | null
          parent_run?: string | null
          prompt_tokens?: number | null
          retry_of?: string | null
          runtime?: string | null
          sibling_of?: string | null
          status?: string | null
          tags?: string[] | null
          template_version_id?: number | null
          type: string
          user?: number | null
        }
        Update: {
          app?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          ended_at?: string | null
          error?: Json | null
          error_text?: string | null
          feedback?: Json | null
          id?: string
          input?: Json | null
          input_text?: string | null
          is_public?: boolean | null
          name?: string | null
          output?: Json | null
          output_text?: string | null
          params?: Json | null
          parent_run?: string | null
          prompt_tokens?: number | null
          retry_of?: string | null
          runtime?: string | null
          sibling_of?: string | null
          status?: string | null
          tags?: string[] | null
          template_version_id?: number | null
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
            foreignKeyName: "run_app_fkey1"
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
            foreignKeyName: "run_parent_run_fkey1"
            columns: ["parent_run"]
            referencedRelation: "run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_retry_of_fkey"
            columns: ["retry_of"]
            referencedRelation: "run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_sibling_of_fkey"
            columns: ["sibling_of"]
            referencedRelation: "run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_template_version_id_fkey"
            columns: ["template_version_id"]
            referencedRelation: "template_version"
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
      template: {
        Row: {
          app_id: string
          created_at: string | null
          group: string | null
          id: number
          mode: string | null
          name: string | null
          org_id: string
          slug: string | null
        }
        Insert: {
          app_id: string
          created_at?: string | null
          group?: string | null
          id?: number
          mode?: string | null
          name?: string | null
          org_id: string
          slug?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string | null
          group?: string | null
          id?: number
          mode?: string | null
          name?: string | null
          org_id?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_app_id_fkey"
            columns: ["app_id"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_org_id_fkey"
            columns: ["org_id"]
            referencedRelation: "org"
            referencedColumns: ["id"]
          }
        ]
      }
      template_version: {
        Row: {
          content: Json | null
          created_at: string
          extra: Json | null
          id: number
          is_draft: boolean | null
          template_id: number
          test_values: Json | null
          version: number | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          extra?: Json | null
          id?: number
          is_draft?: boolean | null
          template_id: number
          test_values?: Json | null
          version?: number | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          extra?: Json | null
          id?: number
          is_draft?: boolean | null
          template_id?: number
          test_values?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "template_version_template_id_fkey"
            columns: ["template_id"]
            referencedRelation: "template"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      app_model_name: {
        Row: {
          app: string | null
          name: string | null
          refreshed_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_app_fkey1"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          }
        ]
      }
      app_tag: {
        Row: {
          app: string | null
          refreshed_at: string | null
          tag: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_app_fkey"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_app_fkey1"
            columns: ["app"]
            referencedRelation: "app"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      get_all_feedbacks: {
        Args: {
          app_id: string
        }
        Returns: Json[]
      }
      get_convos_by_feedback: {
        Args: {
          app_id: string
          feedback_filters: Json[]
        }
        Returns: string[]
      }
      get_feedbacks: {
        Args: {
          app_id: string
        }
        Returns: string[]
      }
      get_filtered_runs: {
        Args: {
          app_id: string
          search_pattern: string
          model_names: string[]
          tag_filters: string[]
          feedback_filters: Json
        }
        Returns: {
          app: string | null
          completion_tokens: number | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          error_text: string | null
          feedback: Json | null
          id: string
          input: Json | null
          input_text: string | null
          is_public: boolean | null
          name: string | null
          output: Json | null
          output_text: string | null
          params: Json | null
          parent_run: string | null
          prompt_tokens: number | null
          retry_of: string | null
          runtime: string | null
          sibling_of: string | null
          status: string | null
          tags: string[] | null
          template_version_id: number | null
          type: string
          user: number | null
        }[]
      }
      get_model_names: {
        Args: {
          app_id: string
        }
        Returns: string[]
      }
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
          feedback: Json
        }[]
      }
      get_runs:
        | {
            Args: {
              app_id: string
              search_pattern: string
            }
            Returns: {
              app: string | null
              completion_tokens: number | null
              created_at: string | null
              ended_at: string | null
              error: Json | null
              error_text: string | null
              feedback: Json | null
              id: string
              input: Json | null
              input_text: string | null
              is_public: boolean | null
              name: string | null
              output: Json | null
              output_text: string | null
              params: Json | null
              parent_run: string | null
              prompt_tokens: number | null
              retry_of: string | null
              runtime: string | null
              sibling_of: string | null
              status: string | null
              tags: string[] | null
              template_version_id: number | null
              type: string
              user: number | null
            }[]
          }
        | {
            Args: {
              app_id: string
              search_pattern: string
              model_names: string[]
              tags_param: string[]
              feedback_param: Json[]
              users_param: string[]
            }
            Returns: {
              app: string | null
              completion_tokens: number | null
              created_at: string | null
              ended_at: string | null
              error: Json | null
              error_text: string | null
              feedback: Json | null
              id: string
              input: Json | null
              input_text: string | null
              is_public: boolean | null
              name: string | null
              output: Json | null
              output_text: string | null
              params: Json | null
              parent_run: string | null
              prompt_tokens: number | null
              retry_of: string | null
              runtime: string | null
              sibling_of: string | null
              status: string | null
              tags: string[] | null
              template_version_id: number | null
              type: string
              user: number | null
            }[]
          }
        | {
            Args: {
              app_id: string
            }
            Returns: {
              app: string | null
              completion_tokens: number | null
              created_at: string | null
              ended_at: string | null
              error: Json | null
              error_text: string | null
              feedback: Json | null
              id: string
              input: Json | null
              input_text: string | null
              is_public: boolean | null
              name: string | null
              output: Json | null
              output_text: string | null
              params: Json | null
              parent_run: string | null
              prompt_tokens: number | null
              retry_of: string | null
              runtime: string | null
              sibling_of: string | null
              status: string | null
              tags: string[] | null
              template_version_id: number | null
              type: string
              user: number | null
            }[]
          }
      get_runs_2: {
        Args: {
          app_id: string
          search_pattern: string
        }
        Returns: {
          app: string | null
          completion_tokens: number | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          error_text: string | null
          feedback: Json | null
          id: string
          input: Json | null
          input_text: string | null
          is_public: boolean | null
          name: string | null
          output: Json | null
          output_text: string | null
          params: Json | null
          parent_run: string | null
          prompt_tokens: number | null
          retry_of: string | null
          runtime: string | null
          sibling_of: string | null
          status: string | null
          tags: string[] | null
          template_version_id: number | null
          type: string
          user: number | null
        }[]
      }
      get_runs_debug: {
        Args: {
          app_id: string
          search_pattern: string
          model_names: string[]
          tags_param: string[]
          feedback_param: Json[]
          users_param: string[]
        }
        Returns: {
          app: string | null
          completion_tokens: number | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          error_text: string | null
          feedback: Json | null
          id: string
          input: Json | null
          input_text: string | null
          is_public: boolean | null
          name: string | null
          output: Json | null
          output_text: string | null
          params: Json | null
          parent_run: string | null
          prompt_tokens: number | null
          retry_of: string | null
          runtime: string | null
          sibling_of: string | null
          status: string | null
          tags: string[] | null
          template_version_id: number | null
          type: string
          user: number | null
        }[]
      }
      get_runs_raw: {
        Args: {
          app_id: string
        }
        Returns: {
          app: string | null
          completion_tokens: number | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          error_text: string | null
          feedback: Json | null
          id: string
          input: Json | null
          input_text: string | null
          is_public: boolean | null
          name: string | null
          output: Json | null
          output_text: string | null
          params: Json | null
          parent_run: string | null
          prompt_tokens: number | null
          retry_of: string | null
          runtime: string | null
          sibling_of: string | null
          status: string | null
          tags: string[] | null
          template_version_id: number | null
          type: string
          user: number | null
        }[]
      }
      get_runs_search:
        | {
            Args: {
              app_id: string
              search_pattern: string
            }
            Returns: {
              app: string | null
              completion_tokens: number | null
              created_at: string | null
              ended_at: string | null
              error: Json | null
              error_text: string | null
              feedback: Json | null
              id: string
              input: Json | null
              input_text: string | null
              is_public: boolean | null
              name: string | null
              output: Json | null
              output_text: string | null
              params: Json | null
              parent_run: string | null
              prompt_tokens: number | null
              retry_of: string | null
              runtime: string | null
              sibling_of: string | null
              status: string | null
              tags: string[] | null
              template_version_id: number | null
              type: string
              user: number | null
            }[]
          }
        | {
            Args: {
              app_id: string
            }
            Returns: {
              app: string | null
              completion_tokens: number | null
              created_at: string | null
              ended_at: string | null
              error: Json | null
              error_text: string | null
              feedback: Json | null
              id: string
              input: Json | null
              input_text: string | null
              is_public: boolean | null
              name: string | null
              output: Json | null
              output_text: string | null
              params: Json | null
              parent_run: string | null
              prompt_tokens: number | null
              retry_of: string | null
              runtime: string | null
              sibling_of: string | null
              status: string | null
              tags: string[] | null
              template_version_id: number | null
              type: string
              user: number | null
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
          days?: number
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
      get_tags: {
        Args: {
          app_id: string
        }
        Returns: string[]
      }
      get_trace_runs_roots:
        | {
            Args: {
              search_pattern: string
            }
            Returns: {
              app: string | null
              completion_tokens: number | null
              created_at: string | null
              ended_at: string | null
              error: Json | null
              error_text: string | null
              feedback: Json | null
              id: string
              input: Json | null
              input_text: string | null
              is_public: boolean | null
              name: string | null
              output: Json | null
              output_text: string | null
              params: Json | null
              parent_run: string | null
              prompt_tokens: number | null
              retry_of: string | null
              runtime: string | null
              sibling_of: string | null
              status: string | null
              tags: string[] | null
              template_version_id: number | null
              type: string
              user: number | null
            }[]
          }
        | {
            Args: {
              app_id: string
              search_pattern: string
            }
            Returns: {
              app: string | null
              completion_tokens: number | null
              created_at: string | null
              ended_at: string | null
              error: Json | null
              error_text: string | null
              feedback: Json | null
              id: string
              input: Json | null
              input_text: string | null
              is_public: boolean | null
              name: string | null
              output: Json | null
              output_text: string | null
              params: Json | null
              parent_run: string | null
              prompt_tokens: number | null
              retry_of: string | null
              runtime: string | null
              sibling_of: string | null
              status: string | null
              tags: string[] | null
              template_version_id: number | null
              type: string
              user: number | null
            }[]
          }
      get_users: {
        Args: {
          app_id: string
        }
        Returns: Record<string, unknown>[]
      }
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      test: {
        Args: {
          app_id: string
        }
        Returns: {
          app: string | null
          completion_tokens: number | null
          created_at: string | null
          ended_at: string | null
          error: Json | null
          error_text: string | null
          feedback: Json | null
          id: string
          input: Json | null
          input_text: string | null
          is_public: boolean | null
          name: string | null
          output: Json | null
          output_text: string | null
          params: Json | null
          parent_run: string | null
          prompt_tokens: number | null
          retry_of: string | null
          runtime: string | null
          sibling_of: string | null
          status: string | null
          tags: string[] | null
          template_version_id: number | null
          type: string
          user: number | null
        }[]
      }
    }
    Enums: {
      org_plan: "free" | "pro" | "unlimited" | "custom"
      user_role: "member" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

