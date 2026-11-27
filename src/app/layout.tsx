import type { Metadata } from "next";
import { headers } from "next/headers";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VayuShield | Urban Air Quality & Clean-Air Navigator",
  description:
    "Production-grade bilingual (English/Hindi) air quality intelligence platform for Delhi-NCR and urban India. Features dual-scale reality checks, diurnal exposure optimization, indoor mass balance physics, and community action bulletins.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers forces dynamic SSR so Next.js 15 attaches the live
  // per-request CSP nonce generated in middleware.ts to framework script tags.
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`dark ${notoSans.variable} ${notoSansDevanagari.variable}`}
      data-csp-nonce={nonce ? "active" : undefined}
    >
      <body className="bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950 min-h-screen">
        {children}
      </body>
    </html>
  );
}
