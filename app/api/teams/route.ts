import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Team } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league')
  const division = searchParams.get('division')

  let query = supabase
    .from('teams')
    .select('*')
    .order('division')
    .order('name')

  if (league) query = query.eq('league', league.toUpperCase())
  if (division) query = query.eq('division', division)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data as Team[])
}
