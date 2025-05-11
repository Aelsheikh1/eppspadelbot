import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Safely formats a date to a human-readable string
 * @param {Date|string|null} date - The date to format
 * @param {string} formatString - The format string to use
 * @param {string} fallbackText - Text to display if date is invalid
 * @returns {string} The formatted date or fallback text
 */
export const safeFormatDate = (date, formatString = 'MMMM d, yyyy', fallbackText = 'Date not set') => {
  try {
    if (!date) return fallbackText;
    
    // Convert string to Date if needed
    let dateObj = date;
    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else if (date.toDate && typeof date.toDate === 'function') {
      // Handle Firestore timestamps
      dateObj = date.toDate();
    }
    
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return fallbackText;
    }
    
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return fallbackText;
  }
};

/**
 * Safely formats a time distance to now
 * @param {Date|string|null} date - The date to calculate distance from
 * @param {Object} options - Options for formatDistanceToNow
 * @param {string} fallbackText - Text to display if date is invalid
 * @returns {string} The formatted distance or fallback text
 */
export const safeFormatDistanceToNow = (date, options = { addSuffix: true }, fallbackText = 'Date not set') => {
  try {
    if (!date) return fallbackText;
    
    // Convert string to Date if needed
    let dateObj = date;
    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else if (date.toDate && typeof date.toDate === 'function') {
      // Handle Firestore timestamps
      dateObj = date.toDate();
    }
    
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date for distance calculation:', date);
      return fallbackText;
    }
    
    return formatDistanceToNow(dateObj, options);
  } catch (error) {
    console.error('Error calculating time distance:', error, date);
    return fallbackText;
  }
};

/**
 * Safely creates a Date object from date and time strings
 * @param {string} dateStr - The date string (YYYY-MM-DD)
 * @param {string} timeStr - The time string (HH:MM)
 * @returns {Date|null} The Date object or null if invalid
 */
export const createDateFromStrings = (dateStr, timeStr) => {
  try {
    if (!dateStr || !timeStr) return null;
    
    const dateObj = parseISO(`${dateStr}T${timeStr}`);
    
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date/time strings:', dateStr, timeStr);
      return null;
    }
    
    return dateObj;
  } catch (error) {
    console.error('Error creating date from strings:', error, dateStr, timeStr);
    return null;
  }
};
