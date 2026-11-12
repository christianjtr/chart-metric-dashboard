# ADR 0008: Vitalscope status page, sample data, and friendly errors

- Status: accepted
- Date: 2026-11-12

## Context

Phase 8 rebranded the dashboard to Vitalscope and fixed the cwd-dependent
config-path bugs. The next UX iteration aimed for a BetterStack-style status
experience: an uptime strip plus an overall status banner. Two blockers shaped
the design:

- The gateway needs a `PAGESPEED_API_KEY` for the PSI sources, but PSI
  historically returned a hard error when the key was missing — the board
  looked broken out of the box.
- Errors surfaced through ad-hoc alerts scattered across panels, and the
  information icon (ⓘ) rendered incorrectly on some platforms.

## Decision

- **Status strip**: statusbar panels render an in-memory uptime ring — minute
  buckets covering the last 2 hours, seeded by synthetic probes at gateway
  startup and advanced live by the health probe. The ring is **not persisted**;
  after a restart the strip repopulates from scratch. The overall status
  banner is computed client-side from the statusbar panels (worst of the last
  10 buckets).
- **Sample data**: when real data is unavailable the gateway returns clearly
  flagged synthetic series instead of failing:
  - The collector seeds 2 hours of synthetic probes at startup
    (`autostart: true` only — tests construct the collector with
    `autostart: false` and must observe empty buffers).
  - PSI sources without a configured key return day-seeded synthetic vitals
    with `sample: true`; the response schema carries the flag and panels
    render a "Sample" chip.
  - Sample data is replaced instantly when the key is set via Settings — no
    restart.
- **Hot-settable API key**: `PAGESPEED_API_KEY` joins the Settings schema.
  REST adapter parameter values with a `setting:` prefix resolve from stored
  settings first, then from environment variables of the same name. The
  Settings dialog uses a password input.
- **Errors**: a single snackbar toaster (`v-snackbar`, no new dependencies)
  with deduplication (same message suppressed within a 30s TTL). All raw
  errors map to friendly copy in `client/src/utils/errors.ts` (network,
  HTTP status classes, unresolved parameters). Panels with failed requests
  render a compact placeholder instead of alert boxes. The config-load error
  shows an empty-state message plus the toast.
- **Layout softening**: sections are visual containers without borders (one
  visual box per panel remains the panel card); each section carries an
  optional `description` from the new `config.sections` array, rendered next
  to the section title. The sample-data banner is dismissible and the choice
  persists in `localStorage`.
- **Legacy cleanup**: the six legacy panels, the `platform-errors` source, and
  `server/data/data.ndjson` are removed. The ndjson adapter and its fixtures
  remain as a technical demo of the adapter interface.
- **About**: a dialog opened from a help icon in the app bar.

## Consequences

- The board is presentable on first run, with sample data and friendly copy
  instead of raw 400s.
- Uptime history resets on gateway restart; a persisted 90-day store was
  explicitly deferred.
- PSI 400s with a dummy key remain a legitimate error state — the friendly
  copy points at Settings.
- Config authors must not rely on relative paths in sources; file paths are
  resolved config-dir-relative via `server/src/config/paths.ts`.
