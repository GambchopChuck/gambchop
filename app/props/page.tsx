import type { Metadata } from 'next'
import { Suspense } from 'react'
import PropsClient from './PropsClient'

export const metadata: Metadata = {
  title: 'Props | Gambchop',
  description: 'MLB team prop line charts — HR, Hits, Runs, Strikeouts, Walks. Set your line, see the history.',
}

export default function PropsPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#08080d' }} />}>
      <PropsClient />
    </Suspense>
  )
}
