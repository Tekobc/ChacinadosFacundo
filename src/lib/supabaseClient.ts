import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://ewvcqxjzqgqsjeftstcg.supabase.co'

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'sb_publishable_DvbHs5hFvCsl1Gp-8xBdUA_Vd1kcAvI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

