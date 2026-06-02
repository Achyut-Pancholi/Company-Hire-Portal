import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function generateShareToken(): string {
  return crypto.randomUUID();
}

export function getBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  
  // If a Vercel Production URL is available, always prioritize it to prevent preview URL leaks
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // If configured URL is present, use it (unless it's a known old preview URL that was hardcoded by mistake)
  if (configured && configured !== "http://localhost:3000") {
    // If they accidentally hardcoded a Vercel preview branch URL in the Env Vars, we can still use it if it's the only option,
    // but we prefer the production URL above.
    return configured.replace(/\/$/, "");
  }

  // Fallback to Vercel preview URL if on a preview branch
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}

export function getInterviewUrl(id: string): string {
  return `${getBaseUrl()}/interview/${id}`;
}

export function getShareUrl(token: string): string {
  return `${getBaseUrl()}/share/${token}`;
}

export function isExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt) < new Date();
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000
  );
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}

export async function copyToClipboard(text: string): Promise<boolean> {
  // Use the synchronous execCommand approach first for instantaneous copying
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Prevent scrolling and visual glitches
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) return true;
  } catch (err) {
    console.error("Synchronous copy failed", err);
  }

  // Fallback to async Clipboard API
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.error("Async copy failed", err);
  }
  
  return false;
}
