export interface Threshold {
  color: string
  value: number
}

export const DEFAULT_COLOR = '#3274d9'

export const colorFor = (value: number, thresholds?: Threshold[]): string => {
  if (!thresholds?.length) return DEFAULT_COLOR
  const sorted = [...thresholds].sort((a, b) => a.value - b.value)
  let color = sorted[0].color
  for (const t of sorted) {
    if (value >= t.value) color = t.color
  }
  return color
}

export const gaugeColorStops = (
  thresholds: Threshold[] | undefined,
  min = 0,
  max = 100
): Array<[number, string]> => {
  const sorted = [...(thresholds ?? [])].sort((a, b) => a.value - b.value)
  if (!sorted.length) return [[0, DEFAULT_COLOR], [1, DEFAULT_COLOR]]

  const range = max - min || 1
  const stops: Array<[number, string]> = []
  if (sorted[0].value > min) stops.push([0, sorted[0].color])
  for (const t of sorted) {
    stops.push([Math.min(1, Math.max(0, (t.value - min) / range)), t.color])
  }
  if (stops[stops.length - 1][0] < 1) stops.push([1, sorted[sorted.length - 1].color])
  return stops
}
