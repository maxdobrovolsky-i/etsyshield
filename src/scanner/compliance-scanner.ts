import type { Finding, ListingData, ScanResult, BrandEntry } from '../types/index';
import { trademarkDB } from './trademark-db';
import { checkProhibitedItems } from './prohibited-items';
import { checkResellIndicators, checkDigitalPolicyConflict } from './policy-rules';
import { isFuzzyMatch } from '../utils/fuzzy-match';
import { tokenize, slidingWindowPhrases } from '../utils/text-utils';

/**
 * Common word suffixes that indicate a word is a normal English verb/noun form,
 * not a misspelling of a brand. E.g., "transforms" is not "Transformers".
 */
/**
 * If a word is a common English inflection of a root word, skip fuzzy matching.
 * "transforms" → root "transform" (common verb) → skip fuzzy match with "Transformers"
 * "adidas" → root "adida" (not a word) → allow fuzzy match
 */
const INFLECTION_ENDINGS = ['s', 'es', 'ed', 'ing', 'er', 'ers', 'ly'];

/**
 * Brand indicator words that boost ambiguous matches.
 * When these appear in the listing text, even low-score matches
 * become more suspicious because the seller is signaling "brand context."
 */
const BRAND_INDICATORS = new Set([
  'themed', 'inspired', 'character', 'costume', 'cosplay',
  'birthday', 'party', 'cake topper', 'licensed', 'official',
  'replica', 'fan art', 'fandom', 'merch', 'merchandise',
]);

/** Score thresholds for generating findings */
const FLAG_THRESHOLD = 1.0;
const WARNING_THRESHOLD = 0.7;

/**
 * Run a full compliance scan on an Etsy listing.
 */
export function scanCompliance(listing: ListingData): ScanResult {
  const findings: Finding[] = [];

  const allText = `${listing.title} ${listing.tags.join(' ')} ${listing.description}`;

  // 1. Trademark checks (corroboration-first scoring)
  findings.push(...checkTrademarks(listing));

  // 2. Prohibited items
  findings.push(...checkProhibited(allText));

  // 3. Handmade policy
  findings.push(...checkHandmadePolicy(allText));

  // 4. Digital product policy
  findings.push(...checkDigitalPolicy(listing.tags, listing.description));

  // Green findings for passed checks
  if (!findings.some(f => f.title.includes('trademark') || f.title.includes('Trademark'))) {
    findings.push({
      severity: 'green',
      title: 'No trademark issues detected',
      description: 'No known trademarked terms were found in your listing.',
      fix: 'Keep using original, non-branded terms in your listings.',
    });
  }

  if (!findings.some(f => f.title.includes('rohibited'))) {
    findings.push({
      severity: 'green',
      title: 'No prohibited items detected',
      description: 'Your listing does not contain keywords associated with prohibited items or regulated claims.',
      fix: 'Continue following Etsy\'s prohibited items policy.',
    });
  }

  if (!findings.some(f => f.title.includes('andmade') || f.title.includes('resell'))) {
    findings.push({
      severity: 'green',
      title: 'Handmade policy compliance',
      description: 'No reselling or mass-production indicators were found.',
      fix: 'Keep emphasizing the handmade nature of your products.',
    });
  }

  const score = calculateScore(findings);
  findings.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
  return { score, findings };
}

function severityOrder(s: string): number {
  return s === 'red' ? 0 : s === 'yellow' ? 1 : 2;
}

function calculateScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'red') score -= 20;
    if (f.severity === 'yellow') score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

/** Accumulated score entry for a single brand */
interface BrandScoreEntry {
  brand: BrandEntry;
  score: number;
  terms: string[];
  fields: string[];
}

/**
 * Three-pass trademark detection with corroboration-first scoring.
 *
 * Pass 1: Collect all term matches across title, tags, description.
 *         Safe-phrase checks filter out ambiguous terms used in innocuous contexts.
 * Pass 2: Check for brand indicator words that boost ambiguous matches.
 * Pass 3: Generate findings based on accumulated score per brand.
 *
 * This eliminates false positives from isolated common words while still
 * catching real violations through score accumulation and corroboration.
 */
