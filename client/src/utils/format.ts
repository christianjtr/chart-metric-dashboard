export interface ValueFormat {
  unit?: string
  decimals?: number
}

export const formatValue = (value: number, { unit, decimals }: ValueFormat): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2
  }).format(value)
  return unit ? `${formatted} ${unit}` : formatted
}
