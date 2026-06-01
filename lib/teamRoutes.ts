// Team name → chart page URL.
// Pattern: /leagues/{league-slug}/{team-slug}
// Team slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
// Expand with NBA/NHL/NFL/WNBA entries as those leagues go live.

export const TEAM_ROUTES: Record<string, string> = {
  // ── MLB ────────────────────────────────────────────────────────────────────
  'Arizona Diamondbacks':  '/leagues/mlb/arizona-diamondbacks',
  'Atlanta Braves':        '/leagues/mlb/atlanta-braves',
  'Baltimore Orioles':     '/leagues/mlb/baltimore-orioles',
  'Boston Red Sox':        '/leagues/mlb/boston-red-sox',
  'Chicago Cubs':          '/leagues/mlb/chicago-cubs',
  'Chicago White Sox':     '/leagues/mlb/chicago-white-sox',
  'Cincinnati Reds':       '/leagues/mlb/cincinnati-reds',
  'Cleveland Guardians':   '/leagues/mlb/cleveland-guardians',
  'Colorado Rockies':      '/leagues/mlb/colorado-rockies',
  'Detroit Tigers':        '/leagues/mlb/detroit-tigers',
  'Houston Astros':        '/leagues/mlb/houston-astros',
  'Kansas City Royals':    '/leagues/mlb/kansas-city-royals',
  'Los Angeles Angels':    '/leagues/mlb/los-angeles-angels',
  'Los Angeles Dodgers':   '/leagues/mlb/los-angeles-dodgers',
  'Miami Marlins':         '/leagues/mlb/miami-marlins',
  'Milwaukee Brewers':     '/leagues/mlb/milwaukee-brewers',
  'Minnesota Twins':       '/leagues/mlb/minnesota-twins',
  'New York Mets':         '/leagues/mlb/new-york-mets',
  'New York Yankees':      '/leagues/mlb/new-york-yankees',
  'Oakland Athletics':     '/leagues/mlb/oakland-athletics',
  'Athletics':             '/leagues/mlb/athletics',       // Odds API variant
  'Philadelphia Phillies': '/leagues/mlb/philadelphia-phillies',
  'Pittsburgh Pirates':    '/leagues/mlb/pittsburgh-pirates',
  'San Diego Padres':      '/leagues/mlb/san-diego-padres',
  'San Francisco Giants':  '/leagues/mlb/san-francisco-giants',
  'Seattle Mariners':      '/leagues/mlb/seattle-mariners',
  'St. Louis Cardinals':   '/leagues/mlb/st-louis-cardinals',
  'Tampa Bay Rays':        '/leagues/mlb/tampa-bay-rays',
  'Texas Rangers':         '/leagues/mlb/texas-rangers',
  'Toronto Blue Jays':     '/leagues/mlb/toronto-blue-jays',
  'Washington Nationals':  '/leagues/mlb/washington-nationals',
}

// ── linkifyTeamNames ───────────────────────────────────────────────────────
// Finds any TEAM_ROUTES key in `text` (word-boundary matched, longest names
// first to prevent partial matches) and wraps it in an anchor tag.
// Output is HTML — render with dangerouslySetInnerHTML.
// Input text is HTML-escaped first so no raw user content becomes markup.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Build once at module load — sorted longest-first so "Chicago White Sox"
// is tried before "Chicago Cubs" (both start with "Chicago").
const SORTED_NAMES = Object.keys(TEAM_ROUTES).sort((a, b) => b.length - a.length)
const TEAM_REGEX   = new RegExp(`\\b(${SORTED_NAMES.map(escapeRegex).join('|')})\\b`, 'g')

export function linkifyTeamNames(text: string): string {
  const safe = escapeHtml(text)
  return safe.replace(TEAM_REGEX, (match) => {
    const route = TEAM_ROUTES[match]
    if (!route) return match
    return `<a href="${route}" class="team-link">${match}</a>`
  })
}
