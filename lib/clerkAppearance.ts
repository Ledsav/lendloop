/** Clerk's sign-in modal and user menu in LendLoop's tokens (Clerk Core 3 appearance). */
export const clerkAppearance = {
  theme: "simple",
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#1b2030",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#1b2030",
    colorMutedForeground: "#646a76",
    colorBackground: "#ffffff",
    colorInput: "#f3f3f0",
    colorInputForeground: "#1b2030",
    colorBorder: "#e3e2de",
    colorRing: "#2a44c8",
    colorDanger: "#b42318",
    colorNeutral: "#1b2030",
    colorModalBackdrop: "rgba(27, 32, 48, 0.45)",
    fontFamily: "var(--font-hanken), system-ui, sans-serif",
    borderRadius: "12px",
  },
} as const;
