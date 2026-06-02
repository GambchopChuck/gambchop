const PARAGRAPHS = [
  `Our mission at Gambchop is to help micro-volume sports bettors make more informed decisions by giving them a clearer view of what has been happening across the sports betting landscape. Through simple, color-coded charts, historical market results, streak tracking, team comparisons, news, and AI-assisted chart reading, Gambchop turns scattered betting data into an easier-to-read visual experience.`,

  `We are built for bettors who may not have the time, bankroll, or resources to track every league, team, split, and trend manually, because apparently humans enjoy making life harder by staring at twenty tabs before first pitch. Gambchop helps members quickly understand recent outcomes across moneylines, spreads, totals, home and away performance, favorites, underdogs, and active streaks, so they can better grasp the context behind the games they are already watching.`,

  `Gambchop does not sell picks, predictions, locks, or guarantees. Our goal is not to tell members what will happen next, but to help them better understand what has already occurred. By organizing historical betting results across MLB and future leagues including NBA, NFL, NHL, WNBA, college sports, and tennis, we aim to give everyday bettors a sharper, cleaner, and more responsible way to study the board in hopes of helping them put together stronger, more thoughtful tickets.`,
]

const OSWALD = 'var(--font-oswald), "Oswald", sans-serif'

export default function OurMission() {
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      padding:  '80px 24px 96px',
    }}>
      {/* Background image — same source as Also Featured section */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage:    "url('/images/also-featured-bg.png')",
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          backgroundRepeat:   'no-repeat',
        }}
        aria-hidden="true"
      />

      {/* Dark overlay for text contrast — same as Also Featured */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 1, backgroundColor: 'rgba(10,10,11,0.72)' }}
        aria-hidden="true"
      />

      {/* Edge fade — blends into surrounding bg-canvas */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: 'linear-gradient(to bottom, #0A0A0B 0%, transparent 15%, transparent 85%, #0A0A0B 100%)',
        }}
        aria-hidden="true"
      />

      {/* Content sits above all background layers */}
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 3 }}>

        {/* Headline — lime green, radiant, Oswald */}
        <h2 style={{
          fontFamily:    OSWALD,
          fontSize:      'clamp(52px, 8vw, 80px)',
          fontWeight:    700,
          color:         '#39ff9a',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight:    1.0,
          margin:        '0 0 44px',
          textShadow:    '0 0 28px #39ff9a88, 0 0 56px #39ff9a44, 0 0 100px #39ff9a22',
        }}>
          Our Mission
        </h2>

        {/* Body — Oswald, white */}
        {PARAGRAPHS.map((text, i) => (
          <p key={i} style={{
            fontFamily: OSWALD,
            fontSize:   18,
            fontWeight: 400,
            color:      '#f4f4f5',
            lineHeight: 1.75,
            margin:     i < PARAGRAPHS.length - 1 ? '0 0 28px' : 0,
          }}>
            {text}
          </p>
        ))}

      </div>
    </section>
  )
}
