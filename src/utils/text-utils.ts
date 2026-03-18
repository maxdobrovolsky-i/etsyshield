/**
 * Normalize text for comparison: lowercase, remove special characters, collapse whitespace.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text into individual words, removing punctuation.
 */
export function tokenize(text: string): string[] {
  return normalizeText(text)
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Generate sliding window phrases of 2 and 3 words from tokenized text.
 */
export function slidingWindowPhrases(words: string[]): string[] {
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i < words.length - 2) {
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
  }
  return phrases;
}

/**
 * Count words in a text string.
 */
export function wordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Get the percentage of uppercase characters in a string (excluding spaces/punctuation).
 */
export function uppercasePercentage(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return (upper / letters.length) * 100;
}

/**
 * Extract unique keywords from text (lowercase, deduplicated).
 */
export function extractKeywords(text: string): string[] {
  const words = tokenize(text);
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'are', 'was',
    'be', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'not', 'no', 'so', 'if', 'as', 'i',
    'my', 'your', 'our', 'their', 'its', 'his', 'her', 'we', 'they', 'you',
  ]);
  const unique = new Set<string>();
  for (const w of words) {
    if (w.length > 1 && !stopWords.has(w)) {
      unique.add(w);
    }
  }
  return [...unique];
}
