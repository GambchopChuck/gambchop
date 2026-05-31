// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  pri:   '#F5F5F4',
  sec:   '#A1A1AA',
  faint: '#C5F84A',
  hairline: '#1F1F23',
}
const SERIF = 'var(--font-fraunces), Georgia, serif'
const SANS  = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO  = 'var(--font-jetbrains), "JetBrains Mono", monospace'

export default function LeaderboardHero() {
  return (
    <div style={{ paddingTop: 64 }}>

      {/* Overline */}
      <div style={{
        fontFamily: MONO, fontSize: 10, fontWeight: 500,
        color: T.faint, letterSpacing: '0.18em', textTransform: 'uppercase',
        marginBottom: 12,
      }}>
        MONTHLY LEADERS
      </div>

      {/* H1 */}
      <h1
        className="lb-h1"
        style={{
          fontFamily: SERIF, fontWeight: 400, fontStyle: 'normal',
          fontSize: 64, letterSpacing: '-0.03em',
          color: T.pri, margin: '0 0 16px', lineHeight: 1.0,
        }}
      >
        Leaderboard
      </h1>

      {/* Subtitle */}
      <p style={{
        fontFamily: SANS, fontSize: 16, fontWeight: 400,
        color: T.sec, lineHeight: 1.6, margin: '0 0 16px',
        maxWidth: 600,
      }}>
        Last month&apos;s top five teams in every betting category. Frozen at month-end, archived forever.
      </p>

      {/* Status row */}
      <p style={{
        fontFamily: MONO, fontSize: 10, fontWeight: 500,
        color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
        margin: '0 0 56px',
      }}>
        WINDOW: MAY 2026 &middot; FROZEN JUNE 01 2026 &middot; MLB
      </p>

      {/* Divider */}
      <div style={{ height: 1, background: T.hairline }} />

    </div>
  )
}
