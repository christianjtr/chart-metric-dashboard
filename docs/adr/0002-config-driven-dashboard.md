---
status: accepted
---

# Config-driven dashboard backed by a single shared file

So the dashboard can work with any source without writing code, we decided Sources and Panels live declared in a single `dashboard.config.json` consumed by both the gateway (to instantiate adapters) and the client (to render panels). We rejected per-layer configs because they would duplicate each source's definition and break the promise of "adding a dashboard = editing a JSON". Field mapping (date, value, series) is declarative, and per-source secrets are resolved through `env:VAR` references processed with Node's native `process.env`, so the file is safe to commit.
