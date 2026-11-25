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
  // No arrows on buttons: the button's words say what happens.
  elements: { buttonArrowIcon: { display: "none" } },
} as const;

/** Clerk's sign-in words, plainer than its defaults (and with the product's name spelled right). */
export const clerkLocalization = {
  signIn: {
    start: { title: "Sign in to LendLoop", subtitle: "With your email. We send you a code, no password." },
  },
};
