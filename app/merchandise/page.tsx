'use client'

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'

// ─── Design tokens (matches community / leaderboard pages) ────────────────────

const T = {
  canvas:   '#0A0A0B',
  surface:  '#121215',
  elevated: '#18181C',
  hairline: '#1F1F23',
  strong:   '#2A2A30',
  pri:      '#F5F5F4',
  sec:      '#A1A1AA',
  muted:    '#71717A',
  faint:    '#52525B',
  accent:   '#C5F84A',
}
const SERIF = 'var(--font-fraunces), Georgia, serif'
const SANS  = 'var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif'
const MONO  = 'var(--font-jetbrains), "JetBrains Mono", monospace'

// ─── Product data ─────────────────────────────────────────────────────────────
// To update: set `image` to a path under /public/images/merch/ and update `price`.

interface Product {
  id: string
  name: string
  description: string
  price: string          // e.g. "$32.00" — update when pricing is confirmed
  image: string | null   // local path e.g. "/images/merch/parlay-hat.jpg" or null for placeholder
  badge?: string         // optional label: "NEW", "LIMITED", etc.
}

const PRODUCTS: Product[] = [
  {
    id: 'parlay-hat',
    name: 'Parlay Hat',
    description: 'Classic structured cap featuring "Parlay Hat" embroidery.',
    price: 'TBD',
    image: null,
  },
  {
    id: 'gambchop-golf-hat',
    name: 'Gambchop Golf Hat',
    description: 'Premium performance golf hat featuring the Gambchop logo.',
    price: 'TBD',
    image: null,
  },
  {
    id: 'parlayer-hat',
    name: "Parlay'er Hat",
    description: 'Streetwear-style cap featuring "Parlay\'er" text.',
    price: 'TBD',
    image: null,
  },
  {
    id: 'classic-tee',
    name: 'Gambchop Classic Tee',
    description: 'Ultra-soft crewneck T-shirt featuring classic Gambchop branding.',
    price: 'TBD',
    image: null,
  },
  {
    id: 'essential-hoodie',
    name: 'Gambchop Essential Hoodie',
    description: 'Heavyweight, cozy hoodie featuring Gambchop center print.',
    price: 'TBD',
    image: null,
  },
  {
    id: 'crossbody-bag',
    name: 'Gambchop Crossbody Bag',
    description: 'Sleek, durable crossbody bag with Gambchop branding.',
    price: 'TBD',
    image: null,
  },
  {
    id: 'bolt-wallet',
    name: 'Bolt Wallet',
    description: 'Minimalist leather wallet featuring a sharp neon lightning strike design.',
    price: 'TBD',
    image: null,
  },
  {
    id: 'womens-crossbody',
    name: "Gambchop Women's Crossbody Bag",
    description: 'Stylized, compact crossbody bag with custom Gambchop detailing.',
    price: 'TBD',
    image: null,
  },
]

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const [imgHovered, setImgHovered] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.hairline}`,
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 200ms ease-out, transform 200ms ease-out',
      transform: imgHovered ? 'translateY(-3px)' : 'translateY(0)',
    }}>

      {/* Image area — swap product.image path in when assets are ready */}
      <div
        onMouseEnter={() => setImgHovered(true)}
        onMouseLeave={() => setImgHovered(false)}
        style={{
          position: 'relative',
          aspectRatio: '4 / 3',
          background: T.elevated,
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transition: 'transform 300ms ease-out',
              transform: imgHovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        ) : (
          /* Placeholder — remove once real images are supplied */
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
            background: `linear-gradient(135deg, ${T.elevated} 0%, #1a1a22 100%)`,
          }}>
            <ShoppingBag size={32} color={T.strong} strokeWidth={1.5} />
            <span style={{
              fontFamily: MONO, fontSize: 8, fontWeight: 500,
              color: T.faint, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              Image coming soon
            </span>
          </div>
        )}

        {/* Optional badge */}
        {product.badge && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: T.accent, color: '#0A0A0B',
            fontFamily: MONO, fontSize: 8, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            padding: '3px 8px', borderRadius: 3,
          }}>
            {product.badge}
          </div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        <h3 style={{
          fontFamily: SANS, fontSize: 15, fontWeight: 600,
          color: T.pri, margin: '0 0 8px', lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}>
          {product.name}
        </h3>

        <p style={{
          fontFamily: SANS, fontSize: 13, fontWeight: 400,
          color: T.sec, lineHeight: 1.55, margin: '0 0 16px',
          flex: 1,
        }}>
          {product.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Price — update when finalised */}
          <span style={{
            fontFamily: MONO, fontSize: 13, fontWeight: 600,
            color: product.price === 'TBD' ? T.faint : T.pri,
            letterSpacing: '0.04em',
          }}>
            {product.price}
          </span>

          {/* CTA button */}
          <button
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              fontFamily: SANS, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${btnHovered ? T.accent : T.strong}`,
              background: btnHovered ? T.accent : 'transparent',
              color: btnHovered ? '#0A0A0B' : T.sec,
              transition: 'all 180ms ease-out',
              whiteSpace: 'nowrap',
            }}
          >
            View Details
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MerchandisePage() {
  return (
    <div style={{ minHeight: '100vh' }}>

      <style>{`
        .merch-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        @media (max-width: 1099px) {
          .merch-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 767px) {
          .merch-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (max-width: 480px) {
          .merch-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px 100px' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 500,
            color: T.accent, letterSpacing: '0.25em', textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Gambchop Store
          </div>
          <h1 style={{
            fontFamily: SERIF, fontSize: 56, fontWeight: 400, fontStyle: 'normal',
            letterSpacing: '-0.02em', color: T.pri,
            margin: '0 0 16px', lineHeight: 1.0,
          }}>
            Merchandise
          </h1>
          <p style={{
            fontFamily: SANS, fontSize: 16, fontWeight: 400,
            color: T.sec, lineHeight: 1.6, margin: '0 0 32px', maxWidth: 520,
          }}>
            Gambchop gear. Hats, hoodies, tees, and accessories — drop landing Q3 2026.
          </p>
          <div style={{ height: 1, background: T.hairline }} />
        </div>

        {/* ── Product grid ────────────────────────────────────────────── */}
        <div className="merch-grid">
          {PRODUCTS.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* ── Footer note ─────────────────────────────────────────────── */}
        <div style={{
          marginTop: 64, paddingTop: 32,
          borderTop: `1px solid ${T.hairline}`,
          fontFamily: MONO, fontSize: 10, fontWeight: 500,
          color: T.faint, letterSpacing: '0.15em', textTransform: 'uppercase',
          lineHeight: 1.8,
        }}>
          <div>All items ship within 5–10 business days · Free shipping on orders over $75</div>
          <div>Prices confirmed at launch · Images shown at launch</div>
        </div>

      </div>
    </div>
  )
}