function checkTrademarks(listing: ListingData): Finding[] {
  trademarkDB.load();

  const fullText = `${listing.title} ${listing.tags.join(' ')} ${listing.description}`;
  const fields: Array<{ text: string; type: 'title' | 'tag' | 'description'; mult: number }> = [
    { text: listing.title, type: 'title', mult: 1.5 },
    ...listing.tags.map(t => ({ text: t, type: 'tag' as const, mult: 1.3 })),
    { text: listing.description, type: 'description', mult: 1.0 },
  ];

  // ---- Pass 1: Collect all matches ----
  const brandScores = new Map<string, BrandScoreEntry>();

  for (const field of fields) {
    const words = tokenize(field.text);
    const phrases = slidingWindowPhrases(words);

    for (const term of [...words, ...phrases]) {
      const matches = trademarkDB.lookup(term);
      for (const match of matches) {
        const brandKey = match.brand.name.toLowerCase();

        // Safe-phrase check: if the term appears in a known safe context, skip it
        if (match.ambiguous && trademarkDB.isSafePhrase(match.brand.name, fullText)) {
          continue;
        }

        if (!brandScores.has(brandKey)) {
          brandScores.set(brandKey, { brand: match.brand, score: 0, terms: [], fields: [] });
        }

        const entry = brandScores.get(brandKey)!;
        // Don't double-count same term
        if (entry.terms.includes(term)) continue;

        entry.terms.push(term);
        if (!entry.fields.includes(field.type)) {
          entry.fields.push(field.type);
        }
        entry.score += match.score * field.mult;
      }
    }

    // Fuzzy matching: only for brand names with score >= 0.5, not ambiguous terms
    for (const word of words) {
      if (word.length < 7) continue;
      for (const brand of trademarkDB.getAllBrands()) {
        const brandKey = brand.name.toLowerCase();
        // Skip if we already have hits for this brand
        if (brandScores.has(brandKey)) continue;
        // Only fuzzy-match brands with score >= 0.5
        if (trademarkDB.getBrandNameScore(brand.name) < 0.5) continue;

        // Skip fuzzy matching for common English word inflections (transforms ≠ Transformers)
        let skipFuzzy = false;
        for (const ending of INFLECTION_ENDINGS) {
          if (word.endsWith(ending) && word.length > ending.length + 4) {
            const root = word.slice(0, -ending.length);
            // If removing the suffix leaves a 5+ char root, it's likely a real English word
            if (root.length >= 5) { skipFuzzy = true; break; }
          }
        }
        if (skipFuzzy) continue;

        if (isFuzzyMatch(word, brand.name)) {
          if (!brandScores.has(brandKey)) {
            brandScores.set(brandKey, { brand, score: 0, terms: [], fields: [] });
          }
          const entry = brandScores.get(brandKey)!;
          entry.terms.push(word);
          if (!entry.fields.includes(field.type)) {
            entry.fields.push(field.type);
          }
          // Fuzzy matches get 0.7 score (less than exact brand match)
          entry.score += 0.7 * field.mult;
        }
      }
    }
  }

  // ---- Pass 2: Check for brand indicators in text ----
  const hasIndicator = [...BRAND_INDICATORS].some(ind => fullText.toLowerCase().includes(ind));

  // ---- Pass 3: Generate findings ----
  const findings: Finding[] = [];

  for (const [, entry] of brandScores) {
    let finalScore = entry.score;

    // Brand indicator boost
    if (hasIndicator && entry.score >= 0.3) {
      finalScore *= 1.3;
    }

    // Proximity bonus: if multiple terms from same brand, boost
    if (entry.terms.length >= 3) finalScore *= 1.3;
    else if (entry.terms.length >= 2) finalScore *= 1.15;

    if (finalScore >= FLAG_THRESHOLD) {
      findings.push({
        severity: 'red',
        title: `Trademark detected: "${entry.brand.name}"`,
        description: `Terms ${entry.terms.map(t => `"${t}"`).join(', ')} in your ${entry.fields.join('/')} match the brand "${entry.brand.name}" (${entry.brand.category}).`,
        fix: `Remove references to "${entry.brand.name}". Use generic descriptive terms instead.`,
      });
    } else if (finalScore >= WARNING_THRESHOLD) {
      findings.push({
        severity: 'yellow',
        title: `Possible "${entry.brand.name}" reference`,
        description: `Terms ${entry.terms.map(t => `"${t}"`).join(', ')} may reference "${entry.brand.name}". This is a low-confidence detection.`,
        fix: `Review these terms. If unrelated to "${entry.brand.name}", you can keep them.`,
      });
    }
    // Below WARNING_THRESHOLD: suppressed entirely
  }

  return findings;
}

// ---- Non-trademark checks (unchanged) ----

function checkProhibited(text: string): Finding[] {
  const matches = checkProhibitedItems(text);
  const findings: Finding[] = [];
  const seen = new Set<string>();

  const categoryLabels: Record<string, string> = {
    weapons: 'Weapons & Weapon Accessories',
    drugs: 'Drugs & Drug Paraphernalia',
    tobacco: 'Tobacco & Smoking Products',
    hazardous: 'Hazardous Materials',
    recalled: 'Recalled Products',
    humanRemains: 'Human Remains',
    liveAnimals: 'Live Animals',
    regulatedClaims: 'Regulated Health Claims',
    counterfeit: 'Counterfeit / Replica Goods',
  };

  for (const match of matches) {
    if (seen.has(match.keyword)) continue;
    seen.add(match.keyword);
    findings.push({
      severity: 'red',
      title: `Prohibited content: "${match.keyword}"`,
      description: `Your listing contains "${match.keyword}" which falls under Etsy's prohibited category: ${categoryLabels[match.category] || match.category}.`,
      fix: `Remove "${match.keyword}" from your listing. If your product is legitimate, use alternative phrasing.`,
    });
  }
  return findings;
}

function checkHandmadePolicy(text: string): Finding[] {
  const indicators = checkResellIndicators(text);
  if (indicators.length === 0) return [];
  return [{
    severity: 'yellow',
    title: 'Possible handmade policy concern',
    description: `Your listing contains terms suggesting reselling or mass production: ${indicators.map(i => `"${i}"`).join(', ')}.`,
    fix: 'Review these terms and remove or rephrase them if your product is handmade.',
  }];
}

function checkDigitalPolicy(tags: string[], description: string): Finding[] {
  const result = checkDigitalPolicyConflict(tags, description);
  if (!result.isDigital || !result.hasPhysicalClaims) return [];
  return [{
    severity: 'yellow',
    title: 'Digital vs. physical delivery conflict',
    description: `Your listing appears to be digital but mentions physical delivery: ${result.conflicts.map(c => `"${c}"`).join(', ')}.`,
    fix: 'Make sure your listing type matches your delivery method.',
  }];
}
