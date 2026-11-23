import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import "@/lib/api";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { NativeBridge } from "@/components/NativeBridge";

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
    default: "PACT · Collective Commerce Platform",
    template: "%s · PACT",
  },
  description:
    "One building · one shared monthly cart · one bulk order · one bill, split fairly. Buy together with your neighbors.",
  keywords: [
    "collective commerce",
    "apartment grocery",
    "group buying",
    "kirana bulk order",
    "bill splitting",
    "PACT",
  ],
  authors: [{ name: "PACT Team" }],
  openGraph: {
    title: "PACT · Collective Commerce Platform",
    description:
      "Shop together, lower prices, and split monthly grocery orders fairly with your neighborhood.",
    type: "website",
    siteName: "PACT",
  },
  icons: {
    icon: "/brand/pact-mark.png",
    apple: "/brand/pact-mark.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} ${notoDevanagari.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text font-sans selection:bg-border">
        <ErrorBoundary>
          <AuthProvider>
            <ToastProvider>
              <NativeBridge />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
