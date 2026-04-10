/** Semantic tokens align with globals.css — use for inline styles or docs; prefer Tailwind theme classes in components. */
export const designTokens = {
  colors: {
    void: "#0c0612",
    plum: "#1a0a1f",
    wine: "#2a0a12",
    blood: "#7f1d1d",
    gold: "#c9a227",
    goldBright: "#e8d089",
    parchment: "#f4ead8",
    mist: "#c4b8c8",
  },
  radii: {
    frame: "1rem",
    rune: "0.375rem",
  },
  transitions: {
    glow: "box-shadow 0.35s ease, border-color 0.35s ease",
    slide: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease",
  },
} as const;

/** Brand assets — add `/public/assets/logo-header.png` when the compact nav mark is ready. */
export const assetPaths = {
  /** Full lockup (title in artwork) — home hero */
  logoLockup: "/assets/logo.png",
  /** Compact mark for header/nav */
  logoMark: "/assets/logo-header.png",
  background: "/assets/bg.png",
  panelTexture: "/assets/panel.png",
} as const;
