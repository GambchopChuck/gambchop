import { NextRequest, NextResponse } from 'next/server'

// Handles redirect URLs from Supabase emails (password reset, email confirmation).
// The URL hash (#access_token=...&type=recovery) is processed client-side by the
// Supabase JS client automatically — this route just ensures the correct page loads.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Recovery links → reset password page (which listens for PASSWORD_RECOVERY event)
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/auth/reset-password`)
  }

  // Email confirmation, magic links, or OAuth → destination or home
  return NextResponse.redirect(`${origin}${next}`)
}
