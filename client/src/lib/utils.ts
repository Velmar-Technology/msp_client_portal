import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges class names using clsx and tailwind-merge.
 * Resolves Tailwind CSS class conflicts according to specificity.
 *
 * @param inputs - Class names, conditional objects, or class arrays to merge.
 * @returns Formatted and deduplicated class name string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

