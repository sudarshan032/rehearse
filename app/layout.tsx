import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700", "800"] });
const body = Figtree({ variable: "--font-body", subsets: ["latin"] });
const telugu = Noto_Sans_Telugu({ variable: "--font-telugu", subsets: ["telugu"], weight: ["400", "600"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rehearse",
  description: "Build, rehearse and fix a voice agent just by speaking, in Telugu, Hindi or English.",
};

const THEME = `(function(){var d=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';try{d=localStorage.getItem('rh-theme')||d}catch(e){}document.documentElement.dataset.theme=d})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${telugu.variable} ${deva.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
