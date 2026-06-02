'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser, AppNotification } from '@/lib/user-context'

const CARD   = '#0f0f14'
const BORDER = '#1a1a24'
const TEXT   = '#f4f4f5'
const MUTED  = '#52525b'
const SUB    = '#a1a1aa'
const GREEN  = '#22c55e'

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  streak:      '#f97316',
  'line-move': '#3b82f6',
  'game-day':  '#22c55e',
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useUser()
  const [open, setOpen] = useState(false)
  const ref  = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: open ? `${GREEN}18` : 'none',
          border: `1px solid ${open ? GREEN + '44' : BORDER}`,
          borderRadius: 7, padding: '6px 10px', cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 4, position: 'relative',
        }}
      >
        <span style={{ fontSize: 14 }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: GREEN, borderRadius: '50%',
            width: 16, height: 16, fontSize: 9, fontWeight: 900,
            color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 8px ${GREEN}88`,
          }}>
            {Math.min(unreadCount, 9)}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 12, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          fontFamily: 'var(--font-oswald), "Oswald", sans-serif',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: TEXT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Alerts</span>
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 9, color: GREEN, background: `${GREEN}18`, border: `1px solid ${GREEN}44`, borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'inherit', textDecoration: 'underline' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: MUTED, fontSize: 11 }}>
                No alerts yet. Follow teams to get updates.
              </div>
            ) : (
              notifications
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      padding: '11px 16px', cursor: 'pointer',
                      background: n.read ? 'transparent' : `${TYPE_COLOR[n.type]}08`,
                      borderBottom: `1px solid ${BORDER}`,
                      borderLeft: `3px solid ${n.read ? 'transparent' : TYPE_COLOR[n.type]}`,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 11, color: n.read ? MUTED : TEXT, fontWeight: n.read ? 400 : 700, lineHeight: 1.4, marginBottom: 4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                ))
            )}
          </div>

          {notifications.length > 0 && (
            <div style={{ padding: '8px 16px', borderTop: `1px solid ${BORDER}`, textAlign: 'center' }}>
              <span style={{ fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {notifications.length} total alerts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
