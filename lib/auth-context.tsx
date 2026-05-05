'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type Modal = 'login' | 'join' | 'pro' | null
export type MemberTier = 'none' | 'free' | 'pro'

interface AuthContextValue {
  modal:        Modal
  openModal:    (m: Modal) => void
  closeModal:   () => void
  // Session-derived state
  user:         User | null
  displayName:  string | null     // from profiles.display_name
  isMember:     boolean           // true when a real Supabase session exists
  isPro:        boolean           // profiles.is_pro, localStorage as fallback
  memberTier:   MemberTier
  loading:      boolean           // true until initial getSession() resolves
  // Setters
  setIsPro:     (v: boolean) => void
  setIsMember:  (v: boolean) => void  // no-op kept for backward compat
}

const AuthContext = createContext<AuthContextValue>({
  modal: null, openModal: () => {}, closeModal: () => {},
  user: null, displayName: null,
  isMember: false, isPro: false, memberTier: 'none', loading: true,
  setIsPro: () => {}, setIsMember: () => {},
})

function readLocalPro(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('gambchop-is-pro') === 'true'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [modal,       setModal]       = useState<Modal>(null)
  const [session,     setSession]     = useState<Session | null>(null)
  const [isPro,       setProState]    = useState<boolean>(readLocalPro)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)

  async function syncProfileFromSupabase(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('is_pro, display_name')
      .eq('id', userId)
      .single()

    if (data) {
      setProState(data.is_pro)
      setDisplayName(data.display_name ?? null)
      localStorage.setItem('gambchop-is-pro', String(data.is_pro))
    } else {
      // Profile row missing — backfill from localStorage
      const localPro = readLocalPro()
      await supabase
        .from('profiles')
        .upsert({ id: userId, is_pro: localPro }, { onConflict: 'id' })
      setProState(localPro)
      setDisplayName(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session?.user) syncProfileFromSupabase(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
      if (session?.user) {
        syncProfileFromSupabase(session.user.id)
      } else {
        setProState(readLocalPro())
        setDisplayName(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const isMember = !!session
  const user     = session?.user ?? null

  const setIsPro = (v: boolean) => {
    setProState(v)
    localStorage.setItem('gambchop-is-pro', String(v))
    if (user) {
      supabase.from('profiles').upsert({ id: user.id, is_pro: v }, { onConflict: 'id' })
    }
  }

  const memberTier: MemberTier = isPro && isMember ? 'pro' : isMember ? 'free' : 'none'

  return (
    <AuthContext.Provider value={{
      modal, openModal: setModal, closeModal: () => setModal(null),
      user, displayName, isMember, isPro, memberTier, loading,
      setIsPro,
      setIsMember: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
