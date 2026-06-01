// Shared SVG chart-strip generator.
// Used by the streak-articles cron and the schedule page.

export type SvgCell = { result: string; date?: string }

export const CHART_COLORS: Record<string, string> = {
  win:   '#4ade80',
  loss:  '#ef4444',
  over:  '#a855f7',
  under: '#7dd3fc',
  push:  '#fbbf24',
}

export function buildSvg(cells: SvgCell[]): string {
  if (!cells.length) return ''
  const W = 12, H = 12, GAP = 2
  const totalW = cells.length * W + (cells.length - 1) * GAP
  const rects = cells.map((c, i) => {
    const x    = i * (W + GAP)
    const fill = CHART_COLORS[c.result] ?? '#3f3f46'
    const tip  = c.date ? `${c.result} · ${c.date}` : c.result
    return `<rect x="${x}" y="0" width="${W}" height="${H}" rx="2" fill="${fill}"><title>${tip}</title></rect>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${H}" aria-hidden="true">${rects}</svg>`
}
