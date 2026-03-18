/** Keywords associated with Etsy's prohibited items and regulated claims */
export const prohibitedCategories = {
  weapons: [
    'gun', 'firearm', 'rifle', 'pistol', 'shotgun', 'ammunition', 'ammo',
    'silencer', 'suppressor', 'switchblade', 'brass knuckles', 'throwing star',
    'nunchucks', 'stun gun', 'taser', 'pepper spray', 'mace spray',
  ],
  drugs: [
    'marijuana', 'cannabis', 'weed', 'thc', 'cbd oil', 'magic mushroom',
    'psilocybin', 'lsd', 'mdma', 'ecstasy', 'cocaine', 'heroin', 'meth',
    'amphetamine', 'opium', 'kratom', 'drug paraphernalia', 'bong', 'pipe for smoking',
  ],
  tobacco: [
    'cigarette', 'cigar', 'tobacco', 'vape juice', 'e-liquid', 'nicotine liquid',
    'rolling papers', 'hookah tobacco',
  ],
  hazardous: [
    'hazardous material', 'toxic chemical', 'explosive', 'flammable liquid',
    'radioactive', 'asbestos', 'lead paint', 'mercury',
  ],
  recalled: [
    'recalled product', 'recalled item',
  ],
  humanRemains: [
    'human remains', 'human bones', 'human skull', 'human teeth', 'human hair extensions made from',
  ],
  liveAnimals: [
    'live animal', 'live insect', 'live reptile', 'live fish',
    'live bird', 'live mammal',
  ],
  regulatedClaims: [
    'fda approved', 'fda cleared', 'cures cancer', 'cures disease',
    'treats cancer', 'treats disease', 'medical grade', 'pharmaceutical grade',
    'clinically proven', 'doctor recommended', 'prescription strength',
    'heals wounds', 'cures anxiety', 'cures depression', 'treats adhd',
    'weight loss guaranteed', 'anti-aging miracle',
  ],
  counterfeit: [
    'replica', 'knockoff', 'counterfeit', 'fake designer',
    'imitation brand', 'aaa quality replica', 'mirror quality',
    'inspired by designer', '1:1 copy',
  ],
} as const;

/** Flat list of all prohibited keywords for quick scanning */
export const allProhibitedKeywords: string[] = Object.values(prohibitedCategories).flat();

/**
 * Check text against prohibited items.
 * Returns matched categories and specific keywords found.
 */
export function checkProhibitedItems(text: string): Array<{
  category: string;
  keyword: string;
}> {
  const lower = text.toLowerCase();
  const matches: Array<{ category: string; keyword: string }> = [];

  // Negation patterns that indicate the keyword is used in a safe context
  // e.g., "does not contain hazardous material", "no hazardous materials"
  const negationPatterns = [
    'no ', 'not ', 'non-', 'non ', 'free of ', 'free from ', 'without ',
    'does not ', "doesn't ", 'do not ', "don't ", 'never ', 'zero ',
    'absence of ', 'exempt from ', 'compliant', 'compliance',
  ];

  for (const [category, keywords] of Object.entries(prohibitedCategories)) {
    for (const keyword of keywords) {
      const kwLower = keyword.toLowerCase();
      const idx = lower.indexOf(kwLower);
      if (idx === -1) continue;

      // For short keywords (≤4 chars like "thc", "lsd", "cbd"), require word boundaries
      // to avoid matching substrings inside normal words
      if (kwLower.length <= 4) {
        const charBefore = idx > 0 ? lower[idx - 1] : ' ';
        const charAfter = idx + kwLower.length < lower.length ? lower[idx + kwLower.length] : ' ';
        const isWordBoundary = /[^a-z0-9]/.test(charBefore) && /[^a-z0-9]/.test(charAfter);
        if (!isWordBoundary) continue;
      }

      // Check if preceded by a negation (look at 30 chars before the match)
      const contextStart = Math.max(0, idx - 30);
      const beforeContext = lower.substring(contextStart, idx);
      const isNegated = negationPatterns.some(neg => beforeContext.includes(neg));

      if (!isNegated) {
        matches.push({ category, keyword });
      }
    }
  }

  return matches;
}
