import type { Finding, ListingData, ScanResult } from '../types/index';
import { tokenize, wordCount, uppercasePercentage, extractKeywords } from '../utils/text-utils';

/**
 * Run a full SEO analysis on an Etsy listing.
 * Checks: title optimization, tags usage, description quality.
 */
export function scanSEO(listing: ListingData): ScanResult {
  const findings: Finding[] = [];

  findings.push(...analyzeTitleSEO(listing.title));
  findings.push(...analyzeTagsSEO(listing.tags, listing.title));
  findings.push(...analyzeDescriptionSEO(listing.description, listing.title));

  const score = calculateSEOScore(findings);

  findings.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));

  return { score, findings };
}

function severityOrder(s: string): number {
  return s === 'red' ? 0 : s === 'yellow' ? 1 : 2;
}

function calculateSEOScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'red') score -= 15;
    if (f.severity === 'yellow') score -= 7;
  }
  return Math.max(0, Math.min(100, score));
}

/** Title SEO analysis */
function analyzeTitleSEO(title: string): Finding[] {
  const findings: Finding[] = [];
  const len = title.length;

  // Title length check
  if (len > 140) {
    findings.push({
      severity: 'red',
      title: `Title too long (${len}/140 characters)`,
      description: 'Your title exceeds Etsy\'s 140 character limit and will be truncated in search results.',
      fix: 'Shorten your title to 140 characters or less. Keep the most important keywords at the beginning.',
    });
  } else if (len < 60) {
    findings.push({
      severity: 'yellow',
      title: `Title is short (${len}/140 characters)`,
      description: 'Your title is under 60 characters. You\'re missing an opportunity to include more searchable keywords.',
      fix: 'Add more descriptive keywords to your title. Etsy allows up to 140 characters — use them to help buyers find you.',
    });
  } else if (len < 100) {
    findings.push({
      severity: 'yellow',
      title: `Title could be longer (${len}/140 characters)`,
      description: 'Good start, but consider using more of the 140 character limit for additional keywords.',
      fix: 'Try adding material, color, occasion, or recipient keywords to fill out your title.',
    });
  } else {
    findings.push({
      severity: 'green',
      title: `Good title length (${len}/140 characters)`,
      description: 'You\'re using the available space well for search visibility.',
      fix: 'Keep your title at this length and ensure your most important keyword is near the front.',
    });
  }

  // Keyword stuffing check
  const words = tokenize(title);
  const wordFreq = new Map<string, number>();
  for (const w of words) {
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
  }
  const stuffedWords = [...wordFreq.entries()].filter(([, count]) => count > 3);
  if (stuffedWords.length > 0) {
    findings.push({
      severity: 'yellow',
      title: 'Keyword stuffing detected in title',
      description: `The word(s) ${stuffedWords.map(([w, c]) => `"${w}" (${c}x)`).join(', ')} appear too many times. Repeating keywords hurts readability and may be penalized.`,
      fix: 'Use each keyword once. Replace repeated words with synonyms or related terms.',
    });
  }

  // Front-loading check
  if (title.length >= 40) {
    const first40 = title.substring(0, 40).toLowerCase();
    const titleKeywords = extractKeywords(title);
    if (titleKeywords.length > 0 && !first40.includes(titleKeywords[0])) {
      findings.push({
        severity: 'yellow',
        title: 'Primary keyword not front-loaded',
        description: 'Your most important keyword doesn\'t appear in the first 40 characters of your title. Etsy gives extra weight to the beginning of the title.',
        fix: `Move your primary keyword to the start of the title. The first few words matter most for Etsy search.`,
      });
    }
  }

  // Filler words at start
  const fillerStarts = ['beautiful', 'amazing', 'perfect', 'gorgeous', 'lovely', 'stunning', 'awesome', 'cute', 'pretty', 'wonderful', 'unique', 'special'];
  const firstWord = words[0]?.toLowerCase() || '';
  if (fillerStarts.includes(firstWord)) {
    findings.push({
      severity: 'yellow',
      title: 'Title starts with a filler adjective',
      description: `Your title starts with "${words[0]}". Buyers search for "gold earrings" not "beautiful earrings".`,
      fix: `Start with what the product IS (material, type, purpose), then add descriptive words later.`,
    });
  }

  // ALL CAPS check
  const capsPercentage = uppercasePercentage(title);
  if (capsPercentage > 30) {
    findings.push({
      severity: 'yellow',
      title: 'Excessive uppercase in title',
      description: `${Math.round(capsPercentage)}% of your title is in uppercase. This looks like shouting and may reduce trust.`,
      fix: 'Use title case or sentence case. Only capitalize proper nouns and the first letter of major words.',
    });
  }

  return findings;
}

