'use client'

import { AuthProvider } from '@/lib/auth-context'
import { FilterProvider } from '@/lib/filter-context'
import AuthModals from './AuthModals'
import Navbar from './Navbar'
import PersistentVideo from './PersistentVideo'
import Sidebar from './Sidebar'
import SubNav from './SubNav'
import { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FilterProvider>
        <Navbar />
        <SubNav />
        <div style={{ display: 'flex' }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, paddingLeft: 64 }}>
            <PersistentVideo />
            {children}
          </main>
        </div>
        <AuthModals />
      </FilterProvider>
    </AuthProvider>
  )
}
