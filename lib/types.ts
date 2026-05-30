export interface Profile {
  id: string
  user_id: string
  name: string
  age: number | null
  city: string | null
  bio: string | null
  cloudflare_video_id: string | null
  video_thumbnail_url: string | null
  likes_count: number
  is_premium: boolean
  created_at: string
  updated_at: string
}

export interface ContactRequest {
  id: string
  profile_id: string
  sender_name: string
  sender_email: string
  company: string | null
  message: string
  created_at: string
}

export type ProfileInsert = {
  user_id: string
  name: string
  age?: number | null
  city?: string | null
  bio?: string | null
  cloudflare_video_id?: string | null
  video_thumbnail_url?: string | null
  likes_count?: number
  is_premium?: boolean
}

export type ProfileUpdate = Partial<{
  name: string
  age: number | null
  city: string | null
  bio: string | null
  cloudflare_video_id: string | null
  video_thumbnail_url: string | null
  likes_count: number
  is_premium: boolean
}>

export type ContactInsert = {
  profile_id: string
  sender_name: string
  sender_email: string
  company?: string | null
  message: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      contact_requests: {
        Row: ContactRequest
        Insert: ContactInsert
        Update: Partial<ContactInsert>
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_likes: {
        Args: { p_id: string; delta: number }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
