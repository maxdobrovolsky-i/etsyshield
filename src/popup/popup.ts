import { scanCompliance } from '../scanner/compliance-scanner';
import { scanSEO } from '../scanner/seo-scanner';
import { animateScore, getScoreColor, getScoreVerdict } from './components/ScoreBar';
import { renderComplianceTab, getComplianceBadge } from './components/ComplianceTab';
import { renderSEOTab, getSEOBadge } from './components/SEOTab';
import type { ListingData, ScanResult } from '../types/index';

/* -------------------------------------------------- */
/*  DOM references                                    */
/* -------------------------------------------------- */

const $loading = document.getElementById('loading-state')!;
const $main = document.getElementById('main-content')!;
const $notEtsy = document.getElementById('not-etsy-state')!;
const $error = document.getElementById('error-state')!;
const $errorMsg = document.getElementById('error-message')!;
const $limitOverlay = document.getElementById('limit-overlay')!;
const $footer = document.getElementById('footer')!;
const $listingTitle = document.getElementById('listing-title')!;

// Score circles
const $complianceCircle = document.getElementById('compliance-circle') as unknown as SVGCircleElement;
const $complianceScore = document.getElementById('compliance-score')!;
const $seoCircle = document.getElementById('seo-circle') as unknown as SVGCircleElement;
const $seoScore = document.getElementById('seo-score')!;

// Tabs
const $tabCompliance = document.getElementById('tab-compliance')!;
const $tabSEO = document.getElementById('tab-seo')!;
const $badgeCompliance = document.getElementById('badge-compliance')!;
const $badgeSEO = document.getElementById('badge-seo')!;
const $findingsCompliance = document.getElementById('findings-compliance')!;
const $findingsSEO = document.getElementById('findings-seo')!;

// Footer
const $scansUsed = document.getElementById('scans-used')!;
const $scansLimit = document.getElementById('scans-limit')!;

// Phase 2 elements
const $devBadge = document.getElementById('dev-badge');
const $historySection = document.getElementById('history-section');
const $historyList = document.getElementById('history-list');
const $historyEmpty = document.getElementById('history-empty');
const $appealSection = document.getElementById('appeal-section');
const $appealResult = document.getElementById('appeal-result');
const $appealOutput = document.getElementById('appeal-output') as HTMLTextAreaElement | null;

// Bulk scan elements
const $bulkSection = document.getElementById('bulk-section');

// AI tools / toolbar
const $toolbar = document.getElementById('toolbar');
const $aiResultsSection = document.getElementById('ai-results-section');

/* -------------------------------------------------- */
/*  State helpers                                     */
/* -------------------------------------------------- */

function hideAll(): void {
  $loading.classList.remove('visible');
  $main.style.display = 'none';
  $notEtsy.classList.remove('visible');
  $error.classList.remove('visible');
  $limitOverlay.classList.remove('visible');
  $footer.style.display = 'none';
  $bulkSection?.classList.remove('active');
  $aiResultsSection?.classList.remove('active');
  $historySection?.classList.remove('active');
  $appealSection?.classList.remove('active');
  $policySection?.classList.remove('active');
}

function showLoading(): void {
  hideAll();
  $loading.classList.add('visible');
}

function showMain(): void {
  hideAll();
  $main.style.display = '';
  $footer.style.display = '';
}

function showNotEtsy(): void {
  hideAll();
  $notEtsy.classList.add('visible');
}

function showError(message?: string): void {
  hideAll();
  if (message) $errorMsg.textContent = message;
  $error.classList.add('visible');
}

function showLimitReached(): void {
  hideAll();
  $limitOverlay.classList.add('visible');
}

/* -------------------------------------------------- */
/*  Tab switching                                     */
/* -------------------------------------------------- */

function activateTab(tab: 'compliance' | 'seo'): void {
  if (tab === 'compliance') {
    $tabCompliance.classList.add('active');
    $tabSEO.classList.remove('active');
    $findingsCompliance.classList.remove('hidden');
    $findingsSEO.classList.add('hidden');
  } else {
    $tabSEO.classList.add('active');
    $tabCompliance.classList.remove('active');
    $findingsSEO.classList.remove('hidden');
    $findingsCompliance.classList.add('hidden');
  }
}

$tabCompliance.addEventListener('click', () => activateTab('compliance'));
$tabSEO.addEventListener('click', () => activateTab('seo'));

/* -------------------------------------------------- */
/*  Scan Another Listing                              */
/* -------------------------------------------------- */

document.getElementById('scan-another-btn')?.addEventListener('click', () => {
  $main.style.display = 'none';
  if ($toolbar) $toolbar.style.display = 'none';
  $notEtsy.classList.add('visible');
  $footer.style.display = '';
  // Show back button
  const backBtn = document.getElementById('back-to-results-btn');
  if (backBtn) backBtn.style.display = '';
});

// Back to results from manual scan view
document.getElementById('back-to-results-btn')?.addEventListener('click', () => {
  $notEtsy.classList.remove('visible');
  $main.style.display = '';
  if ($toolbar) $toolbar.style.display = '';
});

/* -------------------------------------------------- */
/*  Service worker messaging                          */
/* -------------------------------------------------- */

async function sendMessage<T = unknown>(
  action: string,
  data?: unknown,
): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, data }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response ?? { success: false, error: 'No response' });
      }
    });
  });
}

/* -------------------------------------------------- */
/*  Render scan results                               */
/* -------------------------------------------------- */

