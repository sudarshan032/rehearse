import type { Metadata } from "next";
import { Caveat, Courier_Prime, Geist, Instrument_Serif, JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

// Rehearsal-room look: a theatre serif for titles, a typewriter face for the script, a pencil hand for notes.
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const body = Geist({ variable: "--font-body", subsets: ["latin"] });
const script = Courier_Prime({ variable: "--font-script", subsets: ["latin"], weight: ["400", "700"] });
const pencil = Caveat({ variable: "--font-pencil", subsets: ["latin"], weight: ["500", "700"] });
const telugu = Noto_Sans_Telugu({ variable: "--font-telugu", subsets: ["telugu"], weight: ["400", "600"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rehearse",
  description: "Build, rehearse and fix a voice agent just by speaking, in Telugu, Hindi or English.",
};

const THEME = `(function(){var d='dark';try{d=localStorage.getItem('rh-theme')||d}catch(e){}document.documentElement.dataset.theme=d})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${telugu.variable} ${deva.variable} ${mono.variable} ${script.variable} ${pencil.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
