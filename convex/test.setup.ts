/// <reference types="vite/client" />
// Every Convex module, for convex-test. Files with two dots (like this one) aren't Convex modules.
export const modules = import.meta.glob(["./**/*.{js,ts}", "!./**/*.d.ts", "!./**/*.*.ts", "!./tests/**"]);
