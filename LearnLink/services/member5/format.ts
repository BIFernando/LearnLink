import type { FirestoreDate } from "@/types/member5";

export function toDate(value: FirestoreDate | Date | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return typeof value.toDate === "function" ? value.toDate() : null;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function formatClock(value: FirestoreDate): string {
  const date = toDate(value);
  return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

/** "10:42 AM" today, "Yesterday", otherwise "May 12". */
export function formatListTime(value: FirestoreDate): string {
  const date = toDate(value);
  if (!date) return "";
  const now = new Date();
  if (isSameDay(date, now)) return formatClock(value);
  if (isSameDay(date, new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** "10m ago", "2h ago", "Yesterday", "May 12". */
export function formatTimeAgo(value: FirestoreDate): string {
  const date = toDate(value);
  if (!date) return "Just now";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatListTime(value);
}

/** Separator label in a conversation: "Today, May 14". */
export function formatDayLabel(date: Date): string {
  const now = new Date();
  const day = date.toLocaleDateString([], { month: "short", day: "numeric" });
  if (isSameDay(date, now)) return `Today, ${day}`;
  if (isSameDay(date, new Date(now.getTime() - 86_400_000))) return `Yesterday, ${day}`;
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function formatXp(value: number): string {
  return value.toLocaleString("en-US");
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
