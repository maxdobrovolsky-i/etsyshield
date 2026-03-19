import type { ListingData } from '../types/index';

/**
 * Content script that extracts listing data from Etsy listing pages.
 * Uses multiple selector strategies with fallbacks for resilience.
 */

/** Wait for an element to appear in the DOM (for SPA navigation) */
function waitForElement(selectors: string[], timeoutMs = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    // Check if already present
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return resolve(el);
    }

    const observer = new MutationObserver(() => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          observer.disconnect();
          return resolve(el);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}

/** Extract listing title using multiple strategies */
function extractTitle(): string {
  // Strategy 1: Etsy's buy box title attribute
  const buyBoxTitle = document.querySelector('h1[data-buy-box-listing-title]');
  if (buyBoxTitle?.textContent?.trim()) {
    return buyBoxTitle.textContent.trim();
  }

  // Strategy 2: Any h1 within the listing content
  const h1Elements = document.querySelectorAll('h1');
  for (const h1 of h1Elements) {
    const text = h1.textContent?.trim();
    if (text && text.length > 5 && text.length <= 200) {
      return text;
    }
  }

  // Strategy 3: Open Graph meta tag
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const content = ogTitle.getAttribute('content')?.trim();
    if (content) return content;
  }

  // Strategy 4: Page title (often includes " - Etsy" suffix)
  const pageTitle = document.title;
  if (pageTitle) {
    return pageTitle.replace(/\s*[-|]\s*Etsy.*$/i, '').trim();
  }

  return '';
}

/** Extract tags from the page's embedded data */
function extractTags(): string[] {
  // Strategy 1: Look for __INITIAL_STATE__ or similar JSON in script tags
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const text = script.textContent || '';

    // Look for tags array in the page state
    try {
      // Etsy sometimes embeds listing data in JSON-LD
      if (script.type === 'application/ld+json') {
        const ld = JSON.parse(text);
        if (ld.keywords) {
          const tags = typeof ld.keywords === 'string'
            ? ld.keywords.split(',').map((t: string) => t.trim())
            : Array.isArray(ld.keywords) ? ld.keywords : [];
          if (tags.length > 0) return tags.slice(0, 13);
        }
      }
    } catch { /* ignore parse errors */ }

    // Look for tags in embedded state
    try {
      const tagsMatch = text.match(/"tags"\s*:\s*\[([^\]]+)\]/);
      if (tagsMatch) {
        const tagsStr = `[${tagsMatch[1]}]`;
        const tags = JSON.parse(tagsStr) as string[];
        if (tags.length > 0 && tags.every(t => typeof t === 'string')) {
          return tags.slice(0, 13);
        }
      }
    } catch { /* ignore */ }
  }

  // Strategy 2: Check if on listing editor page
  const tagInputs = document.querySelectorAll('[data-tag-input] .tag, .wt-tag, .tag-label');
  if (tagInputs.length > 0) {
    return [...tagInputs]
      .map(el => el.textContent?.trim() || '')
      .filter(t => t.length > 0);
  }

  // Strategy 3: Look for tag-like elements in the listing page
  const tagElements = document.querySelectorAll('a[href*="/search?q="]');
  const potentialTags: string[] = [];
  for (const el of tagElements) {
    const text = el.textContent?.trim();
    if (text && text.length > 1 && text.length < 50 && !text.includes('\n')) {
      potentialTags.push(text);
    }
  }
  if (potentialTags.length >= 3) {
    return potentialTags.slice(0, 13);
  }

  return [];
}

/** Extract listing description */
function extractDescription(): string {
  // Strategy 1: Product details content toggle
  const detailsSelectors = [
    '#wt-content-toggle-product-details-content',
    '[data-id="description-text"]',
    '[data-product-details-content-toggle]',
    '.wt-text-body-01',
  ];

  for (const sel of detailsSelectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim() && el.textContent.trim().length > 20) {
      return el.textContent.trim();
    }
  }

  // Strategy 2: Look for the item description section
  const sections = document.querySelectorAll('div, section, p');
  let bestCandidate = '';
  for (const el of sections) {
    const text = el.textContent?.trim() || '';
    // Find the largest text block that's likely the description
    if (text.length > bestCandidate.length && text.length > 100 && text.length < 10000) {
      const parent = el.parentElement;
      const isInDescription = parent?.className?.includes('description') ||
        parent?.className?.includes('details') ||
        el.className?.includes('description') ||
        el.className?.includes('details');
      if (isInDescription) {
        bestCandidate = text;
      }
    }
  }
  if (bestCandidate) return bestCandidate;

  // Strategy 3: Open Graph description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) {
    const content = ogDesc.getAttribute('content')?.trim();
    if (content) return content;
  }

  // Strategy 4: Meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    const content = metaDesc.getAttribute('content')?.trim();
    if (content) return content;
  }

  return '';
}

/** Extract additional listing metadata */
function extractMetadata(): Pick<ListingData, 'category' | 'price' | 'imageCount'> {
  // Category
  let category = '';
  const breadcrumbs = document.querySelectorAll('nav a, .wt-breadcrumb a, [data-breadcrumb] a');
  if (breadcrumbs.length > 0) {
    const last = breadcrumbs[breadcrumbs.length - 1];
    category = last.textContent?.trim() || '';
  }

  // Price
  let price = '';
  const priceEl = document.querySelector('[data-buy-box-listing-price], .wt-text-title-03, [data-appears-component-name="price"]');
  if (priceEl) {
    price = priceEl.textContent?.trim() || '';
  }

  // Image count
  const images = document.querySelectorAll('[data-listing-images] img, .listing-page-image-carousel img, .carousel-image');
  const imageCount = images.length || 0;

  return { category, price, imageCount };
}

/** Main extraction function — returns all listing data */
async function extractListing(): Promise<ListingData> {
  // Wait for page content to load
  await waitForElement(['h1[data-buy-box-listing-title]', 'h1'], 3000);

  const title = extractTitle();
  const tags = extractTags();
  const description = extractDescription();
  const { category, price, imageCount } = extractMetadata();

  return { title, tags, description, category, price, imageCount };
}

/** Extract listing URLs from an Etsy shop page */
function extractShopListings(): Array<{ url: string; title: string }> {
  const links = document.querySelectorAll('a[href*="/listing/"]');
  const seen = new Set<string>();
  const results: Array<{ url: string; title: string }> = [];

  for (const link of links) {
    const href = (link as HTMLAnchorElement).href;
    if (!href) continue;

    // Extract listing ID for deduplication
    const idMatch = href.match(/\/listing\/(\d+)/);
    if (!idMatch) continue;
    const listingId = idMatch[1];
    if (seen.has(listingId)) continue;
    seen.add(listingId);

    // Normalize URL — strip query params and fragments
    const url = href.split('?')[0].split('#')[0];

    // Try to get title from link text, image alt text, or aria-label
    let title = (link as HTMLElement).textContent?.trim() || '';
    if (!title || title.length < 3) {
      const img = link.querySelector('img');
      title = img?.getAttribute('alt')?.trim() || '';
    }
    if (!title || title.length < 3) {
      title = (link as HTMLElement).getAttribute('aria-label')?.trim() || '';
    }
    if (!title) {
      title = `Listing ${listingId}`;
    }

    results.push({ url, title });

    // Limit to 100 listings
    if (results.length >= 100) break;
  }

  return results;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'extractListing') {
    extractListing()
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: String(err) }));
    return true; // Keep the message channel open for async response
  }

  if (message.action === 'extractShopListings') {
    try {
      const listings = extractShopListings();
      sendResponse({ success: true, data: listings });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }
});
