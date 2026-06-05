export const LEAGUE_INGESTION_CONFIG = {
  MLB: { source: 'mlb_stats_api', baseUrl: 'https://statsapi.mlb.com/api/v1', active: true },
  NBA: { source: 'nba_stats_api', baseUrl: 'https://stats.nba.com/stats', active: false },
  NHL: { source: 'nhl_stats_api', baseUrl: 'https://api-web.nhle.com/v1', active: false },
  NFL: { source: 'espn_unofficial_api', baseUrl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl', active: false },
  WNBA: { source: 'nba_stats_api', baseUrl: 'https://stats.nba.com/stats', active: false },
} as const

export type LeagueKey = keyof typeof LEAGUE_INGESTION_CONFIG
