export const resolveEnvRefs = (input: unknown): unknown => {
  if (typeof input === 'string') {
    return input.replace(/^env:([A-Za-z0-9_]+)$/, (_, name: string) => process.env[name] ?? '')
  }
  if (Array.isArray(input)) {
    return input.map(resolveEnvRefs)
  }
  if (input !== null && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, resolveEnvRefs(value)])
    )
  }
  return input
}