// Store results for copy function
let lastComplianceResult: ScanResult | null = null;
let lastSEOResult: ScanResult | null = null;

async function renderResults(
  complianceResult: ScanResult,
  seoResult: ScanResult,
): Promise<void> {
  lastComplianceResult = complianceResult;
  lastSEOResult = seoResult;

  // Animate score circles
  animateScore($complianceCircle, $complianceScore, complianceResult.score);
  animateScore($seoCircle, $seoScore, seoResult.score);

  // Render findings into containers
  renderComplianceTab($findingsCompliance, complianceResult);
  renderSEOTab($findingsSEO, seoResult, (aiFixType) => {
    if (aiFixType) runAiTool(aiFixType, `ai-${aiFixType.replace('-', '-')}-btn`);
  });

  // Badge counts
  const complianceBadge = getComplianceBadge(complianceResult);
  const seoBadge = getSEOBadge(seoResult);
  $badgeCompliance.textContent = String(complianceBadge);
  $badgeSEO.textContent = String(seoBadge);

  // Default to compliance tab
  activateTab('compliance');

  showMain();

  // Show scan timestamp
  const scanTimeEl = document.getElementById('scan-time');
  if (scanTimeEl) {
    const now = new Date();
    scanTimeEl.textContent = `Scanned ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Update score verdicts
  const compVerdict = document.getElementById('compliance-verdict');
  const seoVerdict = document.getElementById('seo-verdict');
  if (compVerdict) compVerdict.textContent = getScoreVerdict(complianceResult.score);
  if (seoVerdict) seoVerdict.textContent = getScoreVerdict(seoResult.score);

  // Show toolbar with AI tools for Pro/Dev users
  if ($toolbar) {
    $toolbar.style.display = '';
    const aiLimit = await getAiDailyLimit();
    const showAi = aiLimit > AI_DAILY_FREE;
    document.getElementById('ai-rewrite-title-btn')!.style.display = showAi ? '' : 'none';
    document.getElementById('ai-generate-tags-btn')!.style.display = showAi ? '' : 'none';
    document.getElementById('ai-improve-desc-btn')!.style.display = showAi ? '' : 'none';
  }
}

/* -------------------------------------------------- */
/*  Update footer scan count                          */
/* -------------------------------------------------- */

async function updateScanCount(): Promise<void> {
  const resp = await sendMessage<{ allowed: boolean; remaining: number; count: number; limit: number }>('checkLimit');
  if (resp.success && resp.data) {
    const { count, limit } = resp.data;
    const isPro = !limit || limit > 9000;
    if (isPro) {
      $scansUsed.textContent = 'Pro';
      $scansLimit.textContent = '\u221E';
      document.getElementById('footer-upgrade-btn')?.setAttribute('style', 'display:none');
      // Show Manage Subscription in action sheet
      const manageSub = document.getElementById('sheet-manage-sub');
      if (manageSub) manageSub.style.display = '';
    } else {
      $scansUsed.textContent = String(count);
      $scansLimit.textContent = String(limit);
      document.getElementById('footer-upgrade-btn')?.removeAttribute('style');
    }
  }
}

/* -------------------------------------------------- */
/*  Manual scan handler                               */
/* -------------------------------------------------- */

function buildListingFromManualInput(
  titleEl: HTMLTextAreaElement,
  tagsEl: HTMLTextAreaElement,
  descEl: HTMLTextAreaElement,
): ListingData {
  const title = titleEl.value.trim();
  const tagsRaw = tagsEl.value.trim();
  const description = descEl.value.trim();
  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return {
    title,
    tags,
    description,
    category: '',
    price: '',
    imageCount: 0,
  };
}

async function handleManualScan(
  titleEl: HTMLTextAreaElement,
  tagsEl: HTMLTextAreaElement,
  descEl: HTMLTextAreaElement,
  btn: HTMLButtonElement,
): Promise<void> {
  const listing = buildListingFromManualInput(titleEl, tagsEl, descEl);

  if (!listing.title && !listing.description) {
    return; // nothing to scan
  }

  btn.disabled = true;
  btn.textContent = 'Scanning...';

  try {
    // Increment scan count
    await sendMessage('incrementScan');

    const complianceResult = scanCompliance(listing);
    const seoResult = scanSEO(listing);

    $listingTitle.textContent = listing.title || 'Manual scan';
    await renderResults(complianceResult, seoResult);
    await saveScanToHistory('', listing.title || 'Manual scan', complianceResult, seoResult);
    await updateScanCount();
  } catch (err) {
    showError('Scan failed. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Scan Listing';
  }
}

// Wire up manual scan buttons (there are two: one in not-etsy state, one in error state)
function setupManualScanButton(
  btnId: string,
  titleId: string,
  tagsId: string,
  descId: string,
): void {
  const btn = document.getElementById(btnId) as HTMLButtonElement | null;
  const titleEl = document.getElementById(titleId) as HTMLTextAreaElement | null;
  const tagsEl = document.getElementById(tagsId) as HTMLTextAreaElement | null;
  const descEl = document.getElementById(descId) as HTMLTextAreaElement | null;

  if (btn && titleEl && tagsEl && descEl) {
    btn.addEventListener('click', () =>
      handleManualScan(titleEl, tagsEl, descEl, btn),
    );
  }
}

/* -------------------------------------------------- */
/*  Copy All handler                                  */
/* -------------------------------------------------- */

function buildCopyText(): string {
  const lines: string[] = [];
  const title = $listingTitle.textContent || '';
  lines.push(`=== EtsyShield Scan Results ===`);
  lines.push(`Listing: ${title}`);
  lines.push('');

  if (lastComplianceResult) {
    lines.push(`COMPLIANCE SCORE: ${lastComplianceResult.score}/100`);
    lines.push(`Issues: ${lastComplianceResult.findings.filter(f => f.severity !== 'green').length}`);
    lines.push('---');
    for (const f of lastComplianceResult.findings) {
      const icon = f.severity === 'red' ? '[RED]' : f.severity === 'yellow' ? '[YELLOW]' : '[GREEN]';
      lines.push(`${icon} ${f.title}`);
      lines.push(`  ${f.description}`);
      lines.push(`  Fix: ${f.fix}`);
      lines.push('');
    }
  }

  lines.push('');

  if (lastSEOResult) {
    lines.push(`SEO SCORE: ${lastSEOResult.score}/100`);
    lines.push(`Issues: ${lastSEOResult.findings.filter(f => f.severity !== 'green').length}`);
    lines.push('---');
    for (const f of lastSEOResult.findings) {
      const icon = f.severity === 'red' ? '[RED]' : f.severity === 'yellow' ? '[YELLOW]' : '[GREEN]';
      lines.push(`${icon} ${f.title}`);
      lines.push(`  ${f.description}`);
      lines.push(`  Fix: ${f.fix}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

document.getElementById('copy-all-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('copy-all-btn')!;
  const text = buildCopyText();
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy All';
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy All';
      btn.classList.remove('copied');
    }, 2000);
  }
});

