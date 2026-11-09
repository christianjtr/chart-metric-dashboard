---
status: accepted
---

# Gateway with source adapters (not direct consumption from the client)

The dashboard must work "regardless of the data source". We decided all data sources connect through adapters in an Express/tRPC gateway, and the client only knows the single Series contract. Consuming each source directly from the browser (rejected option) would couple CORS, authentication, and payload normalization to the frontend, and adding a new source would require client-side logic. With the gateway, adding a source means registering a server-side adapter; granularity aggregation also lives here, so a future adapter backed by a real database can delegate it to the actual engine.

## Consequences

- The gateway is a permanent component, not a development-time artifact.
- If the contract ever needs to be exposed to non-TypeScript clients, a REST layer is added on top of the same router.
