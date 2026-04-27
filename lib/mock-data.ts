export interface GameEntry {
  date: string
  opponent: string
  isHome: boolean
  isFavorite: boolean
  moneylineResult: 'win' | 'loss' | 'push' | null
  spreadResult: 'win' | 'loss' | 'push' | null
  ouResult: 'over' | 'under' | 'push' | null
}

export interface TeamChartData {
  teamName: string
  abbreviation: string
  games: GameEntry[]
}

export const mockChartData: TeamChartData[] = [
  {
    teamName: 'New York Yankees',
    abbreviation: 'NYY',
    games: [
      { date: 'Apr 1',  opponent: 'BOS', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 2',  opponent: 'BOS', isHome: true,  isFavorite: true,  moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 3',  opponent: 'BOS', isHome: true,  isFavorite: false, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 4',  opponent: 'TOR', isHome: false, isFavorite: true,  moneylineResult: 'win',  spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 5',  opponent: 'TOR', isHome: false, isFavorite: true,  moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 6',  opponent: 'TOR', isHome: false, isFavorite: false, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 7',  opponent: 'BAL', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 8',  opponent: 'BAL', isHome: true,  isFavorite: false, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 9',  opponent: 'BAL', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 10', opponent: 'TB',  isHome: false, isFavorite: false, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
    ],
  },
  {
    teamName: 'Los Angeles Dodgers',
    abbreviation: 'LAD',
    games: [
      { date: 'Apr 1',  opponent: 'SF',  isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 2',  opponent: 'SF',  isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 3',  opponent: 'SF',  isHome: true,  isFavorite: true,  moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 4',  opponent: 'SD',  isHome: false, isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 5',  opponent: 'SD',  isHome: false, isFavorite: true,  moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 6',  opponent: 'SD',  isHome: false, isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 7',  opponent: 'COL', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 8',  opponent: 'COL', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 9',  opponent: 'COL', isHome: true,  isFavorite: true,  moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 10', opponent: 'ARI', isHome: false, isFavorite: false, moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
    ],
  },
  {
    teamName: 'Houston Astros',
    abbreviation: 'HOU',
    games: [
      { date: 'Apr 1',  opponent: 'OAK', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 2',  opponent: 'OAK', isHome: true,  isFavorite: true,  moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 3',  opponent: 'OAK', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 4',  opponent: 'SEA', isHome: false, isFavorite: false, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 5',  opponent: 'SEA', isHome: false, isFavorite: false, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 6',  opponent: 'SEA', isHome: false, isFavorite: true,  moneylineResult: 'win',  spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 7',  opponent: 'LAA', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 8',  opponent: 'LAA', isHome: true,  isFavorite: true,  moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 9',  opponent: 'LAA', isHome: true,  isFavorite: true,  moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 10', opponent: 'TEX', isHome: false, isFavorite: false, moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
    ],
  },
]
