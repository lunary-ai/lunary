# Lunary Filter System Overview

This note captures how the existing run/log filter stack is wired today so we can design the semantic translation layer without breaking current behaviour.

## Shared Filter Metadata (`packages/shared/checks`)
- `Check` definitions power both the UI pickers and backend validation. Each entry lists an `id`, `name`, optional `uiType`, and a `params` array describing the inputs shown in the filter chips.
- `CheckParam` shapes include `select`, `text`, `number`, `date`, and `users`. Labels inside a filter chip are represented as `{ type: "label", label: string }` and are ignored when serialising.
- `CheckLogic` is the canonical filter payload: it is a tuple whose first element is `"AND"` or `"OR"` followed by `LogicElement`s. Each element is either:
  - a leaf `{ id: string; params: Record<string, any> }`, or
  - a nested `LogicNode` (for grouped AND/OR clauses).
- The serializer (`packages/shared/checks/serialize.ts`):
  - `serializeLogic` converts `CheckLogic` into a query-string format (`type=llm&duration=gt.2` …). A two-level dot notation orders the parameter values according to the filter definition.
  - `deserializeLogic` reverses that string back into `CheckLogic`. It looks up the filter definition from `CHECKS` to coerce types (dates → `Date`, numbers → `number`, multi-selects → `string[]`).
- Parameter helpers in `packages/shared/checks/params.ts` provide common option sets (`NUMBER_PARAM`, `FIELD_PARAM`, etc.) so both the UI and backend agree on operator keywords.
- UI-specific affordances live in `packages/frontend/components/checks`, e.g. `ChecksInputs.tsx` builds each control and `Picker.tsx` restricts selectable filters. `ChecksUIData.tsx` only contains presentation metadata (icons/descriptions).

## Filters Used On LLM Logs
- The logs page enforces a whitelist per run type via `CHECKS_BY_TYPE` (`packages/frontend/pages/logs/index.tsx`). LLM logs permit the following filter IDs:
  - `"date"` – operator `gt/lt` + `Date`
  - `"models"` – multi-select backed by `/filters/models`
  - `"tags"` – multi-select backed by `/filters/tags`
  - `"users"` – project-scoped user picker (`/filters/users`)
  - `"languages"` – AI enricher requiring evaluator output, accepts `field` (`input|output|any`) + ISO language codes
  - `"templates"` – prompt template selection (`/filters/templates`)
  - `"status"` – enum (`success|error`)
  - `"metadata"` – key/value pairs (`/filters/metadata?type=...`)
  - `"feedback"` – multi-select of JSON-encoded `{ thumb: "up" | "down" | null }` records
  - `"cost"` – numeric comparison in dollars
  - `"duration"` – numeric comparison in seconds
  - `"topics"` – AI enricher list (`/filters/topics`)
  - `"tokens"` – numeric comparison on prompt/completion/total token counts
  - `"toxicity"` – AI enricher flag (field + toxic/non-toxic)
  - `"pii"` – AI enricher flag (contains / not contains)
- Other filter IDs (regex, string match, length, etc.) exist for analytics/evals but are not exposed in the default LLM logs view unless `CHECKS_BY_TYPE` is extended.

## Backend Execution Path
- Incoming requests include the serialized logic in the query string. For `/v1/runs` the handler (`packages/backend/src/api/v1/runs/index.ts`) splits filters into:
  - **Main filters** – everything except `languages`, `pii`, `topics` goes into the primary SQL where clause.
  - **Enricher filters** – those three IDs are evaluated against evaluator join tables (`evaluation_result_v2`), so they are applied separately when fetching enrichment data.
- `convertChecksToSQL` (`packages/backend/src/utils/checks.ts`) walks the `CheckLogic` tree and stitches SQL fragments provided by each check runner:
  - Logical nodes become `(... AND ...)` / `(... OR ...)` using recursive descent.
  - Leaf nodes pull the `sql` handler from `packages/backend/src/checks/index.ts` (exported as `CHECK_RUNNERS`). If no handler exists the filter silently becomes a no-op.
- Important runners for log filters:
  - `"type"` defaults to `llm` when no custom filters are provided.
  - `"models"` → `r.name = ANY($1)` on the run table.
  - `"tags"` → `r.tags && ARRAY[...]`.
  - `"templates"` → joins template ids via `t.id = ANY(...)`.
  - `"status"` → `r.status = $1`.
  - `"metadata"` → JSON containment with numeric/bool coercion.
  - `"feedback"` → inspects run-level feedback JSON plus child runs for comments/thumbs.
  - `"users"` → matches `r.external_user_id` against selected IDs.
  - `"cost"`, `"duration"`, `"tokens"` → numeric comparisons; note `"tokens"` treats `"total"` as `prompt + completion` and other selections map to individual `_tokens` columns (there is a typo `postgresisOperators` that should call `postgresOperators`).
  - `"languages"`, `"topics"`, `"pii"` → ensure evaluator outputs (`evaluation_result_v2`) contain matching entries. These rely on the outer query joining evaluator tables under aliases `e2` / `er2`.
- Option endpoints live under `packages/backend/src/api/v1/filters.ts`. They are project-scoped, pre-filtered SQL queries feeding the select controls.

## Query String Examples
- `["AND", { id: "type", params: { type: "llm" } }]` serialises to `type=llm`.
- Adding duration > 2 seconds becomes `type=llm&duration=gt.2`, where the order of `gt` and numeric payload follows the `params` declaration for `"duration"`.
- Nested OR: `["AND", ["OR", { id: "tags", params: { tags: ["alpha"] } }, { id: "tags", params: { tags: ["beta"] } }]]` serialises to `OR&tags=alpha&tags=beta`.

## Observability & Edge Cases
- The backend trusts `deserializeLogic` to coerce parameter types; malformed query strings return leaf nodes with `params` omitted, effectively removing the filter.
- Unknown filter IDs are ignored downstream because `convertChecksToSQL` returns `sql```.
- Enricher filters only work if evaluator pipelines have produced rows; otherwise they resolve to `false` and drop the run from the result set.
- Multi-select values are double-encoded when serialised (`encodeURIComponent` twice) because dots are significant in the query grammar.

These details should inform the semantic translation layer: we must emit valid `CheckLogic` payloads that align with existing check IDs, parameter ordering, and operator keywords so they round-trip through the serializer and SQL layer without breaking the logs UI or backend queries.

