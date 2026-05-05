import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Server-side only (API routes / webhook).
// NEVER import this in any 'use client' file or expose it to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
