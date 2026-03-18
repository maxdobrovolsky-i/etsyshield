/**
 * Converts trademarks.json from old {t, r} format to new {t, s, a?} format.
 * Also adds safe phrases for problematic brands and sets low scores for
 * brand names that are common English words.
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'src', 'data', 'trademarks.json');
const OUTPUT = INPUT; // overwrite in place

const SAFE_PHRASES = {
  'Disney': ['frozen food', 'frozen yogurt', 'frozen pizza', 'frozen fruit', 'frozen lake', 'frozen drink', 'frozen dessert', 'frozen meal', 'frozen chicken', 'frozen fish'],
  'Pixar': ['cars for sale', 'toy cars', 'model cars', 'race cars', 'brave warrior', 'brave heart', 'brave enough', 'brave soldier'],
  'WALL-E': ['plant pot', 'plant holder', 'plant stand', 'plant hanger', 'plant care', 'house plant', 'plant lover'],
  'Marvel': ['iron on', 'cast iron', 'wrought iron', 'iron gate', 'iron press', 'flat iron', 'iron skillet', 'iron pan'],
  'Bluey': ['stripe pattern', 'stripe wallpaper', 'stripe fabric', 'stripe shirt', 'stripe design', 'pin stripe', 'candy stripe'],
  'Adele': [],
  'Pink Floyd': ['the wall art', 'the wall decor', 'on the wall', 'wall hanging', 'wall mount'],
  'Ed Sheeran': ['perfect gift', 'perfect for', 'perfect match', 'perfect fit', 'perfect size', 'perfect way'],
  'Miami Heat': ['heat press', 'heat transfer', 'heat resistant', 'heat seal', 'heat shrink'],
  'Pac-Man': ['cherry blossom', 'cherry wood', 'cherry red', 'cherry pick', 'cherry pie', 'cherry tree'],
};

const LOW_SCORE_BRANDS = {
  'up': 0.15, 'cars': 0.2, 'brave': 0.2, 'frozen': 0.25,
  'soul': 0.2, 'coco': 0.3, 'luca': 0.3, 'onward': 0.2,
  'bolt': 0.15, 'inside out': 0.2, 'turning red': 0.3,
  'risk': 0.1, 'dodge': 0.1, 'mustang': 0.2, 'explorer': 0.1,
  'eclipse': 0.15, 'spark': 0.1, 'flash': 0.15, 'rush': 0.1,
  'chrome': 0.15, 'edge': 0.1, 'ring': 0.15, 'halo': 0.2,
  'monopoly': 0.3, 'clue': 0.15, 'life': 0.1, 'sorry': 0.1,
};

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

let convertedTerms = 0;
let addedSafe = 0;

for (const brand of data.brands) {
  // Convert related terms from {t, r} to {t, s, a?}
  brand.related = brand.related.map(rel => {
    const newTerm = { t: rel.t };
    if (rel.r === 1) {
      newTerm.s = 1.0;
    } else if (rel.r === 2) {
      newTerm.s = 0.7;
    } else if (rel.r === 3) {
      newTerm.s = 0.3;
      newTerm.a = true;
    } else {
      // Fallback: treat unknown tiers as 0.5
      newTerm.s = 0.5;
    }
    convertedTerms++;
    return newTerm;
  });

  // Add safe phrases if applicable
  if (SAFE_PHRASES[brand.name]) {
    brand.safe = SAFE_PHRASES[brand.name];
    addedSafe++;
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`Converted ${convertedTerms} related terms across ${data.brands.length} brands`);
console.log(`Added safe phrases to ${addedSafe} brands`);
console.log(`Low-score brand names configured: ${Object.keys(LOW_SCORE_BRANDS).length}`);
console.log('Done. Wrote', OUTPUT);
