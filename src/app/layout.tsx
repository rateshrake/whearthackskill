import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${notoSans.variable} ${notoSansDevanagari.variable}`}
    >
      <body className="bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950 min-h-screen">
        {children}
      </body>
    </html>
  );
}
