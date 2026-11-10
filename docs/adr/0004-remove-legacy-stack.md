# ADR 0004: Remove the legacy stack

- Status: accepted
- Date: 2026-11-10

## Context

Phase 1 scaffolded a fresh client (Vue 3 + Vite) and gateway (TypeScript + tRPC)
alongside the original stack: a Vue 2 + Vuetify 1 + C3 charts client and an
Express REST backend (`server/app.js`, `server/api/`, `server/models/`) serving
port 8081. Phases 2 and 3 made the gateway fully capable: source adapters
(ndjson, rest), date-fns aggregation, and a config-driven client consuming
`dashboard.config` and `sources.series`.

The legacy stack had been kept only as a living reference. Its presence caused
real harm:

- `vue@2.7.16` won root hoisting in npm workspaces, silently breaking
  `vite-plugin-vuetify` and (worse) making the Vue 3 client resolve Vue 2 at
  runtime until the deadlock was fixed by hoisting `vue@3` as a direct root
  dependency.
- The old REST backend duplicated data access now owned by the gateway.
- Root scripts (`serve`, `build`, `start`) still referenced the legacy tooling.

## Decision

Remove the legacy stack entirely:

- Delete the `legacy/` workspace (client only had `package.json`; its source was
  already gone).
- Delete the legacy backend: `server/app.js`, `server/api/`, `server/models/`.
- Keep `server/data/data.ndjson` — it is a live data source read by the ndjson
  adapter through `dashboard.config.json`.
- Declare `cors` as a real runtime dependency of the server (until now it only
  existed thanks to legacy hoisting).
- Keep `vue@^3.5.45` as a direct root dependency to keep winning npm hoisting.
- Re-add `vite-plugin-vuetify` with `autoImport` for automatic tree-shaking,
  which is now safe because Vue 3 owns module resolution.

## Consequences

- One client, one gateway, one config file: `client/`, `server/`,
  `dashboard.config.json`.
- The bundle no longer ships the full Vuetify library; unused components are
  tree-shaken at build time.
- Port 8081 and `concurrently` disappear from the developer workflow; development
  is `dev:server` (gateway, port 3000) plus `dev:client` (Vite, port 5173).
- Legacy history remains recoverable through git tags/history.