/** Tags SEO analysis */
function analyzeTagsSEO(tags: string[], title: string): Finding[] {
  const findings: Finding[] = [];

  // Tag count
  if (tags.length === 0) {
    findings.push({
      severity: 'yellow',
      title: 'Tags not available',
      description: 'Etsy does not show tags publicly on listing pages. Tags can only be analyzed when you view your own listing in the Listing Editor, or when you paste them manually.',
      fix: 'To analyze your tags, use the Manual Scan feature: click EtsyShield on any non-Etsy page and paste your tags in the Tags field.',
    });
    return findings;
  }

  if (tags.length < 13) {
    findings.push({
      severity: 'yellow',
      title: `Only ${tags.length}/13 tags used`,
      description: `You\'re using ${tags.length} out of 13 available tags. Each unused tag is a missed search opportunity.`,
      fix: `Add ${13 - tags.length} more tags. Think about how buyers search: materials, occasions, recipients, styles, colors.`,
    });
  } else {
    findings.push({
      severity: 'green',
      title: 'All 13 tag slots filled',
      description: 'You\'re using all available tag slots for maximum search visibility.',
      fix: 'Keep all 13 tags filled. Review periodically to ensure they match current search trends.',
    });
  }

  // Single-word tags
  const singleWordTags = tags.filter(t => !t.includes(' ') && t.trim().length > 0);
  if (singleWordTags.length > 0) {
    findings.push({
      severity: 'yellow',
      title: `${singleWordTags.length} single-word tag(s) found`,
      description: `Tags ${singleWordTags.map(t => `"${t}"`).join(', ')} are single words. Multi-word phrases match more specific searches and face less competition.`,
      fix: 'Convert single-word tags to multi-word phrases. Example: "earrings" → "gold hoop earrings" or "earrings for women".',
    });
  }

  // Duplicate tags
  const lowerTags = tags.map(t => t.toLowerCase().trim());
  const duplicates = lowerTags.filter((t, i) => lowerTags.indexOf(t) !== i);
  const uniqueDuplicates = [...new Set(duplicates)];
  if (uniqueDuplicates.length > 0) {
    findings.push({
      severity: 'red',
      title: `Duplicate tag(s) found`,
      description: `The tag(s) ${uniqueDuplicates.map(t => `"${t}"`).join(', ')} appear more than once. Duplicate tags waste valuable tag slots.`,
      fix: 'Remove duplicate tags and replace them with new, unique keywords that describe different aspects of your product.',
    });
  }

  // Redundant overlap (one tag is substring of another)
  const redundant: string[] = [];
  for (let i = 0; i < lowerTags.length; i++) {
    for (let j = 0; j < lowerTags.length; j++) {
      if (i !== j && lowerTags[j].includes(lowerTags[i]) && lowerTags[i] !== lowerTags[j]) {
        if (!redundant.includes(lowerTags[i])) {
          redundant.push(lowerTags[i]);
        }
      }
    }
  }
  if (redundant.length > 0) {
    findings.push({
      severity: 'yellow',
      title: `${redundant.length} redundant tag(s)`,
      description: `Tag(s) ${redundant.map(t => `"${t}"`).join(', ')} are substrings of other tags. This reduces keyword diversity.`,
      fix: 'Use more diverse keywords instead of overlapping phrases. Each tag should target a different search query.',
    });
  }

  // Title-tag overlap check
  const titleKeywords = extractKeywords(title);
  const tagKeywords = new Set(lowerTags.flatMap(t => tokenize(t)));
  const overlapping = titleKeywords.filter(kw => tagKeywords.has(kw));
  if (titleKeywords.length > 0 && overlapping.length === 0) {
    findings.push({
      severity: 'yellow',
      title: 'Tags don\'t reinforce title keywords',
      description: 'None of your tags contain keywords from your title. Using title keywords in tags reinforces their importance to Etsy\'s search algorithm.',
      fix: 'Include your main title keywords as tags too. This signals to Etsy that these terms are important for your listing.',
    });
  } else if (overlapping.length > 0) {
    findings.push({
      severity: 'green',
      title: 'Tags reinforce title keywords',
      description: `${overlapping.length} of your title keywords also appear in your tags, reinforcing search relevance.`,
      fix: 'Continue aligning your tags with your title keywords for the best search performance.',
    });
  }

  return findings;
}

