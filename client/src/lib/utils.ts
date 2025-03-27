import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind CSS using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely access nested properties without throwing errors
 */
export function safeAccess<T, K extends keyof T>(obj: T | undefined, key: K): T[K] | undefined {
  return obj ? obj[key] : undefined;
}

/**
 * Format a date string to a more readable format
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' 
    ? new Date(dateString) 
    : dateString;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a time duration in minutes to hours and minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Delay execution with a promise-based timeout
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a value is defined and not null
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Generate a random string ID
 */
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, length + 2);
}