import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('Missing Supabase service role key')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Types for our database tables
export type Database = {
  public: {
    Tables: {
      content_sources: {
        Row: {
          id: string
          user_id: string
          name: string
          source_type: string
          source_url: string
          metadata: Record<string, any>
          processing_config: Record<string, any>
          last_sync_at: string | null
          sync_status: string
          sync_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          source_type: string
          source_url: string
          metadata?: Record<string, any>
          processing_config?: Record<string, any>
          last_sync_at?: string | null
          sync_status?: string
          sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          source_type?: string
          source_url?: string
          metadata?: Record<string, any>
          processing_config?: Record<string, any>
          last_sync_at?: string | null
          sync_status?: string
          sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content_items: {
        Row: {
          id: string
          source_id: string
          user_id: string
          external_id: string
          title: string
          description: string | null
          duration_seconds: number | null
          published_at: string | null
          raw_metadata: Record<string, any>
          processing_status: string
          processing_error: string | null
          content_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_id: string
          user_id: string
          external_id: string
          title: string
          description?: string | null
          duration_seconds?: number | null
          published_at?: string | null
          raw_metadata?: Record<string, any>
          processing_status?: string
          processing_error?: string | null
          content_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          user_id?: string
          external_id?: string
          title?: string
          description?: string | null
          duration_seconds?: number | null
          published_at?: string | null
          raw_metadata?: Record<string, any>
          processing_status?: string
          processing_error?: string | null
          content_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content_transcripts: {
        Row: {
          id: string
          content_item_id: string
          user_id: string
          transcript_type: string
          raw_text: string
          processed_text: string | null
          segments: Record<string, any>[]
          processing_version: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content_item_id: string
          user_id: string
          transcript_type: string
          raw_text: string
          processed_text?: string | null
          segments?: Record<string, any>[]
          processing_version?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content_item_id?: string
          user_id?: string
          transcript_type?: string
          raw_text?: string
          processed_text?: string | null
          segments?: Record<string, any>[]
          processing_version?: string | null
          created_at?: string
        }
      }
      generated_summaries: {
        Row: {
          id: string
          content_item_id: string
          user_id: string
          title: string
          content: string
          key_points: string[]
          ai_model: string
          generation_metadata: Record<string, any>
          version: number
          is_current_version: boolean
          created_at: string
        }
        Insert: {
          id?: string
          content_item_id: string
          user_id: string
          title: string
          content: string
          key_points: string[]
          ai_model: string
          generation_metadata?: Record<string, any>
          version?: number
          is_current_version?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          content_item_id?: string
          user_id?: string
          title?: string
          content?: string
          key_points?: string[]
          ai_model?: string
          generation_metadata?: Record<string, any>
          version?: number
          is_current_version?: boolean
          created_at?: string
        }
      }
      topics: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          parent_topic_id: string | null
          metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          parent_topic_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          parent_topic_id?: string | null
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      ai_processing_jobs: {
        Row: {
          id: string
          user_id: string
          job_type: string
          input_data: Record<string, any>
          ai_model: string | null
          tokens_input: number | null
          tokens_output: number | null
          cost_estimate: number | null
          processing_time_seconds: number | null
          status: string
          result: Record<string, any> | null
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          job_type: string
          input_data: Record<string, any>
          ai_model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          cost_estimate?: number | null
          processing_time_seconds?: number | null
          status?: string
          result?: Record<string, any> | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          job_type?: string
          input_data?: Record<string, any>
          ai_model?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          cost_estimate?: number | null
          processing_time_seconds?: number | null
          status?: string
          result?: Record<string, any> | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}