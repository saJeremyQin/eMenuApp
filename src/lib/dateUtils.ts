/**
 * Format ISO timestamp to human-readable format
 * @param timestamp ISO string or Date object
 * @param includeSeconds whether to include seconds (default: true)
 * @returns Formatted string like "22 Feb, 2:32 PM" or "22 Feb, 2:32:45 PM"
 */
export function formatDateTime(
  timestamp: string | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  
  if (includeSeconds) {
    return `${day} ${month}, ${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`;
  }
  
  return `${day} ${month}, ${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Format ISO timestamp to date only
 * @param timestamp ISO string or Date object
 * @returns Formatted string like "22 Feb 2026"
 */
export function formatDate(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Format ISO timestamp to time only
 * @param timestamp ISO string or Date object
 * @param includeSeconds whether to include seconds (default: false)
 * @returns Formatted string like "2:32 PM" or "2:32:45 PM"
 */
export function formatTime(
  timestamp: string | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  
  if (includeSeconds) {
    return `${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`;
  }
  
  return `${displayHours}:${displayMinutes} ${ampm}`;
}