/* -------------------------------------------------- */
/*  Dev Mode toggle                                   */
/* -------------------------------------------------- */

// Dev mode removed for production.
// To test as Pro: chrome.storage.sync.set({proLicense: 'test'})
// To revert: chrome.storage.sync.remove('proLicense')

/* -------------------------------------------------- */
/*  Scan History                                      */
/* -------------------------------------------------- */

function scoreColorClass(score: number): string {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

async function saveScanToHistory(
  url: string,
  title: string,
  complianceResult: ScanResult,
  seoResult: ScanResult,
): Promise<void> {
  // Deduplicate — check stored history, update existing entry instead of adding new
  if (url) {
    const histResp = await sendMessage<Array<{ id: string; url: string }>>('getScanHistory');
    const existing = (histResp.data || []).find(h => h.url === url);
    if (existing) return; // Already scanned this URL
  }

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    url,
    title: title.slice(0, 80),
    complianceScore: complianceResult.score,
    seoScore: seoResult.score,
    complianceIssues: complianceResult.findings.filter(f => f.severity !== 'green').length,
    seoIssues: seoResult.findings.filter(f => f.severity !== 'green').length,
  };
  await sendMessage('saveScanHistory', entry);
}

async function renderHistory(): Promise<void> {
  if (!$historyList || !$historyEmpty) return;
  const resp = await sendMessage<Array<{
    id: string; timestamp: number; url: string; title: string;
    complianceScore: number; seoScore: number;
    complianceIssues: number; seoIssues: number;
  }>>('getScanHistory');

  const entries = resp.data || [];
  $historyList.innerHTML = '';

  if (entries.length === 0) {
    $historyEmpty.style.display = '';
    $historyList.style.display = 'none';
    return;
  }

  $historyEmpty.style.display = 'none';
  $historyList.style.display = '';

  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = 'history-item';

    const scores = document.createElement('div');
    scores.className = 'history-item-scores';

    const cScore = document.createElement('span');
    cScore.className = `history-score ${scoreColorClass(entry.complianceScore)}`;
    cScore.textContent = String(entry.complianceScore);
    cScore.title = 'Compliance';

    const sScore = document.createElement('span');
    sScore.className = `history-score ${scoreColorClass(entry.seoScore)}`;
    sScore.textContent = String(entry.seoScore);
    sScore.title = 'SEO';

    scores.appendChild(cScore);
    scores.appendChild(sScore);

    const info = document.createElement('div');
    info.className = 'history-item-info';

    const title = document.createElement('div');
    title.className = 'history-item-title';
    title.textContent = entry.title;

    const date = document.createElement('div');
    date.className = 'history-item-date';
    const d = new Date(entry.timestamp);
    date.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    info.appendChild(title);
    info.appendChild(date);

    item.appendChild(scores);
    item.appendChild(info);

    if (entry.url) {
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: entry.url });
      });
    }

    $historyList.appendChild(item);
  }
}

// Action sheet
const $actionOverlay = document.getElementById('action-sheet-overlay');

function openActionSheet(): void {
  $actionOverlay?.classList.add('open');
}

function closeActionSheet(): void {
  $actionOverlay?.classList.remove('open');
}

document.getElementById('more-btn')?.addEventListener('click', openActionSheet);
$actionOverlay?.addEventListener('click', (e) => {
  if (e.target === $actionOverlay) closeActionSheet();
});

// Action sheet item handlers
document.getElementById('sheet-history')?.addEventListener('click', async () => {
  closeActionSheet();
  $main.style.display = 'none';
  $historySection?.classList.add('active');
  await renderHistory();
});

document.getElementById('sheet-appeal')?.addEventListener('click', async () => {
  closeActionSheet();
  $main.style.display = 'none';
  $appealSection?.classList.add('active');
  await updateAiUsageDisplay();
});

document.getElementById('sheet-bulk')?.addEventListener('click', () => {
  closeActionSheet();
  launchBulkScan();
});

