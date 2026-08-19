import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export type Admin = {
  id: string
  mobile_number: string
  password: string
  admin_name: string | null
  email: string | null
  role: string | null
  institution_id: string
  created_at: string
  last_sign_in_at: string | null
}

export type Person = {
  id: number
  name: string
  department: string | null
  dob_day: number | null
  dob_month: string
  phone_number: string | null
  created_at: string
  dob_month_num: number | null
}

export type PersonFormData = {
  name: string
  department: string
  dob_month: string
  dob_day: string
  phone_number: string
}