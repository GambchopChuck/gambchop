'use client'

import {
  createContext, useContext, useState, useEffect, useCallback,
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

// ─── Phase type ───────────────────────────────────────────────────────────────
//
// idle      — nothing visible
// opening   — black overlay fades in                    (0 → 250ms)
// charging  — portal glows + pulses in place            (250 → 900ms)
// warping   — portal expands to fill viewport           (900 → 1500ms)
// arriving  — overlay fades out, new page visible below (1500 → 1850ms)

type Phase = 'idle' | 'opening' | 'charging' | 'warping' | 'arriving'

// ─── Overlay ──────────────────────────────────────────────────────────────────

function WarpOverlay({ phase }: { phase: Phase }) {
  if (phase === 'idle') return null

  const showBackdrop = phase === 'opening' || phase === 'charging' || phase === 'warping'
  const showPortal   = phase === 'charging' || phase === 'warping' || phase === 'arriving'

  let portalAnimation = 'none'
  if (phase === 'charging') {
    portalAnimation = 'chopperWarpPulse 650ms ease-in-out infinite'
  } else if (phase === 'warping') {
    portalAnimation = 'chopperWarpExpand 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
  } else if (phase === 'arriving') {
    portalAnimation = 'chopperWarpFadeOut 350ms ease-out forwards'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      pointerEvents: 'none', overflow: 'hidden',
    }}>
      {showBackdrop && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#000000',
          animation: 'chopperWarpFadeIn 250ms ease-out forwards',
        }} />
      )}

      {showPortal && (
        <div style={{
          position:    'absolute',
          top:         '50%', left: '50%',
          width:       '200px', height: '200px',
          marginTop:   '-100px', marginLeft: '-100px',
          borderRadius: '50%',
          background: `
            radial-gradient(circle at center, rgba(255,255,255,0.6) 0%, transparent 60%),
            linear-gradient(135deg, #22c55e 0%, #8b5cf6 100%)
          `,
          boxShadow:
            '0 0 80px 40px rgba(124,92,246,0.6), 0 0 120px 60px rgba(34,197,94,0.4)',
          animation:       portalAnimation,
          transformOrigin: 'center center',
        }} />
      )}
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ChopperTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')

  // Inject keyframes once, idempotent
  useEffect(() => {
    const id = 'chopper-transition-keyframes'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.innerHTML = `
      @keyframes chopperWarpPulse {
        0%, 100% {
          transform: scale(0.05);
          opacity: 1;
          box-shadow: 0 0 60px 20px rgba(124,92,246,0.5), 0 0 100px 40px rgba(34,197,94,0.3);
        }
        50% {
          transform: scale(0.08);
          opacity: 1;
          box-shadow: 0 0 100px 40px rgba(124,92,246,0.8), 0 0 160px 80px rgba(34,197,94,0.5);
        }
      }
      @keyframes chopperWarpExpand {
        0%   { transform: scale(0.08); opacity: 1; }
        60%  { opacity: 1; }
        100% { transform: scale(25);  opacity: 1; }
      }
      @keyframes chopperWarpFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes chopperWarpFadeOut {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
    `
    document.head.appendChild(el)
  }, [])

  const warpTo = useCallback(
    (path: string) => {
      if (phase !== 'idle') return

      setPhase('opening')
      setTimeout(() => setPhase('charging'),  250)
      setTimeout(() => setPhase('warping'),   900)
      setTimeout(() => { router.push(path); setPhase('arriving') }, 1500)
      setTimeout(() => setPhase('idle'),      1850)
    },
    [phase, router],
  )

  return (
    <TransitionCtx.Provider value={{ warpTo }}>
      {children}
      <WarpOverlay phase={phase} />
    </TransitionCtx.Provider>
  )
}