document.getElementById('sheet-alerts')?.addEventListener('click', async () => {
  closeActionSheet();
  $main.style.display = 'none';
  $policySection?.classList.add('active');
  await renderPolicyUpdates();
});

// Manage Subscription — opens ExtensionPay management page
document.getElementById('sheet-manage-sub')?.addEventListener('click', () => {
  closeActionSheet();
  sendMessage('openPayment');
});

// History back button
document.getElementById('history-back-btn')?.addEventListener('click', () => {
  $historySection?.classList.remove('active');
  $main.style.display = '';
});

// Clear history
document.getElementById('history-clear-btn')?.addEventListener('click', async () => {
  await sendMessage('clearScanHistory');
  await renderHistory();
});

/* -------------------------------------------------- */
/*  Appeal Letter Generator (AI-powered)              */
/* -------------------------------------------------- */

const AI_DAILY_FREE = 0;   // Free users: template only, no API cost
const AI_DAILY_PRO = 50;   // Pro/Dev users: 50 AI generations per day (~$3/mo max, 70% margin)

/** Cloudflare Worker proxy URL — API key is stored server-side as a secret */
const AI_PROXY_URL = 'https://etsyshield-api.max-dobrikf.workers.dev';

interface AiUsage { count: number; date: string }

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getAiUsage(): Promise<AiUsage> {
  const result = await chrome.storage.local.get('aiUsage');
  const usage = result.aiUsage as AiUsage | undefined;
  if (!usage || usage.date !== todayStr()) {
    return { count: 0, date: todayStr() };
  }
  return usage;
}

async function incrementAiUsage(): Promise<AiUsage> {
  const usage = await getAiUsage();
  usage.count += 1;
  await chrome.storage.local.set({ aiUsage: usage });
  return usage;
}

async function getAiDailyLimit(): Promise<number> {
  // Check via service worker (ExtensionPay)
  const resp = await sendMessage<{ paid: boolean }>('checkProStatus');
  if (resp.success && resp.data?.paid) return AI_DAILY_PRO;
  // Fallback: manual proLicense for testing
  const syncData = await chrome.storage.sync.get('proLicense');
  if (syncData.proLicense) return AI_DAILY_PRO;
  return AI_DAILY_FREE;
}

async function updateAiUsageDisplay(): Promise<void> {
  const bar = document.getElementById('ai-usage-bar');
  const text = document.getElementById('ai-usage-text');
  if (!bar || !text) return;
  const limit = await getAiDailyLimit();
  if (limit <= AI_DAILY_FREE) {
    text.textContent = 'AI generation is a Pro feature. Use Template is free.';
    bar.classList.add('exhausted');
  } else {
    const usage = await getAiUsage();
    const remaining = Math.max(0, limit - usage.count);
    text.textContent = `AI uses today: ${usage.count}/${limit} (${remaining} remaining)`;
    bar.classList.toggle('exhausted', remaining === 0);
  }
}

async function generateAppealWithAI(
  listingTitle: string,
  reason: string,
  explanation: string,
): Promise<string> {
  const prompt = `You are an expert at writing Etsy listing appeal letters. Write a professional, polite appeal letter to Etsy's Trust & Safety team.

The seller's listing was deactivated:
- Listing title: "${listingTitle}"
- Etsy's stated reason: "${reason || 'Not specified'}"
- Seller's notes: "${explanation || 'No additional notes provided'}"

Write a compelling appeal letter that:
1. Is professional and respectful
2. Addresses the specific reason for deactivation
3. Explains why the listing complies with Etsy's policies
4. Requests reinstatement
5. Offers to make adjustments if needed

Write ONLY the letter text, ready to copy-paste. Start with "Dear Etsy Trust & Safety Team," and end with "[Your Name] / [Your Shop Name]".
Do NOT use markdown formatting. No **, ##, or other markup. Write plain text only.`;

  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'Failed to generate letter.';
}

function generateTemplateLetter(
  listingTitle: string,
  reason: string,
  explanation: string,
): string {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return `Dear Etsy Trust & Safety Team,

I am writing to appeal the deactivation of my listing: "${listingTitle}".

Date: ${date}

I understand my listing was flagged for: ${reason}

I respectfully disagree with this decision for the following reasons:

${explanation || '[Please describe why your listing complies with Etsy policies]'}

I want to assure you that:
- My product is original and does not infringe on any intellectual property rights
- All materials and descriptions accurately represent the item
- I have reviewed Etsy's Seller Policy and believe my listing is in full compliance
- I am committed to maintaining the integrity of the Etsy marketplace

I kindly request that you reconsider the deactivation and reinstate my listing. I am happy to provide additional information or make modifications if needed.

Thank you for your time and consideration.

Sincerely,
[Your Name]
[Your Shop Name]`;
}

// Template button handler
document.getElementById('appeal-template-btn')?.addEventListener('click', () => {
  const titleEl = document.getElementById('appeal-listing-title') as HTMLTextAreaElement | null;
  const reasonEl = document.getElementById('appeal-reason') as HTMLTextAreaElement | null;
  const explEl = document.getElementById('appeal-explanation') as HTMLTextAreaElement | null;

  if (!titleEl || !reasonEl || !$appealOutput || !$appealResult) return;

  if (!titleEl.value.trim() || !reasonEl.value.trim()) {
    alert(`Please enter the ${!titleEl.value.trim() ? 'listing title' : 'deactivation reason'}.`);
    return;
  }

  const letter = generateTemplateLetter(
    titleEl.value.trim(),
    reasonEl.value.trim(),
    explEl?.value.trim() || '',
  );
  $appealOutput.value = letter;
  $appealResult.style.display = '';
});

