# Card Templates

This file documents the fixed zone geometry used by the reveal engine.

**Declarative spec (JSON):**

- `packages/shared/src/config/reveal-engine-zones.json` — zonas, validez por tipo, reglas de fase y plantillas (coords 0–1 card space).

**Runtime source of truth (TypeScript):**

- `packages/shared/src/config/cardTemplates.ts` — must stay in sync with `templates` in the JSON above.
- `packages/shared/src/reveal/getCandidateZones.ts` — validity matrix (`validityByCardKind` in JSON).
- `packages/shared/src/reveal/assignZonePhases.ts` — phase rules (`revealPhaseRules` in JSON).

Rules:

- Do not redefine geometry in components
- Do not hardcode coordinates in game logic
- Name and footer are always hidden
- Grids and text slices must be derived from template containers

When you change zone layout, update **both** the JSON (for docs/tooling) and the TS modules (for the running app).

Note: **`token`** card kind is handled in `getCandidateZones.ts` / `assignZonePhases.ts` like **`weapon`** but is omitted from the JSON spec above.
