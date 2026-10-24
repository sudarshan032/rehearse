import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["600", "800"] });
const body = Figtree({ variable: "--font-body", subsets: ["latin"] });
const telugu = Noto_Sans_Telugu({ variable: "--font-telugu", subsets: ["telugu"], weight: ["400", "600"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rehearse",
  description: "Build, rehearse and fix a voice agent just by speaking, in Telugu, Hindi or English.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${telugu.variable} ${mono.variable}`}>
      <body>
        <header className="top">
          <Link href="/" className="brand">
            Rehearse
          </Link>
          <span className="tag">talk your voice bot into shape</span>
          <nav>
            <Link href="/bots">My bots</Link>
            <Link href="/" className="btn small">
              New bot
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
