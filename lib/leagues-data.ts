// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType = 'team' | 'player'
export type BetResult = 'win' | 'loss' | 'push' | null

export interface GameEntry {
  date: string
  opponent: string
  isHome: boolean
  isFavorite: boolean
  isSpreadFavorite: boolean
  moneylineResult: BetResult
  spreadResult: BetResult
  ouResult: 'over' | 'under' | 'push' | null
}

export interface TeamChartData {
  teamName: string
  abbreviation: string
  games: GameEntry[]
}

export interface LeagueMeta {
  id: string
  name: string
  full: string
  emoji: string
  accent: string
  description: string
  entityType: EntityType
  entities: string[]
  href: string
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function seeded(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000
  return x - Math.floor(x)
}

// ─── Mock Data Generator ──────────────────────────────────────────────────────

const RESULTS: BetResult[] = ['win', 'win', 'win', 'loss', 'loss', 'push']
const OU_RESULTS = ['over', 'over', 'under', 'under', 'push'] as const

export function generateMockGames(entityName: string, count = 10): GameEntry[] {
  const seed = hash(entityName)
  const opponents = ['@OPP1', 'OPP2', '@OPP3', 'OPP4', '@OPP5', 'OPP6', '@OPP7', 'OPP8', '@OPP9', 'OPP10',
    '@OPP11', 'OPP12', '@OPP13', 'OPP14', '@OPP15', 'OPP16', '@OPP17', 'OPP18', '@OPP19', 'OPP20']

  return Array.from({ length: count }, (_, i) => {
    const r = (offset: number) => seeded(seed, i * 7 + offset)
    return {
      date: `G${i + 1}`,
      opponent: opponents[i % opponents.length],
      isHome: r(0) > 0.5,
      isFavorite: r(1) > 0.45,
      isSpreadFavorite: r(2) > 0.45,
      moneylineResult: RESULTS[Math.floor(r(3) * RESULTS.length)],
      spreadResult: RESULTS[Math.floor(r(4) * RESULTS.length)],
      ouResult: OU_RESULTS[Math.floor(r(5) * OU_RESULTS.length)],
    }
  })
}

export function generateChartData(entities: string[], count = 10): TeamChartData[] {
  return entities.map(name => ({
    teamName: name,
    abbreviation: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4),
    games: generateMockGames(name, count),
  }))
}

// ─── League Definitions ───────────────────────────────────────────────────────

