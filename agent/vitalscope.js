(function () {
  var script = document.currentScript
  var base = (script && script.getAttribute('data-url')) || ''
  var app = (script && script.getAttribute('data-app')) || 'web'
  var token = (script && script.getAttribute('data-token')) || ''

  var fcp
  var lcp
  var cls = 0
  var inp = 0
  var ttfb
  var sent = false

  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries()
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].name === 'first-contentful-paint') fcp = entries[i].startTime
      }
    }).observe({ type: 'paint', buffered: true })
  } catch (e) {}

  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries()
      if (entries.length) lcp = entries[entries.length - 1].startTime
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (e) {}

  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries()
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].hadRecentInput) cls += entries[i].value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  } catch (e) {}

  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries()
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].duration > inp) inp = entries[i].duration
      }
    }).observe({ type: 'event', durationThreshold: 40, buffered: true })
  } catch (e) {}

  try {
    var nav = performance.getEntriesByType('navigation')[0]
    if (nav && nav.responseStart) ttfb = nav.responseStart
  } catch (e) {}

  function send() {
    if (sent) return
    sent = true
    var metrics = []
    if (ttfb != null) metrics.push({ name: 'ttfb_ms', value: Math.round(ttfb) })
    if (fcp != null) metrics.push({ name: 'fcp_ms', value: Math.round(fcp) })
    if (lcp != null) metrics.push({ name: 'lcp_ms', value: Math.round(lcp) })
    if (cls > 0) metrics.push({ name: 'cls', value: Math.round(cls * 1000) / 1000 })
    if (inp > 0) metrics.push({ name: 'inp_ms', value: Math.round(inp) })
    if (!metrics.length) return
    var url = base + '/ingest?token=' + encodeURIComponent(token)
    var body = JSON.stringify({ app: app, metrics: metrics })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(url, {
        method: 'POST',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body: body
      })
    }
  }

  window.addEventListener('pagehide', send)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') send()
  })
})()
