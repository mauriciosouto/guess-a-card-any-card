# Card Templates

This file documents the fixed zone geometry used by the reveal engine.

Source of truth:
- apps/web/src/config/cardTemplates.ts

Rules:
- Do not redefine geometry in components
- Do not hardcode coordinates in game logic
- Name and footer are always hidden
- Grids and text slices must be derived from template containers