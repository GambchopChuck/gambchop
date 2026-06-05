import type { Metadata } from 'next'
import { Suspense } from 'react'
import StatsClient from './StatsClient'

export const metadata: Metadata = {
  title: 'Stats | Gambchop',
  description: 'Team and player stat lines — set your line, see the history.',
}

export default function StatsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#08080d' }} />}>
      <StatsClient />
    </Suspense>
  )
}
