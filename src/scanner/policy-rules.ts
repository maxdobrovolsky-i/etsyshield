/**
 * Etsy policy rule definitions for handmade/originality and digital product checks.
 */

/** Keywords that suggest reselling or mass production */
export const resellIndicators: string[] = [
  'wholesale', 'bulk order', 'bulk discount', 'dropship', 'dropshipping',
  'aliexpress', 'alibaba', 'dhgate', 'wish.com', 'made in china',
  'factory direct', 'mass produced', 'mass production', 'oem',
  'white label', 'private label', 'resell', 'resale', 'reselling',
  'supplier', 'manufacturer direct', 'clearance stock', 'overstock',
  'liquidation', 'import direct',
];

/** Keywords indicating digital product */
export const digitalProductIndicators: string[] = [
  'digital download', 'instant download', 'printable', 'svg', 'png',
  'pdf download', 'digital file', 'digital art', 'clipart',
  'digital print', 'digital template', 'editable template',
  'canva template', 'digital planner', 'digital sticker',
];

/** Keywords indicating physical delivery (conflict with digital) */
export const physicalDeliveryIndicators: string[] = [
  'ships from', 'shipping time', 'delivery days', 'will be mailed',
  'shipped via', 'tracking number', 'physical item', 'tangible',
  'packaged in', 'ships within', 'business days delivery',
  'usps', 'fedex', 'ups shipping', 'free shipping',
];

/**
 * Check if listing has resell/mass-production indicators.
 */
export function checkResellIndicators(text: string): string[] {
  const lower = text.toLowerCase();
  return resellIndicators.filter(indicator => lower.includes(indicator));
}

/**
 * Check for digital product policy conflicts:
 * tags say "digital" but description promises physical delivery.
 */
export function checkDigitalPolicyConflict(
  tags: string[],
  description: string
): { isDigital: boolean; hasPhysicalClaims: boolean; conflicts: string[] } {
  const tagText = tags.join(' ').toLowerCase();
  const descLower = description.toLowerCase();

  const isDigital = digitalProductIndicators.some(
    ind => tagText.includes(ind) || descLower.includes(ind)
  );

  const physicalMatches = physicalDeliveryIndicators.filter(
    ind => descLower.includes(ind)
  );

  return {
    isDigital,
    hasPhysicalClaims: physicalMatches.length > 0,
    conflicts: isDigital ? physicalMatches : [],
  };
}
