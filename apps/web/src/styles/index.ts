/**
 * PACT design token references and utility constants.
 */

export const TOKENS = {
  colors: {
    background: "var(--background)",
    surface: "var(--surface)",
    border: "var(--border)",
    primary: "var(--primary)",
    primaryHover: "var(--primary-hover)",
    text: "var(--text)",
    muted: "var(--muted)",
  },
  fonts: {
    display: "var(--font-display)",
    sans: "var(--font-sans)",
    hindi: "var(--font-hindi)",
  },
  radii: {
    card: "var(--radius-card)",
    ctl: "var(--radius-ctl)",
    pill: "var(--radius-pill)",
  },
} as const;
