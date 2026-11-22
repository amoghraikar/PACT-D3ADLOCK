import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  weight: ["400", "500", "700"],
  subsets: ["devanagari"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "rgb(15, 118, 110)",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "PACT · Collective Commerce",
    template: "%s · PACT",
  },
  description: "One building · one shared monthly cart · one bulk order · one bill, split fairly. Buy together with your neighbors.",
  keywords: [
    "collective commerce",
    "apartment grocery",
    "group buying",
    "kirana bulk order",
    "bill splitting",
    "community pantry",
    "PACT",
  ],
  authors: [{ name: "PACT Team" }],
  openGraph: {
    title: "PACT · Collective Commerce for Communities",
    description: "Shop together, lower prices, and split monthly grocery orders fairly with your neighborhood.",
    type: "website",
    siteName: "PACT",
  },
  twitter: {
    card: "summary_large_image",
    title: "PACT · Collective Commerce",
    description: "One building · one shared monthly cart · one bill, split fairly.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/brand/pact-mark.png",
    apple: "/brand/pact-mark.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ice-50 text-ink-800 font-sans selection:bg-ice-200">
        <ErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
