import { Suspense } from "react";

export default function BotLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="page muted">Loading…</main>}>{children}</Suspense>;
}
