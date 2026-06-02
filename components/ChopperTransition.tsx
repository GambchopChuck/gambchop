'use client'

import {
  createContext, useContext, useState, useRef, useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'

// ─── Context ──────────────────────────────────────────────────────────────────

const TransitionCtx = createContext<{ warpTo: (url: string) => void }>({
  warpTo: () => {},
})

export function useChopperTransition() {
  return useContext(TransitionCtx)
}

// ─── Provider ─────────────────────────────────────────────────────────────────
//
// Timing:  200ms black fade-in  →  500ms portal expansion  →  250ms fade-out
// Route fires at the 700ms mark (end of portal expansion).
// Total: 950ms.

type Phase = 'idle' | 'fade-in' | 'portal' | 'fade-out'

export function ChopperTransitionProvider({ children }: { children: ReactNode }) {
  const router    = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')

  // phaseRef lets warpTo read current phase without a stale closure
  const phaseRef  = useRef<Phase>('idle')
  const timers    = useRef<ReturnType<typeof setTimeout>[]>([])

  const warpTo = useCallback(
    (url: string) => {
      if (phaseRef.current !== 'idle') return

      timers.current.forEach(clearTimeout)
      timers.current = []

      const go = (p: Phase) => { phaseRef.current = p; setPhase(p) }

      go('fade-in')
      timers.current.push(setTimeout(() => go('portal'),    200))
      timers.current.push(setTimeout(() => { router.push(url); go('fade-out') }, 700))
      timers.current.push(setTimeout(() => go('idle'),      950))
    },
    [router],
  )

  const isActive   = phase !== 'idle'
  const showPortal = phase === 'portal' || phase === 'fade-out'

  return (
    <TransitionCtx.Provider value={{ warpTo }}>
      {children}

      {/* ── Warp overlay — fixed, above everything ── */}
      <div
        aria-hidden
        style={{
          position:      'fixed',
          inset:         0,
          zIndex:        9999,
          background:    '#000',
          overflow:      'hidden',
          opacity:       isActive ? 1 : 0,
          pointerEvents: isActive ? 'all' : 'none',
          // Fade-in uses 200ms; fade-out uses 250ms
          transition:    phase === 'fade-out'
            ? 'opacity 250ms ease'
            : 'opacity 200ms ease',
        }}
      >
        {/* Portal expansion circle — preserved by [style*="50%"] CSS exception */}
        <div
          style={{
            position:   'absolute',
            top:        '50%',
            left:       '50%',
            width:      '160vmax',
            height:     '160vmax',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, ' +
              '#4ade80 0%, #22c55e 22%, #8b5cf6 58%, #1a0a2e 82%, #000 100%)',
            transform:  `translate(-50%, -50%) scale(${showPortal ? 2.2 : 0})`,
            transition: phase === 'portal'
              ? 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            boxShadow: showPortal
              ? '0 0 140px 50px rgba(139,92,246,0.55), 0 0 70px 24px rgba(34,197,94,0.45), inset 0 0 100px 30px rgba(74,222,128,0.18)'
              : 'none',
          }}
        />
      </div>
    </TransitionCtx.Provider>
  )
}
