import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a phone number to E.164-ish format for deduplication.
 * Strips everything non-numeric, adds +1 prefix for 10-digit US numbers.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Format a phone number for display: +12125551234 → (212) 555-1234
 */
export function formatPhone(normalized: string): string {
  const digits = normalized.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const d = digits.slice(1);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return normalized;
}

/**
 * Generate a URL-safe business slug from a business name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

/**
 * Format a punch count nicely: "7 / 10"
 */
export function formatPunches(current: number, required: number): string {
  return `${current} / ${required}`;
}

/**
 * Return minutes remaining formatted as "3h 12m" or "45m"
 */
export function formatCooldownRemaining(minutesRemaining: number): string {
  if (minutesRemaining < 60) return `${minutesRemaining}m`;
  const h = Math.floor(minutesRemaining / 60);
  const m = minutesRemaining % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Relative time: "2 minutes ago", "just now"
 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
