export interface Threshold {
  color: string
  value: number
}

export const DEFAULT_COLOR = '#7a6ff0'

export const colorFor = (value: number, thresholds?: Threshold[]): string => {
  if (!thresholds?.length) return DEFAULT_COLOR
  const sorted = [...thresholds].sort((a, b) => a.value - b.value)
  let color = sorted[0].color
  for (const t of sorted) {
    if (value >= t.value) color = t.color
  }
  return color
}
