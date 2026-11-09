const SEPARATOR = '.'
const WILDCARD = '[]'

const walk = (payload: unknown, segments: string[]): unknown => {
  let current: unknown = payload
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export const extractPath = (payload: unknown, path: string): unknown => {
  const wildcardIndex = path.indexOf(WILDCARD)
  if (wildcardIndex === -1) {
    return walk(payload, path.split(SEPARATOR).filter(Boolean))
  }

  const before = path.slice(0, wildcardIndex).split(SEPARATOR).filter(Boolean)
  const after = path.slice(wildcardIndex + WILDCARD.length + SEPARATOR.length).split(SEPARATOR).filter(Boolean)
  const collection = walk(payload, before)

  if (!Array.isArray(collection)) return undefined

  return collection.flatMap((element) => {
    const value = after.length === 0 ? element : walk(element, after)
    return value === undefined ? [] : [value]
  })
}

export const extractCollection = (payload: unknown, path: string): unknown[] => {
  const value = extractPath(payload, path.endsWith(WILDCARD) ? path : `${path}${WILDCARD}`)
  return Array.isArray(value) ? value : []
}
