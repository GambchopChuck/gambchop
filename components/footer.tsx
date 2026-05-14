import Link from 'next/link'

const COL = {
  product: {
    heading: 'Product',
    links: [
      { label: 'How It Works', href: '/how-it-works' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Data Sources', href: '/data-sources' },
      { label: 'FAQ / Help', href: '/faq' },
      { label: 'Status', href: '/status' },
    ],
  },
  company: {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press / Media', href: '/press' },
      { label: 'Invest', href: '/invest' },
    ],
  },
  legal: {
    heading: 'Legal',
    links: [
      { label: 'Terms & Conditions', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Responsible Gambling', href: '/responsible-gambling' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'DMCA / Copyright', href: '/dmca' },
    ],
  },
}

const SOCIAL = [
  { label: 'X', href: 'https://x.com/' },
  { label: 'Instagram', href: 'https://instagram.com/' },
  { label: 'TikTok', href: 'https://tiktok.com/' },
  { label: 'YouTube', href: 'https://youtube.com/' },
]

const linkStyle: React.CSSProperties = {
  fontSize: 11, color: '#71717a', textDecoration: 'none',
  letterSpacing: '0.04em', lineHeight: 2,
}

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #1a1a24', background: '#0a0a0f',
      fontFamily: 'var(--font-geist-mono), monospace', marginTop: 40,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between' }}>
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e', letterSpacing: '0.12em' }}>
              GAMBCHOP
            </div>
            <p style={{ fontSize: 10, color: '#52525b', letterSpacing: '0.06em', lineHeight: 1.7, marginTop: 10, maxWidth: 240 }}>
              Sports betting data visualization. Historical outcomes only — not betting advice.
            </p>
          </div>
          {Object.values(COL).map(col => (
            <div key={col.heading} style={{ minWidth: 140 }}>
              <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
                {col.heading}
              </div>
              {col.links.map(l => (
                <div key={l.href}>
                  <Link href={l.href} style={linkStyle}>{l.label}</Link>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 32, flexWrap: 'wrap' }}>
          {SOCIAL.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
               style={{ ...linkStyle, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 10 }}>
              {s.label}
            </a>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #14141c', marginTop: 24, paddingTop: 20 }}>
          <p style={{ fontSize: 10, color: '#3f3f46', lineHeight: 1.8, letterSpacing: '0.03em', margin: 0, maxWidth: 900 }}>
            Gambchop is a data visualization tool that displays historical sports betting outcomes for
            informational and entertainment purposes only. Gambchop does not accept wagers, does not
            provide betting advice, picks, or predictions, and does not guarantee any outcome. Past
            results do not indicate future performance. If you or someone you know has a gambling
            problem, call 1-800-GAMBLER. Must be of legal age to gamble in your jurisdiction.
          </p>
          <p style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.1em', marginTop: 14 }}>
            © {new Date().getFullYear()} STRHUCK Ventures. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}