/** Data extracted from an Etsy listing page */
export interface ListingData {
  title: string;
  tags: string[];
  description: string;
  category: string;
  price: string;
  imageCount: number;
}

/** Severity level for a finding */
export type Severity = 'red' | 'yellow' | 'green';

/** A single compliance or SEO finding */
export interface Finding {
  severity: Severity;
  title: string;
  description: string;
  fix: string;
}

/** Result of a compliance or SEO scan */
export interface ScanResult {
  score: number;
  findings: Finding[];
}

/** Brand term with distinctiveness score */
export interface BrandTerm {
  t: string;      // term text
  s: number;      // distinctiveness score 0.0-1.0
  a?: boolean;     // ambiguous (common English word)
}

/** Brand entry with safe phrases */
export interface BrandEntry {
  name: string;
  category: string;
  severity: 'red' | 'yellow';
  variants: string[];
  related: BrandTerm[];
  safe?: string[];   // safe phrases that clear false positives
}

/** Trademark database structure */
export interface TrademarkDatabase {
  version: string;
  brands: BrandEntry[];
}

/** Scan count tracking for free tier */
export interface ScanCount {
  count: number;
  monthYear: string;
}

/** Scan history entry */
export interface ScanHistoryEntry {
  id: string;
  timestamp: number;
  url: string;
  title: string;
  complianceScore: number;
  seoScore: number;
  complianceIssues: number;
  seoIssues: number;
}

/** Appeal letter request */
export interface AppealRequest {
  listingTitle: string;
  deactivationReason: string;
  sellerExplanation: string;
}

/** Messages between popup, content script, and service worker */
export type MessageAction =
  | { action: 'extractListing' }
  | { action: 'getScanCount' }
  | { action: 'incrementScan' }
  | { action: 'checkLimit' }
  | { action: 'saveScanHistory'; data: ScanHistoryEntry }
  | { action: 'getScanHistory' }
  | { action: 'clearScanHistory' }
  | { action: 'toggleDevMode' }
  | { action: 'getDevMode' };

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