export const LEAGUES: LeagueMeta[] = [
  {
    id: 'mlb',
    name: 'MLB',
    full: 'Major League Baseball',
    emoji: '⚾',
    accent: '#22c55e',
    description: 'All 30 teams · Full season moneyline, spread & totals analysis',
    entityType: 'team',
    href: '/leagues/mlb',
    entities: [
      'Arizona Diamondbacks', 'Atlanta Braves', 'Baltimore Orioles', 'Boston Red Sox',
      'Chicago Cubs', 'Chicago White Sox', 'Cincinnati Reds', 'Cleveland Guardians',
      'Colorado Rockies', 'Detroit Tigers', 'Houston Astros', 'Kansas City Royals',
      'Los Angeles Angels', 'Los Angeles Dodgers', 'Miami Marlins', 'Milwaukee Brewers',
      'Minnesota Twins', 'New York Mets', 'New York Yankees', 'Oakland Athletics',
      'Philadelphia Phillies', 'Pittsburgh Pirates', 'San Diego Padres', 'San Francisco Giants',
      'Seattle Mariners', 'St. Louis Cardinals', 'Tampa Bay Rays', 'Texas Rangers',
      'Toronto Blue Jays', 'Washington Nationals',
    ],
  },
  {
    id: 'nfl',
    name: 'NFL',
    full: 'National Football League',
    emoji: '🏈',
    accent: '#f59e0b',
    description: '32 teams · ATS records, totals trends, divisional breakdowns',
    entityType: 'team',
    href: '/leagues/nfl',
    entities: [
      'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
      'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
      'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
      'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
      'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
      'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
      'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
      'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders',
    ],
  },
  {
    id: 'nba',
    name: 'NBA',
    full: 'National Basketball Association',
    emoji: '🏀',
    accent: '#f97316',
    description: '30 teams · Point spreads, totals, and player prop trends',
    entityType: 'team',
    href: '/leagues/nba',
    entities: [
      'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
      'Chicago Bulls', 'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets',
      'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers',
      'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat',
      'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
      'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns',
      'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors',
      'Utah Jazz', 'Washington Wizards',
    ],
  },
  {
    id: 'nhl',
    name: 'NHL',
    full: 'National Hockey League',
    emoji: '🏒',
    accent: '#3b82f6',
    description: '32 teams · Puck line, totals & moneyline performance data',
    entityType: 'team',
    href: '/leagues/nhl',
    entities: [
      'Anaheim Ducks', 'Arizona Coyotes', 'Boston Bruins', 'Buffalo Sabres',
      'Calgary Flames', 'Carolina Hurricanes', 'Chicago Blackhawks', 'Colorado Avalanche',
      'Columbus Blue Jackets', 'Dallas Stars', 'Detroit Red Wings', 'Edmonton Oilers',
      'Florida Panthers', 'Los Angeles Kings', 'Minnesota Wild', 'Montreal Canadiens',
      'Nashville Predators', 'New Jersey Devils', 'New York Islanders', 'New York Rangers',
      'Ottawa Senators', 'Philadelphia Flyers', 'Pittsburgh Penguins', 'San Jose Sharks',
      'Seattle Kraken', 'St. Louis Blues', 'Tampa Bay Lightning', 'Toronto Maple Leafs',
      'Utah Hockey Club', 'Vancouver Canucks', 'Vegas Golden Knights', 'Washington Capitals',
    ],
  },
  {
    id: 'ncaaf',
    name: 'NCAAF',
    full: 'College Football',
    emoji: '🏟️',
    accent: '#ef4444',
    description: '130+ teams · ATS trends, conference breakdowns, bowl records',
    entityType: 'team',
    href: '/leagues/ncaaf',
    entities: [
      'Alabama Crimson Tide', 'Ohio State Buckeyes', 'Georgia Bulldogs', 'Michigan Wolverines',
      'LSU Tigers', 'Clemson Tigers', 'USC Trojans', 'Oklahoma Sooners',
      'Texas Longhorns', 'Penn State Nittany Lions', 'Notre Dame Fighting Irish', 'Florida Gators',
      'Oregon Ducks', 'Tennessee Volunteers', 'Auburn Tigers', 'Michigan State Spartans',
      'Oklahoma State Cowboys', 'Iowa Hawkeyes', 'Wisconsin Badgers', 'Utah Utes',
      'Baylor Bears', 'TCU Horned Frogs', 'Kansas State Wildcats', 'Texas A&M Aggies',
      'Miami Hurricanes',
    ],
  },
  {
    id: 'ncaab',
    name: 'NCAAB',
    full: "Men's College Basketball",
    emoji: '🎓',
    accent: '#a855f7',
    description: '350+ teams · Tournament trends, spread & totals analysis',
    entityType: 'team',
    href: '/leagues/ncaab',
    entities: [
      'Kansas Jayhawks', 'Duke Blue Devils', 'Kentucky Wildcats', 'North Carolina Tar Heels',
      'Gonzaga Bulldogs', 'Villanova Wildcats', 'Michigan State Spartans', 'UCLA Bruins',
      'Arizona Wildcats', 'Houston Cougars', 'Iowa State Cyclones', 'Purdue Boilermakers',
      'Connecticut Huskies', 'Tennessee Volunteers', 'Indiana Hoosiers', 'Louisville Cardinals',
      'Wisconsin Badgers', 'Maryland Terrapins', 'Texas Longhorns', 'Florida Gators',
      'Alabama Crimson Tide', 'Arkansas Razorbacks', 'Baylor Bears', 'Memphis Tigers',
      'San Diego State Aztecs',
    ],
  },
  {
    id: 'ncaawb',
    name: 'NCAAWB',
    full: "Women's College Basketball",
    emoji: '🎓',
    accent: '#6366f1',
    description: "350+ teams · Spread trends, conference breakdowns & tournament data",
    entityType: 'team',
    href: '/leagues/ncaawb',
    entities: [
      'South Carolina Gamecocks', 'Iowa Hawkeyes', 'LSU Tigers', 'Stanford Cardinal',
      'UConn Huskies', 'Virginia Tech Hokies', 'Indiana Hoosiers', 'Tennessee Volunteers',
      'Notre Dame Fighting Irish', 'Maryland Terrapins', 'Ohio State Buckeyes', 'North Carolina Tar Heels',
      'UCLA Bruins', 'Oregon Ducks', 'Colorado Buffaloes', 'Kansas State Wildcats',
      'Oklahoma Sooners', 'Baylor Bears', 'Georgia Bulldogs', 'Mississippi State Bulldogs',
      'Arizona Wildcats', 'Michigan Wolverines', 'Florida State Seminoles', 'Duke Blue Devils',
      'Iowa State Cyclones',
    ],
  },
  {
    id: 'wnba',
    name: 'WNBA',
    full: "Women's National Basketball Association",
    emoji: '🏀',
    accent: '#ec4899',
    description: '13 teams · Moneyline, spread & totals analysis for the full season',
    entityType: 'team',
    href: '/leagues/wnba',
    entities: [
      'Atlanta Dream', 'Chicago Sky', 'Connecticut Sun', 'Dallas Wings',
      'Indiana Fever', 'Las Vegas Aces', 'Los Angeles Sparks', 'Minnesota Lynx',
      'New York Liberty', 'Phoenix Mercury', 'Seattle Storm', 'Washington Mystics',
      'Golden State Valkyries',
    ],
  },
  {
    id: 'atp',
    name: 'ATP Tour',
    full: "ATP Tour (Men's Tennis)",
    emoji: '🎾',
    accent: '#84cc16',
    description: "Top 25 men's players · Match winner odds, set spreads & tournament futures",
    entityType: 'player',
    href: '/leagues/atp',
    entities: [
      'Novak Djokovic', 'Carlos Alcaraz', 'Jannik Sinner', 'Daniil Medvedev',
      'Alexander Zverev', 'Andrey Rublev', 'Holger Rune', 'Stefanos Tsitsipas',
      'Casper Ruud', 'Taylor Fritz', 'Tommy Paul', 'Frances Tiafoe',
      'Sebastian Korda', 'Ben Shelton', 'Felix Auger-Aliassime', 'Grigor Dimitrov',
      'Hubert Hurkacz', 'Alex de Minaur', 'Lorenzo Musetti', 'Karen Khachanov',
      'Nicolas Jarry', 'Francisco Cerundolo', 'Cameron Norrie', 'Roberto Bautista Agut',
      'Ugo Humbert',
    ],
  },
  {
    id: 'wta',
    name: 'WTA Tour',
    full: "WTA Tour (Women's Tennis)",
    emoji: '🎾',
    accent: '#f0abfc',
    description: "Top 25 women's players · Match winner odds, set spreads & tournament futures",
    entityType: 'player',
    href: '/leagues/wta',
    entities: [
      'Iga Swiatek', 'Aryna Sabalenka', 'Coco Gauff', 'Elena Rybakina',
      'Jessica Pegula', 'Marketa Vondrousova', 'Ons Jabeur', 'Caroline Wozniacki',
      'Barbora Krejcikova', 'Beatriz Haddad Maia', 'Maria Sakkari', 'Ekaterina Alexandrova',
      'Liudmila Samsonova', 'Victoria Azarenka', 'Elina Svitolina', 'Donna Vekic',
      'Petra Kvitova', 'Madison Keys', 'Emma Navarro', 'Danielle Collins',
      'Mirra Andreeva', 'Diana Shnaider', 'Daria Kasatkina', 'Anastasia Pavlyuchenkova',
      'Jelena Ostapenko',
    ],
  },
  {
    id: 'ncaabl',
    name: 'College Baseball',
    full: 'NCAA Baseball',
    emoji: '⚾',
    accent: '#0891b2',
    description: '300+ teams · Moneyline, run line & totals across all conferences',
    entityType: 'team',
    href: '/leagues/ncaabl',
    entities: [
      'Arkansas Razorbacks', 'Tennessee Volunteers', 'LSU Tigers', 'Florida Gators',
      'Oregon State Beavers', 'Texas Longhorns', 'Ole Miss Rebels', 'Vanderbilt Commodores',
      'Texas A&M Aggies', 'Florida State Seminoles', 'North Carolina Tar Heels', 'Stanford Cardinal',
      'UCLA Bruins', 'Louisville Cardinals', 'Virginia Cavaliers', 'Mississippi State Bulldogs',
      'Georgia Bulldogs', 'Arizona Wildcats', 'South Carolina Gamecocks', 'Oklahoma Sooners',
      'TCU Horned Frogs', 'Dallas Baptist Patriots', 'East Carolina Pirates', 'Coastal Carolina Chanticleers',
      'Campbell Fighting Camels',
    ],
  },
]

export const LEAGUE_MAP: Record<string, LeagueMeta> = Object.fromEntries(LEAGUES.map(l => [l.id, l]))
