export default function MerchandisePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'var(--font-geist-mono), monospace', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>👕</div>
        <div style={{ fontSize: 9, color: '#52525b', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 12 }}>Coming Soon</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f4f4f5', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Merchandise
        </h1>
        <p style={{ fontSize: 12, color: '#52525b', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
          Gambchop gear is on the way. Hats, hoodies, and more.
        </p>
        <div style={{ width: 48, height: 2, background: 'linear-gradient(to right, #22c55e, #8b5cf6)', margin: '24px auto', borderRadius: 2 }} />
        <p style={{ fontSize: 10, color: '#3f3f46', letterSpacing: '0.1em' }}>Drop coming Q3 2026</p>
      </div>
    </div>
  )
}
