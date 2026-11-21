import type { Metadata } from "next";
import "./globals.css";
import { PactProvider } from "@/context/PactContext";

export const metadata: Metadata = {
  title: "PACT · Collective Commerce",
  description: "One building · one shared monthly cart · one bulk order · one bill, split fairly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=DM+Serif+Display&family=Noto+Sans+Devanagari:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F3F8FB] text-[#432F2E]">
        <PactProvider>{children}</PactProvider>
      </body>
    </html>
  );
}
