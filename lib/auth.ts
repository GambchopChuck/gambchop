import { supabase } from '@/lib/supabase'

// Lightweight wrappers — use useAuth() for reactive state inside React components.
// These are async helpers for non-component code or one-shot checks in Step 2.2+.

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, is_pro, pro_since, pro_expires_at, stripe_customer_id, created_at, updated_at')
    .eq('id', userId)
    .single()
  return data
}

export async function updateDisplayName(userId: string, displayName: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
  return error
}
