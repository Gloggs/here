import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Initialize the profanity matcher with English dataset and recommended transformers
const profanityMatcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers
});

/**
 * Enhanced profanity check that uses the obscenity package for more robust detection
 * This approach detects various obfuscation methods like character substitution,
 * leetspeak, zero-width characters, and more without storing explicit words in the code
 * 
 * @param {string} text - The text to check for profanity
 * @returns {boolean} - Returns true if profanity is found, false otherwise
 */
export const containsProfanity = (text) => {
  if (!text) return false;
  
  // Use the obscenity matcher to check for profanity
  return profanityMatcher.hasMatch(text);
};
