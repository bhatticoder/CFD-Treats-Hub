import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RS = "Rs.";

/** Format a number as PKR currency (no decimals — matches the Flutter app). */
export function money(value: number | null | undefined): string {
  return `${RS}${Math.round(value ?? 0)}`;
}

export const CURRENCY = RS;