// Appeal back button
document.getElementById('appeal-back-btn')?.addEventListener('click', () => {
  $appealSection?.classList.remove('active');
  $main.style.display = '';
});

// Generate button — calls Claude AI
document.getElementById('appeal-generate-btn')?.addEventListener('click', async () => {
  const titleEl = document.getElementById('appeal-listing-title') as HTMLTextAreaElement | null;
  const reasonEl = document.getElementById('appeal-reason') as HTMLTextAreaElement | null;
  const explEl = document.getElementById('appeal-explanation') as HTMLTextAreaElement | null;
  const btn = document.getElementById('appeal-generate-btn') as HTMLButtonElement | null;

  if (!titleEl || !reasonEl || !explEl || !$appealOutput || !$appealResult || !btn) return;

  if (!titleEl.value.trim() || !reasonEl.value.trim()) {
    const missing = !titleEl.value.trim() ? 'listing title' : 'deactivation reason';
    alert(`Please enter the ${missing}.`);
    return;
  }

  // AI is Pro/Dev only
  const aiLimit = await getAiDailyLimit();
  if (aiLimit <= AI_DAILY_FREE) {
    handleUpgrade();
    return;
  }

  // Check daily AI limit for Pro
  const usage = await getAiUsage();
  if (usage.count >= aiLimit) {
    alert(`Daily AI limit reached (${aiLimit}/${aiLimit}). Try again tomorrow.`);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const letter = await generateAppealWithAI(
      titleEl.value.trim(),
      reasonEl.value.trim(),
      explEl.value.trim(),
    );
    await incrementAiUsage();
    await updateAiUsageDisplay();
    $appealOutput.value = letter;
    $appealResult.style.display = '';
  } catch (err) {
    $appealOutput.value = `Error: ${err instanceof Error ? err.message : String(err)}`;
    $appealResult.style.display = '';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate with AI';
  }
});

// Copy appeal letter
document.getElementById('appeal-copy-btn')?.addEventListener('click', async () => {
  if (!$appealOutput) return;
  const btn = document.getElementById('appeal-copy-btn')!;
  try {
    await navigator.clipboard.writeText($appealOutput.value);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy Letter'; btn.classList.remove('copied'); }, 2000);
  } catch {
    $appealOutput.select();
    document.execCommand('copy');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy Letter'; }, 2000);
  }
});

/* -------------------------------------------------- */
/*  Policy Alerts                                     */
/* -------------------------------------------------- */

const $policySection = document.getElementById('policy-section');

