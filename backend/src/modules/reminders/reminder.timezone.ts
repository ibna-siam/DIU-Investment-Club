/**
 * DIU Investment Club - Timezone Utility for Smart Reminder Engine
 *
 * Enforces Section 8: Timezone Management
 * Primary operational timezone: Asia/Dhaka (UTC+6)
 *
 * Rules:
 * - All database records persist standard ISO 8601 UTC timestamps.
 * - All reminder offset calculations anchor to the Asia/Dhaka timezone calendar.
 * - Format helpers produce clean, localized timestamps for email bodies and dashboards.
 */

export const DHAKA_TIMEZONE = 'Asia/Dhaka';
export const DHAKA_OFFSET_HOURS = 6;
export const DHAKA_OFFSET_MS = DHAKA_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Returns current Date in UTC
 */
export function getUtcDate(): Date {
  return new Date();
}

/**
 * Returns current timestamp in ISO 8601 UTC
 */
export function getCurrentUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Converts any Date or ISO string to Asia/Dhaka representation
 */
export function toDhakaDate(dateInput: Date | string): Date {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Date(d.getTime() + DHAKA_OFFSET_MS);
}

/**
 * Formats a Date or ISO timestamp into a readable Dhaka string
 * Example: "15 Oct 2026, 04:30 PM (BST)"
 */
export function formatDhakaDateTime(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  
  // Normalize am/pm to uppercase PM/AM for consistent display across node environments
  const normalized = formatted.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
  return `${normalized} (BST)`;
}

/**
 * Formats a Date or ISO string into a localized Dhaka date only
 * Example: "15 Oct 2026"
 */
export function formatDhakaDate(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Calculates a scheduled target timestamp based on an anchor target date and an offset specification.
 *
 * Supported offset specifications:
 * - '-7d': 7 days before
 * - '-3d': 3 days before
 * - '-24h': 24 hours before
 * - '-1d': 1 day before
 * - '-1h': 1 hour before
 * - '0d' / 'DUE': Exact target date/time
 * - '+1d' / '+24h': 1 day after (overdue notice)
 * - '+3d': 3 days after (escalation notice)
 *
 * Returns ISO 8601 UTC timestamp string.
 */
export function calculateScheduledTime(anchorDateStr: string, offsetSpec: string): string {
  const anchorTime = new Date(anchorDateStr).getTime();
  if (isNaN(anchorTime)) {
    throw new Error(`Invalid anchor date string: "${anchorDateStr}"`);
  }

  let offsetMs = 0;

  switch (offsetSpec.trim()) {
    case '-7d':
      offsetMs = -7 * 24 * 60 * 60 * 1000;
      break;
    case '-3d':
      offsetMs = -3 * 24 * 60 * 60 * 1000;
      break;
    case '-24h':
    case '-1d':
      offsetMs = -24 * 60 * 60 * 1000;
      break;
    case '-1h':
      offsetMs = -1 * 60 * 60 * 1000;
      break;
    case '0d':
    case 'DUE':
    case 'ON_DATE':
      offsetMs = 0;
      break;
    case '+1d':
    case '+24h':
      offsetMs = 24 * 60 * 60 * 1000;
      break;
    case '+3d':
      offsetMs = 3 * 24 * 60 * 60 * 1000;
      break;
    default:
      // Try parsing numeric days or hours if specified, e.g. "-2d" or "-2h"
      const match = offsetSpec.match(/^([+-]?\d+)([dh])$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        offsetMs = unit === 'd' ? val * 24 * 60 * 60 * 1000 : val * 60 * 60 * 1000;
      } else {
        offsetMs = 0;
      }
  }

  const scheduledTimeMs = anchorTime + offsetMs;
  return new Date(scheduledTimeMs).toISOString();
}

/**
 * Checks if a given timestamp is due for processing against current time
 */
export function isTimestampDue(scheduledAtIso: string, referenceTime: Date = new Date()): boolean {
  const scheduledMs = new Date(scheduledAtIso).getTime();
  return scheduledMs <= referenceTime.getTime();
}
