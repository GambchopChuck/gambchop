import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // Bypass the browser fetch cache so every chart load hits Supabase directly.
    fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
  },
})
