'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Modal = 'login' | 'join' | 'pro' | null

interface AuthContextValue {
  modal: Modal
  openModal: (m: Modal) => void
  closeModal: () => void
}

const AuthContext = createContext<AuthContextValue>({
  modal: null,
  openModal: () => {},
  closeModal: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<Modal>(null)
  return (
    <AuthContext.Provider value={{ modal, openModal: setModal, closeModal: () => setModal(null) }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
