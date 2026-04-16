# Zone Validity Matrix

This document defines which zones are valid for each card type in the Reveal Engine.

## Principles

- A zone may exist in the template but still be **invalid for a specific card**
- The Reveal Engine must **filter invalid zones before generating steps**
- Invalid zones must **never be revealed**

---

## Legend

- ✅ = valid zone
- ❌ = invalid zone (must be ignored)
- 🔒 = always hidden (never revealed)

---

## Zones

- ART
- TEXT
- TYPE
- COST
- PITCH
- ATTACK
- DEFENSE
- INTELLECT
- LIFE
- NAME (hidden)
- FOOTER (hidden)

---

## Card Type Matrix

| Card Type            | ART | TEXT | TYPE | COST | PITCH | ATTACK | DEFENSE | INTELLECT | LIFE | NAME | FOOTER |
|----------------------|-----|------|------|------|-------|--------|---------|-----------|------|------|--------|
| Attack Action        | ✅  | ✅   | ✅   | ✅   | ✅    | ✅     | ❌      | ❌        | ❌   | 🔒   | 🔒     |
| Non-Attack Action    | ✅  | ✅   | ✅   | ✅   | ✅    | ❌     | ❌      | ❌        | ❌   | 🔒   | 🔒     |
| Instant              | ✅  | ✅   | ✅   | ✅   | ✅    | ❌     | ❌      | ❌        | ❌   | 🔒   | 🔒     |
| Attack Reaction      | ✅  | ✅   | ✅   | ✅   | ✅    | ✅     | ❌      | ❌        | ❌   | 🔒   | 🔒     |
| Defense Reaction     | ✅  | ✅   | ✅   | ✅   | ✅    | ❌     | ❌      | ❌        | ❌   | 🔒   | 🔒     |
| Weapon               | ✅  | ✅   | ✅   | ❌   | ❌    | ✅     | ❌      | ❌        | ❌   | 🔒   | 🔒     |
| Token                | ✅  | ✅   | ✅   | ❌   | ❌    | ✅     | ❌      | ❌        | ❌   | 🔒   | 🔒     |
| Equipment            | ✅  | ✅   | ✅   | ❌   | ❌    | ❌     | ✅      | ❌        | ❌   | 🔒   | 🔒     |
| Hero                 | ✅* | ❌*  | ✅   | ❌   | ❌    | ❌     | ❌      | ✅        | ✅   | 🔒   | 🔒     |

---

## Notes

### ART
- Always valid
- For HERO, ART includes TEXT (combined visual grid)

### TEXT
- Only exists as a separate zone for non-hero cards
- HERO cards include text inside the visual grid

### TYPE
- Always valid
- Timing differs:
  - Normal cards → MID phase
  - HERO → LATE phase

### COST & PITCH
- Only present in actions, reactions, and instants
- Not present in weapons, tokens, equipment, or heroes

### ATTACK
- Only valid if the card has an attack value (includes **weapons** and **tokens**, same layout as weapons)
- Invalid for:
  - Non-attack actions
  - Instants
  - Defense reactions
  - Equipment
  - Heroes

### DEFENSE
- Only valid for equipment (armor)
- Not used for:
  - Actions
  - Instants
  - Reactions
  - Weapons
  - Tokens
  - Heroes

### INTELLECT & LIFE
- Only valid for HERO cards
- INTELLECT → MID phase
- LIFE → LATE phase

### NAME & FOOTER
- Always hidden
- Never revealed in gameplay
- Must be excluded from step generation

---

## Engine Requirement

Before generating reveal steps:

1. Build all possible zones from the template
2. Filter zones using this matrix
3. Only use valid zones for:
   - phase assignment
   - step generation