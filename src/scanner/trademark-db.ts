import type { BrandEntry, TrademarkDatabase } from '../types/index';
import trademarkData from '../data/trademarks.json';

/**
 * Score overrides for brand names that are common English words.
 * These get a low distinctiveness score instead of the default 1.0.
 */
const LOW_SCORE_BRANDS: Record<string, number> = {
  'up': 0.15, 'cars': 0.2, 'brave': 0.2, 'frozen': 0.25,
  'soul': 0.2, 'coco': 0.3, 'luca': 0.3, 'onward': 0.2,
  'bolt': 0.15, 'inside out': 0.2, 'turning red': 0.3,
  'risk': 0.1, 'dodge': 0.1, 'mustang': 0.2, 'explorer': 0.1,
  'eclipse': 0.15, 'spark': 0.1, 'flash': 0.15, 'rush': 0.1,
  'chrome': 0.15, 'edge': 0.1, 'ring': 0.15, 'halo': 0.2,
  'monopoly': 0.3, 'clue': 0.15, 'life': 0.1, 'sorry': 0.1,
  // Social media — sellers legitimately mention these in descriptions
  'instagram': 0.15, 'facebook': 0.15, 'pinterest': 0.15,
  'tiktok': 0.15, 'youtube': 0.15, 'twitter': 0.15,
  'meta': 0.1, 'whatsapp': 0.1, 'snapchat': 0.15,
};

/** A single term match from the index */
export interface TermMatch {
  brand: BrandEntry;
  term: string;
  score: number;
  isDirectBrand: boolean;
  ambiguous: boolean;
}

/**
 * Trademark database with corroboration-first scoring.
 *
 * Instead of blocklists and tier classification, every term gets a
 * distinctiveness score (0.0-1.0). Ambiguous terms can be cleared by
 * safe-phrase matching. No term is ever fully blocked -- scores
 * simply determine how much corroboration is needed to trigger a finding.
 */
class TrademarkDB {
  private termIndex: Map<string, TermMatch[]> = new Map();
  private safePhrases: Map<string, Set<string>> = new Map();
  private brands: BrandEntry[] = [];
  private loaded = false;

  load(): void {
    if (this.loaded) return;
    const db = trademarkData as TrademarkDatabase;
    this.brands = db.brands;

    for (const brand of this.brands) {
      const nameLower = brand.name.toLowerCase();

      // Determine brand name score: 1.0 by default, or low score for common words
      const brandScore = LOW_SCORE_BRANDS[nameLower] ?? 1.0;
      const brandAmbiguous = nameLower in LOW_SCORE_BRANDS;

      // Index brand name
      this.addToIndex(nameLower, {
        brand,
        term: nameLower,
        score: brandScore,
        isDirectBrand: true,
        ambiguous: brandAmbiguous,
      });

      // Index variants (misspellings are distinctive -- score 0.9)
      for (const variant of brand.variants) {
        const varLower = variant.toLowerCase();
        this.addToIndex(varLower, {
          brand,
          term: varLower,
          score: 0.9,
          isDirectBrand: true,
          ambiguous: false,
        });
      }

      // Index related terms with scores from JSON
      for (const rel of brand.related) {
        const relLower = rel.t.toLowerCase();
        // Skip pure numbers (e.g., "21", "30" for Adele albums)
        if (/^\d+$/.test(relLower)) continue;
        // Skip very short terms (<=2 chars -- too generic)
        if (relLower.length <= 2) continue;

        this.addToIndex(relLower, {
          brand,
          term: relLower,
          score: rel.s,
          isDirectBrand: false,
          ambiguous: rel.a === true,
        });
      }

      // Index safe phrases
      if (brand.safe && brand.safe.length > 0) {
        const safeSet = new Set<string>();
        for (const phrase of brand.safe) {
          safeSet.add(phrase.toLowerCase());
        }
        this.safePhrases.set(brand.name.toLowerCase(), safeSet);
      }
    }

    this.loaded = true;
  }

  /**
   * Add a term match to the index. A single term can match multiple brands,
   * so the index stores arrays.
   */
  private addToIndex(term: string, match: TermMatch): void {
    const existing = this.termIndex.get(term);
    if (existing) {
      existing.push(match);
    } else {
      this.termIndex.set(term, [match]);
    }
  }

  /** Look up a term and return all brand matches */
  lookup(term: string): TermMatch[] {
    if (!this.loaded) this.load();
    return this.termIndex.get(term.toLowerCase()) || [];
  }

  /**
   * Check if the surrounding text contains a safe phrase for a brand.
   * Safe phrases indicate the term is used in a non-trademark context
   * (e.g., "frozen food" clears "frozen" for Disney).
   */
  isSafePhrase(brandName: string, surroundingText: string): boolean {
    const safes = this.safePhrases.get(brandName.toLowerCase());
    if (!safes) return false;
    const lower = surroundingText.toLowerCase();
    for (const phrase of safes) {
      // Exact substring match
      if (lower.includes(phrase)) return true;
      // Loose match: all words of safe phrase appear in text (not necessarily adjacent)
      const phraseWords = phrase.split(' ');
      if (phraseWords.length >= 2 && phraseWords.every(w => lower.includes(w))) {
        return true;
      }
    }
    return false;
  }

  /** Get all brand entries for fuzzy matching */
  getAllBrands(): BrandEntry[] {
    if (!this.loaded) this.load();
    return this.brands;
  }

  /** Get the brand name score (for fuzzy matching eligibility check) */
  getBrandNameScore(brandName: string): number {
    return LOW_SCORE_BRANDS[brandName.toLowerCase()] ?? 1.0;
  }
}

export const trademarkDB = new TrademarkDB();
