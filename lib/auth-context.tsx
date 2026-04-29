'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Modal = 'login' | 'join' | 'pro' | null

interface AuthContextValue {
  modal: Modal
  openModal: (m: Modal) => void
  closeModal: () => void
  isPro: boolean
  setIsPro: (v: boolean) => void
}

const AuthContext = createContext<AuthContextValue>({
  modal: null,
  openModal: () => {},
  closeModal: () => {},
  isPro: false,
  setIsPro: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<Modal>(null)
  const [isPro, setIsProState] = useState(false)

  useEffect(() => {
    setIsProState(localStorage.getItem('gambchop-is-pro') === 'true')
  }, [])

  const setIsPro = (v: boolean) => {
    setIsProState(v)
    localStorage.setItem('gambchop-is-pro', String(v))
  }

  return (
    <AuthContext.Provider value={{ modal, openModal: setModal, closeModal: () => setModal(null), isPro, setIsPro }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
