# Chart Dashboard

A dashboard that renders chart panels from a declarative configuration, connecting to interchangeable data sources through a gateway with adapters.

## Language

**Source**:
A data origin declared in the configuration (ndjson, REST) with its declarative mapping.
_Avoid_: provider, datasource, connection

**Adapter**:
Implementation that materializes a Source according to its kind and exposes its data as Series.
_Avoid_: driver, connector, provider

**Mapping**:
Declaration of where to extract date, value, and series from a Source's raw payload.
_Avoid_: schema, transform, selector

**Gateway**:
The Express/tRPC layer that exposes the single Series contract and shields the client from each Source's specifics.
_Avoid_: backend, API, server (ambiguous)

**Series**:
A named set of (x, y) points produced by applying a Granularity and a grouping to a Source's data.
_Avoid_: dataset, curve, line

**Granularity**:
The temporal bucket size used for aggregation: day, week, month, or year. Aggregation happens in the Gateway.
_Avoid_: frequency, period, interval

**Panel**:
The visual unit of the dashboard: combines a Source, a metric, a chart type, filters, and a Refresh.
_Avoid_: card, widget, chart (a chart is only the render type)

**Refresh**:
The interval in seconds at which a Panel re-requests its Series from the Gateway (polling).
_Avoid_: polling, interval, auto-update

**Reduce**:
How each time bucket collapses its events into one y value: sum, avg, last, min, or max. Defaults to sum.
_Avoid_: aggregation function, reducer, rollup

**Threshold**:
A `{color, value}` bound on a Panel; the color of the highest threshold at or below the current value wins (Grafana semantics).
_Avoid_: alert rule, limit, budget

**Span**:
How many of the 12 grid columns a Panel occupies on desktop. Defaults to 6 (two panels per row).
_Avoid_: width, size, columns

**Section**:
A named row group that orders Panels in declaration order and renders a header.
_Avoid_: row, group, category

**Dashboard Config**:
The single shared file (`dashboard.config.json`) declaring Sources and Panels; both layers consume it.
_Avoid_: settings, manifest, app config
