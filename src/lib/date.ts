import { format, formatDistanceToNow, isValid } from 'date-fns'

/**
 * Safely formats a date or string to a specific pattern.
 * Prevents crashes if the date is invalid or null.
 */
export function safeFormat(date: Date | string | null | undefined, pattern: string, fallback: string = 'N/A'): string {
    if (!date) return fallback
    
    try {
        const d = typeof date === 'string' ? new Date(date) : date
        if (!isValid(d)) return fallback
        return format(d, pattern)
    } catch (error) {
        console.warn('Date formatting failed:', error)
        return fallback
    }
}

/**
 * Safely calculates distance to now for a date.
 * Prevents RangeError: Invalid time value crashes.
 */
export function safeFormatDistanceToNow(date: Date | string | null | undefined, options?: any, fallback: string = 'recently'): string {
    if (!date) return fallback
    
    try {
        const d = typeof date === 'string' ? new Date(date) : date
        if (!isValid(d)) return fallback
        return formatDistanceToNow(d, options)
    } catch (error) {
        console.warn('Distance formatting failed:', error)
        return fallback
    }
}
