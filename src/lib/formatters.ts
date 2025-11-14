/**
 * Shared formatting utilities for consistent display across the application
 */

/**
 * Format currency values
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format date and time in various formats
 */
export function formatDateTime(dateStr: string | Date) {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  return {
    short: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    }),
    full: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    }),
    dateTime: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    relative: formatRelativeTime(date),
    dayOfWeek: date.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

/**
 * Format relative date for grouping (e.g., "Today", "Yesterday", "Dec 15, 2024")
 */
export function formatRelativeDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time parts for comparison
  const resetTime = (d: Date) => {
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const dateOnly = resetTime(new Date(date));
  const todayOnly = resetTime(new Date(today));
  const yesterdayOnly = resetTime(new Date(yesterday));

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return "Today";
  }
  if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return "Yesterday";
  }

  // For dates within this week, show day of week
  const diffDays = Math.floor((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7 && diffDays > 0) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  // For older dates, show full date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

/**
 * Format duration from minutes to readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Parse duration string to minutes (inverse of formatDuration)
 */
export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/(\d+)h\s*(\d+)?m?/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  return hours * 60 + minutes;
}