async function renderPolicyUpdates(): Promise<void> {
  const listEl = document.getElementById('policy-list');
  const emptyEl = document.getElementById('policy-empty');
  if (!listEl || !emptyEl) return;

  const resp = await sendMessage<Array<{
    id: string; date: string; title: string; summary: string; severity: string;
  }>>('getPolicyUpdates');

  const updates = resp.data || [];
  listEl.innerHTML = '';

  if (updates.length === 0) {
    emptyEl.style.display = '';
    listEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.style.display = '';

  for (const update of updates) {
    const item = document.createElement('div');
    item.className = 'policy-item';

    const header = document.createElement('div');
    header.className = 'policy-item-header';

    const badge = document.createElement('span');
    badge.className = `policy-severity ${update.severity}`;
    badge.textContent = update.severity;

    const title = document.createElement('span');
    title.className = 'policy-item-title';
    title.textContent = update.title;

    const date = document.createElement('span');
    date.className = 'policy-item-date';
    date.textContent = update.date;

    header.appendChild(badge);
    header.appendChild(title);
    header.appendChild(date);

    const summary = document.createElement('div');
    summary.className = 'policy-item-summary';
    summary.textContent = update.summary;

    item.appendChild(header);
    item.appendChild(summary);
    listEl.appendChild(item);
  }

  // Mark latest as seen
  if (updates.length > 0) {
    await sendMessage('markPolicySeen', updates[0].id);
    const badgeEl = document.getElementById('policy-badge');
    if (badgeEl) badgeEl.style.display = 'none';
  }
}

async function checkPolicyBadge(): Promise<void> {
  const resp = await sendMessage<Array<unknown>>('checkNewPolicies');
  const newCount = resp.data?.length || 0;
  const badgeEl = document.getElementById('policy-badge');
  if (badgeEl && newCount > 0) {
    badgeEl.textContent = String(newCount);
    badgeEl.style.display = '';
  }
}

// Policy back button
document.getElementById('policy-back-btn')?.addEventListener('click', () => {
  $policySection?.classList.remove('active');
  $main.style.display = '';
});

/* -------------------------------------------------- */
/*  Phase 3: AI Tools (Pro only)                      */
/* -------------------------------------------------- */

async function callClaudeAI(prompt: string): Promise<string> {
  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  return data.content?.[0]?.text || 'No response';
}

function showAiResults(title: string, content: string): void {
  if (!$aiResultsSection) return;
  const titleEl = document.getElementById('ai-results-title');
  const contentEl = document.getElementById('ai-results-content');
  if (titleEl) titleEl.textContent = title;
  if (contentEl) contentEl.textContent = content;
  $main.style.display = 'none';
  $aiResultsSection.classList.add('active');
}

async function runAiTool(toolName: string, btnId: string): Promise<void> {
  // Check Pro/Dev
  const limit = await getAiDailyLimit();
  if (limit <= AI_DAILY_FREE) {
    handleUpgrade();
    return;
  }
  const usage = await getAiUsage();
  if (usage.count >= limit) {
    alert(`Daily AI limit reached (${limit}/${limit}).`);
    return;
  }

  const btn = document.getElementById(btnId) as HTMLButtonElement;
  if (btn) { btn.disabled = true; btn.textContent = 'Working...'; }

  try {
    let prompt = '';
    let resultTitle = '';

    // Get current listing data from last scan
    const title = lastComplianceResult ? $listingTitle.textContent || '' : '';
    const compIssues = lastComplianceResult?.findings
      .filter(f => f.severity !== 'green')
      .map(f => f.title).join(', ') || 'none';
    const seoIssues = lastSEOResult?.findings
      .filter(f => f.severity !== 'green')
      .map(f => f.title).join(', ') || 'none';

    if (toolName === 'rewrite-title') {
      resultTitle = 'AI Title Suggestions';
      prompt = `You are an Etsy SEO expert. Rewrite this Etsy listing title to be both compliance-safe and SEO-optimized.

Current title: "${title}"
Compliance issues found: ${compIssues}
SEO issues found: ${seoIssues}

Generate exactly 3 alternative titles. Rules:
- Max 140 characters each
- Remove any trademarked terms
- Front-load the most important keyword
- Don't repeat any word more than twice
- Don't start with filler adjectives (beautiful, amazing, etc.)
- NEVER fabricate product details not present in the original title
- Keep the product type and key attributes from the original

Format:
1. [title]
2. [title]
3. [title]

Brief explanation of why each is better.

IMPORTANT: Do NOT use markdown formatting. No **, ##, or other markup. Write plain text only.`;
    } else if (toolName === 'generate-tags') {
      resultTitle = 'AI Tag Suggestions';
      prompt = `You are an Etsy SEO expert. Generate 13 optimized tags for this Etsy listing.

Listing title: "${title}"

Rules:
- Generate exactly 13 tags
- Each tag should be a multi-word phrase (2-3 words ideal)
- No trademarked brand names
- Include a mix of: product type, material, occasion, recipient, style, color
- Tags should match how real buyers search on Etsy
- No single-word tags
- No duplicate or overlapping tags

Format each tag on its own line, numbered 1-13.
After the list, briefly explain your tag strategy.

IMPORTANT: Be transparent — say "Based on your listing content" not "Based on search volume data" since we don't have search volume data.

Do NOT use markdown formatting. No **, ##, or other markup. Write plain text only.`;
    } else if (toolName === 'improve-desc') {
      resultTitle = 'AI Description Suggestion';
      prompt = `You are an Etsy SEO expert. Write an improved product description for this Etsy listing.

Current title: "${title}"
SEO issues: ${seoIssues}

Write a 300+ word product description that:
- Includes the main keywords from the title naturally in the first paragraph
- Is structured with clear sections (product details, materials, sizing, care, shipping)
- Does NOT include any trademarked terms
- Does NOT make claims like "FDA approved", "cures", "medical grade"
- Sounds natural and helpful, not keyword-stuffed
- NEVER fabricates product details — only use what's implied by the title
- Uses bullet points for key features

IMPORTANT: Only describe what the product likely is based on the title. Don't invent specific dimensions, materials, or features that aren't implied.

Do NOT use markdown formatting. No **, ##, or other markup. Write plain text only.`;
    }

    const result = await callClaudeAI(prompt);
    await incrementAiUsage();
    await updateAiUsageDisplay();
    showAiResults(resultTitle, result);
  } catch (err) {
    showAiResults('Error', `Failed to generate: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = toolName === 'rewrite-title' ? 'Rewrite Title' :
                        toolName === 'generate-tags' ? 'Generate Tags' : 'Improve Description';
    }
  }
}

// AI tool button handlers
document.getElementById('ai-rewrite-title-btn')?.addEventListener('click', () =>
  runAiTool('rewrite-title', 'ai-rewrite-title-btn'));
document.getElementById('ai-generate-tags-btn')?.addEventListener('click', () =>
  runAiTool('generate-tags', 'ai-generate-tags-btn'));
document.getElementById('ai-improve-desc-btn')?.addEventListener('click', () =>
  runAiTool('improve-desc', 'ai-improve-desc-btn'));

// AI results back button
document.getElementById('ai-results-back-btn')?.addEventListener('click', () => {
  $aiResultsSection?.classList.remove('active');
  $main.style.display = '';
});

// AI results copy button
document.getElementById('ai-results-copy-btn')?.addEventListener('click', async () => {
  const content = document.getElementById('ai-results-content')?.textContent || '';
  const btn = document.getElementById('ai-results-copy-btn')!;
  try {
    await navigator.clipboard.writeText(content);
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy to Clipboard'; btn.classList.remove('copied'); }, 2000);
  } catch {
    btn.textContent = 'Failed';
    setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 2000);
  }
});

/* -------------------------------------------------- */
/*  Upgrade button handlers                           */
/* -------------------------------------------------- */

const $upgradeSection = document.getElementById('upgrade-section')!;

function handleUpgrade(): void {
  // Close limit overlay if visible
  $limitOverlay.classList.remove('visible');
  // Show upgrade sub-view
  $upgradeSection.classList.add('active');
}

document.getElementById('footer-upgrade-btn')?.addEventListener('click', handleUpgrade);
document.getElementById('limit-upgrade-btn')?.addEventListener('click', handleUpgrade);

document.getElementById('upgrade-back-btn')?.addEventListener('click', () => {
  $upgradeSection.classList.remove('active');
});

document.getElementById('upgrade-cta-btn')?.addEventListener('click', () => {
  sendMessage('openPayment');
});

/* -------------------------------------------------- */
/*  Bulk Shop Scan                                    */
/* -------------------------------------------------- */

/** Parse listing title and description from raw HTML fetched via fetch() */
function parseListingFromHtml(html: string): { title: string; description: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Title
  let title = '';
  const h1 = doc.querySelector('h1');
  if (h1) title = h1.textContent?.trim() || '';
  if (!title) {
    const og = doc.querySelector('meta[property="og:title"]');
    title = og?.getAttribute('content') || '';
  }

  // Description
  let description = '';
  const ogDesc = doc.querySelector('meta[property="og:description"]');
  if (ogDesc) description = ogDesc.getAttribute('content') || '';
  if (!description) {
    const metaDesc = doc.querySelector('meta[name="description"]');
    description = metaDesc?.getAttribute('content') || '';
  }

  return { title, description };
}

// Bulk Scan — extracted into a function so action sheet can call it
async function launchBulkScan(): Promise<void> {
  // Check Pro/Dev access
  const proResp = await sendMessage<{ paid: boolean }>('checkProStatus');
  const syncData = await chrome.storage.sync.get('proLicense');
  const isPro = (proResp.success && proResp.data?.paid) || !!syncData.proLicense;

  if (!isPro) {
    handleUpgrade();
    return;
  }

  // Get listing URLs from content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const resp = await chrome.tabs.sendMessage(tab.id, { action: 'extractShopListings' });
  if (!resp?.success || !resp.data?.length) {
    alert('No listings found on this page. Make sure you are on an Etsy shop page.');
    return;
  }

  const listings = resp.data as Array<{ url: string; title: string }>;

  // Show bulk section, hide main content
  $main.style.display = 'none';
  $bulkSection?.classList.add('active');

  const statusEl = document.getElementById('bulk-status')!;
  const listEl = document.getElementById('bulk-list')!;
  const progressEl = document.getElementById('bulk-progress')!;

  listEl.innerHTML = '';
  statusEl.textContent = `Scanning ${listings.length} listings...`;

  let scanned = 0;
  let totalCompliance = 0;
  let totalSeo = 0;
  let issueCount = 0;

  const CONCURRENCY = 3;

  /** Process a single listing: fetch, parse, scan, render */
  async function processSingleListing(listing: { url: string; title: string }): Promise<void> {
    try {
      const htmlResp = await fetch(listing.url);
      const html = await htmlResp.text();
      const parsed = parseListingFromHtml(html);

      if (!parsed.title) {
        parsed.title = listing.title;
      }

      const listingData: ListingData = {
        title: parsed.title,
        tags: [],
        description: parsed.description,
        category: '',
        price: '',
        imageCount: 0,
      };

      const compResult = scanCompliance(listingData);
      const seoResult = scanSEO(listingData);

      totalCompliance += compResult.score;
      totalSeo += seoResult.score;
      const issues = compResult.findings.filter(f => f.severity !== 'green').length +
                     seoResult.findings.filter(f => f.severity !== 'green').length;
      issueCount += issues;

      const item = document.createElement('div');
      item.className = 'bulk-item';

      const scores = document.createElement('div');
      scores.className = 'bulk-item-scores';

      const cBadge = document.createElement('span');
      cBadge.className = `history-score ${scoreColorClass(compResult.score)}`;
      cBadge.textContent = String(compResult.score);
      cBadge.title = 'Compliance';

      const sBadge = document.createElement('span');
      sBadge.className = `history-score ${scoreColorClass(seoResult.score)}`;
      sBadge.textContent = String(seoResult.score);
      sBadge.title = 'SEO';

      scores.appendChild(cBadge);
      scores.appendChild(sBadge);

      const titleEl2 = document.createElement('div');
      titleEl2.className = 'bulk-item-title';
      titleEl2.textContent = parsed.title.slice(0, 60);
      titleEl2.title = parsed.title;

      const issueEl = document.createElement('div');
      issueEl.className = 'bulk-item-issues';
      issueEl.textContent = issues > 0 ? `${issues} issues` : 'Clean';

      item.appendChild(scores);
      item.appendChild(titleEl2);
      item.appendChild(issueEl);

      item.style.cursor = 'pointer';
      item.addEventListener('click', () => chrome.tabs.create({ url: listing.url }));

      listEl.appendChild(item);
    } catch {
      const item = document.createElement('div');
      item.className = 'bulk-item';
      const failTitle = document.createElement('div');
      failTitle.className = 'bulk-item-title';
      failTitle.style.color = 'var(--text-secondary)';
      failTitle.textContent = `Failed to load: ${listing.title.slice(0, 40)}...`;
      item.appendChild(failTitle);
      listEl.appendChild(item);
    }

    scanned++;
    progressEl.textContent = `${scanned}/${listings.length}`;
  }

  // Process listings in parallel batches of CONCURRENCY
  for (let i = 0; i < listings.length; i += CONCURRENCY) {
    const batch = listings.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(l => processSingleListing(l)));
    // Small delay between batches to avoid Etsy rate limiting
    if (i + CONCURRENCY < listings.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  const avgC = scanned > 0 ? Math.round(totalCompliance / scanned) : 0;
  const avgS = scanned > 0 ? Math.round(totalSeo / scanned) : 0;

  statusEl.innerHTML = `
    <div class="bulk-summary">
      <div class="bulk-summary-stat"><div class="bulk-summary-value">${scanned}</div><div class="bulk-summary-label">Scanned</div></div>
      <div class="bulk-summary-stat"><div class="bulk-summary-value" style="color:${avgC >= 80 ? 'var(--safe)' : avgC >= 50 ? 'var(--warning)' : 'var(--danger)'}">${avgC}</div><div class="bulk-summary-label">Avg Compliance</div></div>
      <div class="bulk-summary-stat"><div class="bulk-summary-value" style="color:${avgS >= 80 ? 'var(--safe)' : avgS >= 50 ? 'var(--warning)' : 'var(--danger)'}">${avgS}</div><div class="bulk-summary-label">Avg SEO</div></div>
      <div class="bulk-summary-stat"><div class="bulk-summary-value" style="color:${issueCount > 0 ? 'var(--danger)' : 'var(--safe)'}">${issueCount}</div><div class="bulk-summary-label">Total Issues</div></div>
    </div>
  `;
  progressEl.textContent = 'Done';
}

// Legacy bulk-btn handler (if element exists)
document.getElementById('bulk-btn')?.addEventListener('click', () => launchBulkScan());

// Bulk scan back button
document.getElementById('bulk-back-btn')?.addEventListener('click', () => {
  $bulkSection?.classList.remove('active');
  $main.style.display = '';
});

/* -------------------------------------------------- */
/*  Main entry point                                  */
/* -------------------------------------------------- */

document.addEventListener('DOMContentLoaded', async () => {
  // Wire up both manual scan forms
  setupManualScanButton('manual-scan-btn-1', 'manual-title-1', 'manual-tags-1', 'manual-desc-1');
  setupManualScanButton('manual-scan-btn-2', 'manual-title-2', 'manual-tags-2', 'manual-desc-2');

  // updateDevBadge removed for production
  checkPolicyBadge(); // non-blocking

  showLoading();

  // 1. Check scan limit
  const limitResp = await sendMessage<{ allowed: boolean }>('checkLimit');
  if (limitResp.success && limitResp.data && !limitResp.data.allowed) {
    showLimitReached();
    return;
  }

  // 2. Get the active tab
  let activeTab: chrome.tabs.Tab | undefined;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;
  } catch {
    showError('Could not access the current tab.');
    return;
  }

  const tabUrl = activeTab?.url ?? '';

  // 3. Check if we're on an Etsy shop page — show bulk scan option
  const shopPattern = /^https?:\/\/(www\.)?etsy\.com\/([\w-]+\/)?shop\//;
  if (shopPattern.test(tabUrl)) {
    $listingTitle.textContent = 'Shop page detected';
    hideAll();
    $loading.classList.remove('visible');
    $footer.style.display = '';
    await updateScanCount();

    // Show a shop-specific view with Bulk Scan button
    const shopView = document.createElement('div');
    shopView.style.cssText = 'padding:40px 20px;text-align:center;';
    shopView.innerHTML = `
      <div style="font-size:36px;margin-bottom:12px;">&#128722;</div>
      <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px;">Etsy Shop Detected</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:20px;line-height:1.5;">
        Scan all visible listings in this shop at once to check for compliance issues and SEO opportunities.
      </div>
      <button id="shop-bulk-scan-btn" style="
        width:100%;padding:12px;font-size:14px;font-weight:600;
        color:#fff;background:linear-gradient(135deg,#1e40af,#3b82f6);
        border:none;border-radius:8px;cursor:pointer;">
        Scan All Listings
      </button>
      <div style="font-size:10px;color:#64748b;margin-top:8px;">Pro feature — scans up to 50 listings</div>
    `;
    document.getElementById('content-scroll')?.appendChild(shopView);

    document.getElementById('shop-bulk-scan-btn')?.addEventListener('click', () => {
      shopView.remove();
      launchBulkScan();
    });

    const sheetBulk = document.getElementById('sheet-bulk');
    if (sheetBulk) sheetBulk.style.display = '';
    return;
  }

  // 4. Check if we're on an Etsy listing page
  const etsyListingPattern = /^https?:\/\/(www\.)?etsy\.com\/([\w-]+\/)?listing\//;
  if (!etsyListingPattern.test(tabUrl)) {
    showNotEtsy();
    return;
  }

  // 5. Extract listing data from the content script
  try {
    if (!activeTab?.id) {
      showError('Could not identify the current tab.');
      return;
    }

    const response = await chrome.tabs.sendMessage(activeTab.id, {
      action: 'extractListing',
    }) as { success: boolean; data?: ListingData; error?: string };

    if (!response?.success || !response.data) {
      showError(response?.error ?? 'Could not read listing data.');
      return;
    }

    const listing = response.data;
    $listingTitle.textContent = listing.title || 'Untitled listing';

    // 5. Increment scan count
    await sendMessage('incrementScan');

    // 6. Run scanners
    const complianceResult = scanCompliance(listing);
    const seoResult = scanSEO(listing);

    // 7. Render results
    await renderResults(complianceResult, seoResult);
    // Save to history
    await saveScanToHistory(tabUrl, listing.title, complianceResult, seoResult);
    await updateScanCount();
  } catch (err) {
    showError('Could not read the listing. You can paste your details manually below.');
  }
});
