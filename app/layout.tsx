import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Hanken_Grotesk, Newsreader } from "next/font/google";
import { DrawingDefs } from "@/components/items/drawings";
import { Toaster } from "@/components/ui/sonner";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
// Only for an owner's own note on an item.
const newsreader = Newsreader({ subsets: ["latin"], style: "italic", variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "LendLoop",
  description: "Borrow what you need. Lend what you don't.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${hanken.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface text-ink">
        <DrawingDefs />
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            {children}
            <Toaster />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
