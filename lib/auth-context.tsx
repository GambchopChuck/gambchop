'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Modal = 'login' | 'join' | 'pro' | null
export type MemberTier = 'none' | 'free' | 'pro'

interface AuthContextValue {
  modal: Modal
  openModal: (m: Modal) => void
  closeModal: () => void
  isMember: boolean
  isPro: boolean
  memberTier: MemberTier
  setIsMember: (v: boolean) => void
  setIsPro: (v: boolean) => void
}

const AuthContext = createContext<AuthContextValue>({
  modal: null,
  openModal: () => {},
  closeModal: () => {},
  isMember: false,
  isPro: false,
  memberTier: 'none',
  setIsMember: () => {},
  setIsPro: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [modal, setModal]       = useState<Modal>(null)
  const [isMember, setMemberState] = useState(false)
  const [isPro, setProState]    = useState(false)

  useEffect(() => {
    const pro    = localStorage.getItem('gambchop-is-pro') === 'true'
    const member = pro || localStorage.getItem('gambchop-is-member') === 'true'
    setProState(pro)
    setMemberState(member)
  }, [])

  const setIsPro = (v: boolean) => {
    setProState(v)
    if (v) setMemberState(true)
    localStorage.setItem('gambchop-is-pro', String(v))
    if (v) localStorage.setItem('gambchop-is-member', 'true')
  }

  const setIsMember = (v: boolean) => {
    setMemberState(v)
    localStorage.setItem('gambchop-is-member', String(v))
    if (!v) { setProState(false); localStorage.setItem('gambchop-is-pro', 'false') }
  }

  const memberTier: MemberTier = isPro ? 'pro' : isMember ? 'free' : 'none'

  return (
    <AuthContext.Provider value={{
      modal, openModal: setModal, closeModal: () => setModal(null),
      isMember, isPro, memberTier,
      setIsMember, setIsPro,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
