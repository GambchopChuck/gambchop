import type { Metadata } from 'next'
import { Suspense } from 'react'
import TrendsClient from './TrendsClient'

export const metadata: Metadata = {
  title: 'Trends | Gambchop',
  description: 'MLB team batting trends — game-by-game performance vs season averages.',
}

export default function TrendsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#08080d' }} />}>
      <TrendsClient />
    </Suspense>
  )
}
