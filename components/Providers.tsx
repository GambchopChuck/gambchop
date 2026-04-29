'use client'

import { AuthProvider } from '@/lib/auth-context'
import AuthModals from './AuthModals'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import SubNav from './SubNav'
import { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <SubNav />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, paddingLeft: 64 }}>
          {children}
        </main>
      </div>
      <AuthModals />
    </AuthProvider>
  )
}
