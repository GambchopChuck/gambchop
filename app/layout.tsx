import type { Metadata } from 'next'
import { Geist, Geist_Mono, Nunito, Oswald } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import Link from 'next/link'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'] })
const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Gambchop — Sports Betting Intelligence',
  description: 'Dark, data-driven sports betting analytics for every major league',
}

const footLink = { fontSize: 11, color: '#71717a', textDecoration: 'none', lineHeight: 2 } as const

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} ${oswald.variable}`}>
      <body style={{ minHeight: '100vh', margin: 0 }}>
        <Providers>
          {children}
          <footer style={{ borderTop: '1px solid #1a1a24', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace', marginTop: 40 }}>
            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px 24px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between' }}>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e', letterSpacing: '0.12em' }}>GAMBCHOP</div>
                  <p style={{ fontSize: 10, color: '#52525b', lineHeight: 1.7, marginTop: 10, maxWidth: 240 }}>Sports betting data visualization. Historical outcomes only — not betting advice.</p>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Product</div>
                  <div><Link href="/how-it-works" style={footLink}>How It Works</Link></div>
                  <div><Link href="/pricing" style={footLink}>Pricing</Link></div>
                  <div><Link href="/data-sources" style={footLink}>Data Sources</Link></div>
                  <div><Link href="/faq" style={footLink}>FAQ / Help</Link></div>
                  <div><Link href="/status" style={footLink}>Status</Link></div>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Company</div>
                  <div><Link href="/about" style={footLink}>About</Link></div>
                  <div><Link href="/contact" style={footLink}>Contact</Link></div>
                  <div><Link href="/careers" style={footLink}>Careers</Link></div>
                  <div><Link href="/press" style={footLink}>Press / Media</Link></div>
                  <div><Link href="/invest" style={footLink}>Invest</Link></div>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 9, color: '#3f3f46', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Legal</div>
                  <div><Link href="/terms" style={footLink}>Terms & Conditions</Link></div>
                  <div><Link href="/privacy" style={footLink}>Privacy Policy</Link></div>
                  <div><Link href="/responsible-gambling" style={footLink}>Responsible Gambling</Link></div>
                  <div><Link href="/cookie-policy" style={footLink}>Cookie Policy</Link></div>
                  <div><Link href="/dmca" style={footLink}>DMCA / Copyright</Link></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
                <a href="https://x.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#52525b', textDecoration: 'none' }}>X</a>
                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#52525b', textDecoration: 'none' }}>Instagram</a>
                <a href="https://tiktok.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#52525b', textDecoration: 'none' }}>TikTok</a>
                <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#52525b', textDecoration: 'none' }}>YouTube</a>
              </div>
              <div style={{ borderTop: '1px solid #14141c', marginTop: 24, paddingTop: 20 }}>
                <p style={{ fontSize: 10, color: '#3f3f46', lineHeight: 1.8, margin: 0, maxWidth: 900 }}>
                  Gambchop is a data visualization tool that displays historical sports betting outcomes for informational and entertainment purposes only. Gambchop does not accept wagers, does not provide betting advice, picks, or predictions, and does not guarantee any outcome. Past results do not indicate future performance. If you or someone you know has a gambling problem, call 1-800-GAMBLER. Must be of legal age to gamble in your jurisdiction.
                </p>
                <p style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.1em', marginTop: 14 }}>© {new Date().getFullYear()} STRHUCK Ventures. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}