import { nanoid } from 'nanoid';

/**
 * Generates a URL-safe unique reference ID for chatbots.
 * Default length: 12 characters.
 */
export const generateReferenceId = (length = 12): string => nanoid(length);
