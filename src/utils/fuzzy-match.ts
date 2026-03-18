/**
 * Levenshtein distance calculation for typo detection in trademark matching.
 * Returns the minimum number of single-character edits needed to transform one string into another.
 */
export function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;

  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use two rows instead of full matrix for memory efficiency
  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,      // deletion
        curr[j - 1] + 1,  // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Check if a word is a fuzzy match for a brand name.
 * Very strict thresholds to avoid false positives on common English words.
 *
 * Rules:
 * - Both word and brand must be 7+ characters (short words cause too many false matches)
 * - For brands 7-9 chars: max distance = 1
 * - For brands 10+ chars: max distance = 2
 * - The first character must match (most real typos keep the first letter)
 */
export function isFuzzyMatch(word: string, brand: string): boolean {
  if (brand.length < 7) return false;
  if (word.length < 7) return false;

  // Quick length check
  if (Math.abs(word.length - brand.length) > 2) return false;

  const wLower = word.toLowerCase();
  const bLower = brand.toLowerCase();

  // First character must match to avoid wild matches
  if (wLower[0] !== bLower[0]) return false;

  const maxDist = brand.length >= 10 ? 2 : 1;
  return levenshteinDistance(wLower, bLower) <= maxDist;
}

/**
 * Check if a word is an exact match (case-insensitive) for a brand or its variants.
 */
export function isExactMatch(word: string, targets: string[]): boolean {
  const lower = word.toLowerCase();
  return targets.some(t => t.toLowerCase() === lower);
}
