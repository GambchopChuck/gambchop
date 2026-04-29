export type { GameEntry, TeamChartData } from './leagues-data'

import type { TeamChartData } from './leagues-data'

export const mockChartData: TeamChartData[] = [
  {
    teamName: 'New York Yankees',
    abbreviation: 'NYY',
    games: [
      { date: 'Apr 1',  opponent: 'BOS', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 2, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 2',  opponent: 'BOS', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 0, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 3',  opponent: 'BOS', isHome: true,  isFavorite: false, isSpreadFavorite: false, isDivisionGame: true,  restDays: 1, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 4',  opponent: 'TOR', isHome: false, isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 3, moneylineResult: 'win',  spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 5',  opponent: 'TOR', isHome: false, isFavorite: true,  isSpreadFavorite: false, isDivisionGame: true,  restDays: 0, moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 6',  opponent: 'TOR', isHome: false, isFavorite: false, isSpreadFavorite: false, isDivisionGame: false, restDays: 1, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 7',  opponent: 'BAL', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 2, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 8',  opponent: 'BAL', isHome: true,  isFavorite: false, isSpreadFavorite: false, isDivisionGame: false, restDays: 1, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 9',  opponent: 'BAL', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 3, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 10', opponent: 'TB',  isHome: false, isFavorite: false, isSpreadFavorite: false, isDivisionGame: false, restDays: 2, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
    ],
  },
  {
    teamName: 'Los Angeles Dodgers',
    abbreviation: 'LAD',
    games: [
      { date: 'Apr 1',  opponent: 'SF',  isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 1, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 2',  opponent: 'SF',  isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 0, moneylineResult: 'win',  spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 3',  opponent: 'SF',  isHome: true,  isFavorite: true,  isSpreadFavorite: false, isDivisionGame: false, restDays: 2, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 4',  opponent: 'SD',  isHome: false, isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 3, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 5',  opponent: 'SD',  isHome: false, isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 0, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 6',  opponent: 'SD',  isHome: false, isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: false, restDays: 1, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 7',  opponent: 'COL', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 2, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 8',  opponent: 'COL', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 1, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 9',  opponent: 'COL', isHome: true,  isFavorite: true,  isSpreadFavorite: false, isDivisionGame: false, restDays: 3, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'under' },
      { date: 'Apr 10', opponent: 'ARI', isHome: false, isFavorite: false, isSpreadFavorite: false, isDivisionGame: false, restDays: 2, moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
    ],
  },
  {
    teamName: 'Houston Astros',
    abbreviation: 'HOU',
    games: [
      { date: 'Apr 1',  opponent: 'OAK', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 2, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 2',  opponent: 'OAK', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 0, moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
      { date: 'Apr 3',  opponent: 'OAK', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: false, restDays: 1, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 4',  opponent: 'SEA', isHome: false, isFavorite: false, isSpreadFavorite: false, isDivisionGame: true,  restDays: 3, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 5',  opponent: 'SEA', isHome: false, isFavorite: false, isSpreadFavorite: false, isDivisionGame: false, restDays: 0, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 6',  opponent: 'SEA', isHome: false, isFavorite: true,  isSpreadFavorite: false, isDivisionGame: false, restDays: 2, moneylineResult: 'win',  spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 7',  opponent: 'LAA', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 1, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 8',  opponent: 'LAA', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: true,  restDays: 0, moneylineResult: 'loss', spreadResult: 'loss', ouResult: 'over'  },
      { date: 'Apr 9',  opponent: 'LAA', isHome: true,  isFavorite: true,  isSpreadFavorite: true,  isDivisionGame: false, restDays: 3, moneylineResult: 'win',  spreadResult: 'win',  ouResult: 'under' },
      { date: 'Apr 10', opponent: 'TEX', isHome: false, isFavorite: false, isSpreadFavorite: false, isDivisionGame: true,  restDays: 2, moneylineResult: 'loss', spreadResult: 'win',  ouResult: 'over'  },
    ],
  },
]