/** Description SEO analysis */
function analyzeDescriptionSEO(description: string, title: string): Finding[] {
  const findings: Finding[] = [];
  const wc = wordCount(description);

  // Description length
  if (wc < 100) {
    findings.push({
      severity: 'red',
      title: `Very short description (${wc} words)`,
      description: 'Your description is under 100 words. Short descriptions provide less text for Etsy\'s search algorithm to index.',
      fix: 'Aim for 300+ words. Describe materials, dimensions, care instructions, shipping info, and how the product can be used.',
    });
  } else if (wc < 300) {
    findings.push({
      severity: 'yellow',
      title: `Description could be longer (${wc} words)`,
      description: 'Good, but longer descriptions (300+ words) tend to perform better in Etsy search.',
      fix: 'Add more details: materials, process, dimensions, care instructions, occasion ideas, gift suggestions.',
    });
  } else {
    findings.push({
      severity: 'green',
      title: `Solid description length (${wc} words)`,
      description: 'Your description has enough content for Etsy\'s search algorithm to work with.',
      fix: 'Keep your description detailed and keyword-rich.',
    });
  }

  // Keyword presence in description
  if (description.trim().length > 0) {
    const titleKeywords = extractKeywords(title);
    const descLower = description.toLowerCase();
    const missingKeywords = titleKeywords.filter(kw => !descLower.includes(kw));

    if (missingKeywords.length > 0 && titleKeywords.length > 0) {
      const missing = missingKeywords.slice(0, 5);
      findings.push({
        severity: 'yellow',
        title: 'Title keywords missing from description',
        description: `Keywords ${missing.map(k => `"${k}"`).join(', ')} from your title don't appear in your description.`,
        fix: 'Include your main keywords naturally in your description, especially in the first paragraph. Etsy indexes descriptions for search.',
      });
    } else if (titleKeywords.length > 0) {
      findings.push({
        severity: 'green',
        title: 'Keywords present in description',
        description: 'Your title keywords appear in your description, reinforcing search relevance.',
        fix: 'Keep integrating keywords naturally into your description.',
      });
    }

    // First paragraph keyword check
    if (description.length >= 160) {
      const first160 = description.substring(0, 160).toLowerCase();
      const primaryKeyword = titleKeywords[0];
      if (primaryKeyword && !first160.includes(primaryKeyword)) {
        findings.push({
          severity: 'yellow',
          title: 'Primary keyword not in first paragraph',
          description: 'Etsy may use the first part of your description as a search snippet. Including your primary keyword here improves visibility.',
          fix: `Include "${primaryKeyword}" naturally in your first sentence or paragraph.`,
        });
      }
    }
  }

  return findings;
}
