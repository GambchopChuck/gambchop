import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Responsible Gambling — Gambchop',
  description: 'Responsible gambling resources, problem gambling signs, and support helplines.',
}

const h2 = { fontSize: 14, fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '32px 0 12px' } as const
const p = { margin: '0 0 14px' } as const
const a = { color: '#22c55e', textDecoration: 'none' } as const

export default function ResponsibleGamblingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ borderBottom: '1px solid #1a1a24', padding: '40px 24px 28px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ fontSize: 9, color: '#22c55e', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Commitment</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>Responsible Gambling</h1>
          <div style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 10 }}>Last updated: May 2026</div>
        </div>
      </div>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px 60px' }}>
        <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.85, letterSpacing: '0.01em' }}>

          <p style={p}>Gambchop is a data visualization tool. We display historical sports betting outcomes so users can observe patterns and trends. We are not a sportsbook — we do not accept wagers, hold funds, or process bets — and nothing on Gambchop is betting advice, a pick, or a prediction. We want every person who uses Gambchop to do so safely, and to treat sports betting as entertainment, never as a way to make money or recover losses.</p>

          <h2 style={h2}>Bet Within Your Means</h2>
          <p style={p}>Only ever wager money you can comfortably afford to lose. Set a budget before you begin and treat it as the cost of entertainment — like a movie ticket or a night out. Set time limits as well as money limits. Never chase losses, never bet to escape stress or difficult emotions, and never borrow money or use funds meant for essentials like rent, food, or bills.</p>

          <h2 style={h2}>Signs of a Gambling Problem</h2>
          <p style={p}>Problem gambling can affect anyone. Warning signs include: spending more time or money than you intended; feeling restless or irritable when trying to cut back; chasing losses with bigger bets; lying to family or friends about gambling; gambling to escape problems or relieve anxiety; and risking relationships, work, or finances because of gambling. If any of these feel familiar, help is available and it works.</p>

          <h2 style={h2}>Get Help — Free, Confidential Support</h2>
          <p style={p}><strong style={{ color: '#f4f4f5' }}>National Problem Gambling Helpline: 1-800-GAMBLER</strong><br />Call or text 1-800-GAMBLER (1-800-426-2537) for free, confidential support, available 24/7 across most of the United States. Help is available in multiple languages.</p>
          <p style={p}><strong style={{ color: '#f4f4f5' }}>National Council on Problem Gambling (NCPG)</strong><br />The NCPG provides resources, treatment referrals, and support for individuals and families affected by problem gambling. Visit <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" style={a}>ncpgambling.org</a> to learn more.</p>

          <h2 style={h2}>Tools That Can Help</h2>
          <p style={p}>Most licensed sportsbooks offer responsible gambling tools including deposit limits, time limits, cool-off periods, and self-exclusion programs. If you choose to bet through a sportsbook, we encourage you to use them. Self-exclusion lets you voluntarily bar yourself from gambling platforms for a set period — a powerful option if you need a hard stop.</p>

          <h2 style={h2}>Age Requirement</h2>
          <p style={p}>Gambchop is intended for adults of legal gambling age in their jurisdiction — typically 21, and at least 18 everywhere. Gambchop is not intended for, and may not be used by, anyone under that age.</p>

          <h2 style={h2}>Our Commitment</h2>
          <p style={p}>We will continue to surface responsible gambling resources clearly throughout Gambchop, and we will never present our data as a system for winning. If you ever feel that gambling is affecting your wellbeing, please step away and reach out to one of the resources above.</p>

        </div>
      </div>
    </div>
  )
}