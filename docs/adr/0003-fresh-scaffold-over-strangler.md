---
status: accepted
---

# Fresh client scaffold over workspaces (no incremental migration)

To migrate from Vue 2 (EOL, with 5 accepted vulnerabilities) to Vue 3 + Vite + TypeScript, we create a clean scaffold in `client/` and port components, instead of migrating view by view over the existing code. The repo is small (~6 components), so the rewrite risk is smaller than the cost of keeping two stacks coexisting in the same dependency tree. The Vue 2 code is isolated in the `legacy/` workspace —isolated on purpose so that npm hoists Vue 3 to the root without breaking the Vuetify plugin— and will be removed in the closing phase, once the new client reaches parity with the original demo.

## Considered Options

- Incremental migration (strangler): discarded because of the repo's size and because Vuetify 1 is not compatible with Vue 3; there is no real incremental path for the UI.
