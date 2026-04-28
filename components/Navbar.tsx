'use client'

import Link from 'next/link'

const NAV_LINKS = ['Leagues', 'Team Pages', 'Merchandise', 'News', 'Filters'] as const

export default function Navbar() {
  return (
    <header style={{ borderBottom: '1px solid #1a1a24', background: 'rgba(12,12,16,0.97)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

        {/* Logo */}
        <Link href="/" className="no-underline">
          <span style={{
            fontSize: 22, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase',
            background: 'linear-gradient(135deg, #22c55e 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 16px rgba(34,197,94,0.25))',
          }}>
            Gambchop
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link}
              href={link === 'Leagues' ? '/chart' : '#'}
              className="text-zinc-400 hover:text-zinc-100 transition-colors duration-150 text-[11px] tracking-[0.08em] uppercase font-medium px-3 py-1.5 rounded-md hover:bg-white/5"
              style={{ textDecoration: 'none' }}
            >
              {link}
            </Link>
          ))}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          <Link href="#" className="text-zinc-400 hover:text-zinc-100 transition-colors text-[11px] tracking-[0.1em] uppercase font-600 px-3" style={{ textDecoration: 'none', fontWeight: 600 }}>
            Login
          </Link>
          <Link href="#" className="text-zinc-200 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-all text-[11px] tracking-[0.1em] uppercase font-bold px-3 py-1.5 rounded-md" style={{ textDecoration: 'none' }}>
            Join Free
          </Link>
          <Link href="#" className="text-black text-[11px] tracking-[0.1em] uppercase font-black px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity" style={{ textDecoration: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 16px rgba(34,197,94,0.35)' }}>
            Go Pro
          </Link>
        </div>
      </div>
    </header>
  )
}
