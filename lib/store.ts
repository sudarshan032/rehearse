"use client";
import type { Bot, Interview } from "./bot";

export type Answer = { id: string; q: string; a: string };
export type Change = { v: number; summary: string; before?: string; rule?: string; step?: string };
export type Draft = { id: string; brief: string; interview?: Interview; answers: Answer[]; bot?: Bot; updated: number; log?: Change[] };

const KEY = "rehearse:bots";

function all(): Record<string, Draft> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export const getDraft = (id: string): Draft | undefined => all()[id];
export const listDrafts = () => Object.values(all()).sort((a, b) => b.updated - a.updated);

export function saveDraft(d: Draft) {
  const bots = all();
  bots[d.id] = { ...d, updated: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(bots));
  } catch {}
}

export const newId = () => Math.random().toString(36).slice(2, 10);

export async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ error: "No answer from the server." }));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json;
}
