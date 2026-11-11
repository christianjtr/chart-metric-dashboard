export interface DeltaPoint {
  y: number
}

export interface DeltaOptions {
  unit?: string
  title?: string
  lowerIsBetter?: boolean
}

export interface DeltaInfo {
  pct: number
  direction: 'up' | 'down'
  improved: boolean
}

export const deltaInfo = (
  points: DeltaPoint[],
  opts: DeltaOptions = {}
): DeltaInfo | undefined => {
  if (points.length < 2) return undefined
  const last = points[points.length - 1].y
  const prev = points[points.length - 2].y
  if (prev === 0) return undefined
  const pct = ((last - prev) / prev) * 100
  if (!Number.isFinite(pct)) return undefined
  const direction: 'up' | 'down' = last > prev ? 'up' : 'down'
  const higherIsBetter =
    opts.lowerIsBetter === undefined
      ? opts.unit === 'pts' || /requests/i.test(opts.title ?? '')
      : !opts.lowerIsBetter
  const improved = higherIsBetter ? direction === 'up' : direction === 'down'
  return { pct, direction, improved }
}
