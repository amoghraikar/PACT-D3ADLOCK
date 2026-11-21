import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

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

export const metadata: Metadata = {
  title: "PACT · Collective Commerce",
  description: "One building · one shared monthly cart · one bulk order · one bill, split fairly.",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
