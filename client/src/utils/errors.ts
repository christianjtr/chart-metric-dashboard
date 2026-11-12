const PSI = /pagespeed/i

export const friendlyError = (raw: string): string => {
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return 'Cannot reach the gateway. Make sure it is running and refresh.'
  }
  const status = raw.match(/responded (\d{3})/)
  if (status) {
    const code = Number(status[1])
    if (code === 400) {
      return PSI.test(raw)
        ? 'PageSpeed rejected the request — check the target URL and API key in Settings.'
        : 'The data source rejected the request (invalid parameters).'
    }
    if (code === 401 || code === 403) {
      return 'Access denied by the data source — the API key is missing or invalid.'
    }
    if (code === 404) {
      return 'Data source endpoint not found — check the URL in the config.'
    }
    if (code === 429) {
      return 'The data source is rate limiting us. Try again in a few minutes.'
    }
    if (code >= 500) {
      return 'The data source is having problems (server error). Try again later.'
    }
    return `The data source request failed (HTTP ${code}).`
  }
  if (/unresolved parameter|missing env var|missing.*setting/i.test(raw)) {
    return 'A required API key or setting is missing for this source — configure it in Settings.'
  }
  if (/unexpected|invalid|parse/i.test(raw)) {
    return 'The data source returned an unexpected response format.'
  }
  return 'Something went wrong fetching this panel. Check the console for details.'
}
