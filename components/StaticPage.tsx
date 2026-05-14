import type { ReactNode } from 'react'

interface StaticPageProps {
  title: string
  kicker?: string
  lastUpdated?: string
  children: ReactNode
}

export default function StaticPage({ title, kicker, lastUpdated, children }: StaticPageProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace' }}>
      <div style={{ borderBottom: '1px solid #1a1a24', padding: '40px 24px 28px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {kicker ? (
            <div style={{ fontSize: 9, color: '#22c55e', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
              {kicker}
            </div>
          ) : null}
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>
            {title}
          </h1>
          {lastUpdated ? (
            <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10 }}>
              Last updated: {lastUpdated}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px 60px' }}>
        <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.85, letterSpacing: '0.01em' }}>
          {children}
        </div>
      </div>
    </div>
  )
}