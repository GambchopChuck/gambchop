'use client'

import { useState } from 'react'
import { useFilters } from '@/lib/filter-context'
import FiltersDropdown from './FiltersDropdown'

const VIDEO_ID = 'dQw4w9WgXcQ'

const CORNER_SIZE = 18
const CORNER_W    = 2

export default function PersistentVideo() {
  const [collapsed, setCollapsed] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { activeCount } = useFilters()

  return (
    <div style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>

      {/* Video section */}
      <div style={{
        background: '#07070c',
        padding: collapsed ? '7px 24px' : '14px 24px 18px',
        transition: 'padding 0.2s',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Title bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: collapsed ? 0 : 12,
          }}>
            {/* Live dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px #22c55e, 0 0 12px #22c55e66',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 9, color: '#22c55e', letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 800 }}>
              Gambchop Daily
            </span>
            <span style={{ fontSize: 8, color: '#3f3f46', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Yesterday&apos;s Recap · Today&apos;s Preview
            </span>

            {/* Filters toggle */}
            <button
              onClick={() => setFiltersOpen(v => !v)}
              style={{
                marginLeft: 'auto', background: filtersOpen ? '#22c55e18' : 'none',
                border: `1px solid ${filtersOpen ? '#22c55e55' : '#1a1a24'}`,
                borderRadius: 5, color: filtersOpen ? '#22c55e' : '#52525b',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '4px 10px', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              }}
            >
              <span>◧</span>
              <span>Filters</span>
              {activeCount > 0 && (
                <span style={{
                  background: '#22c55e', borderRadius: '50%',
                  width: 14, height: 14, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 8, color: '#000', fontWeight: 900,
                }}>
                  {activeCount}
                </span>
              )}
            </button>

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(v => !v)}
              style={{
                background: 'none', border: '1px solid #1a1a24', borderRadius: 4,
                color: '#3f3f46', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '3px 9px', transition: 'color 0.15s, border-color 0.15s', flexShrink: 0,
              }}
            >
              {collapsed ? '▼ Expand' : '▲ Hide'}
            </button>
          </div>

          {/* Video — display:none keeps iframe mounted (no reload) */}
          <div style={{ display: collapsed ? 'none' : 'block', position: 'relative' }}>
            {/* Corner accent — top-left */}
            <div style={{ position: 'absolute', top: -3, left: -3, width: CORNER_SIZE, height: CORNER_SIZE, pointerEvents: 'none', zIndex: 2 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: CORNER_SIZE - CORNER_W, height: CORNER_W, background: '#22c55e', boxShadow: '0 0 8px #22c55e88' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: CORNER_SIZE - CORNER_W, width: CORNER_W, background: '#22c55e', boxShadow: '0 0 8px #22c55e88' }} />
            </div>
            {/* Corner accent — top-right */}
            <div style={{ position: 'absolute', top: -3, right: -3, width: CORNER_SIZE, height: CORNER_SIZE, pointerEvents: 'none', zIndex: 2 }}>
              <div style={{ position: 'absolute', top: 0, left: CORNER_SIZE - CORNER_W, right: 0, height: CORNER_W, background: '#22c55e', boxShadow: '0 0 8px #22c55e88' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: CORNER_SIZE - CORNER_W, width: CORNER_W, background: '#22c55e', boxShadow: '0 0 8px #22c55e88' }} />
            </div>
            {/* Corner accent — bottom-left */}
            <div style={{ position: 'absolute', bottom: -3, left: -3, width: CORNER_SIZE, height: CORNER_SIZE, pointerEvents: 'none', zIndex: 2 }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: CORNER_SIZE - CORNER_W, height: CORNER_W, background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf688' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, top: CORNER_SIZE - CORNER_W, width: CORNER_W, background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf688' }} />
            </div>
            {/* Corner accent — bottom-right */}
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: CORNER_SIZE, height: CORNER_SIZE, pointerEvents: 'none', zIndex: 2 }}>
              <div style={{ position: 'absolute', bottom: 0, left: CORNER_SIZE - CORNER_W, right: 0, height: CORNER_W, background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf688' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, top: CORNER_SIZE - CORNER_W, width: CORNER_W, background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf688' }} />
            </div>

            <div style={{
              position: 'relative', paddingBottom: '56.25%', height: 0,
              overflow: 'hidden', borderRadius: 8,
              border: '1px solid rgba(34,197,94,0.22)',
              boxShadow: [
                '0 0 0 1px rgba(34,197,94,0.06)',
                '0 0 24px rgba(34,197,94,0.14)',
                '0 0 56px rgba(34,197,94,0.07)',
                '0 0 110px rgba(139,92,246,0.06)',
              ].join(', '),
            }}>
              <iframe
                src={`https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1`}
                title="Gambchop Daily"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 8 }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Filters dropdown — rendered below the video */}
      {filtersOpen && <FiltersDropdown onClose={() => setFiltersOpen(false)} />}

    </div>
  )
}
