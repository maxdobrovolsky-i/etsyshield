import type { ScanCount, ScanHistoryEntry } from '../types/index';
import ExtPay from 'extpay';

const FREE_SCAN_LIMIT = 5;
const MAX_HISTORY_ENTRIES = 50;

// Initialize ExtensionPay
const extpay = ExtPay('etsyshield');
extpay.startBackground();

/** Get current month-year string (e.g., "2026-03") */
function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Get the current scan count, resetting if month has changed */
async function getScanCount(): Promise<ScanCount> {
  const result = await chrome.storage.local.get('scanCount');
  const stored = result.scanCount as ScanCount | undefined;
  const currentMonth = getCurrentMonthYear();

  if (!stored || stored.monthYear !== currentMonth) {
    // New month or first use — reset counter
    const fresh: ScanCount = { count: 0, monthYear: currentMonth };
    await chrome.storage.local.set({ scanCount: fresh });
    return fresh;
  }

  return stored;
}

/** Increment the scan counter and return updated count */
async function incrementScan(): Promise<ScanCount> {
  const current = await getScanCount();
  current.count += 1;
  await chrome.storage.local.set({ scanCount: current });
  return current;
}

/** Check if the user has reached the free scan limit */
async function checkLimit(): Promise<{ allowed: boolean; remaining: number; count: number; limit: number }> {
  // Check dev mode first (for testing)
  const localData = await chrome.storage.local.get('devMode');
  if (localData.devMode === true) {
    return { allowed: true, remaining: Infinity, count: 0, limit: Infinity };
  }

  // Check ExtensionPay Pro status
  try {
    const user = await extpay.getUser();
    if (user.paid) {
      return { allowed: true, remaining: Infinity, count: 0, limit: Infinity };
    }
  } catch { /* ExtPay not available — fall through to free limit */ }

  const scanCount = await getScanCount();
  const remaining = Math.max(0, FREE_SCAN_LIMIT - scanCount.count);
  return {
    allowed: scanCount.count < FREE_SCAN_LIMIT,
    remaining,
    count: scanCount.count,
    limit: FREE_SCAN_LIMIT,
  };
}

// --- Dev Mode ---

/** Get current dev mode state */
async function getDevMode(): Promise<boolean> {
  const result = await chrome.storage.local.get('devMode');
  return result.devMode === true;
}

/** Toggle dev mode on/off and return new state */
async function toggleDevMode(): Promise<boolean> {
  const current = await getDevMode();
  const next = !current;
  await chrome.storage.local.set({ devMode: next });
  return next;
}

// --- Scan History ---

/** Save a scan history entry, keeping at most MAX_HISTORY_ENTRIES (oldest dropped) */
async function saveScanHistory(entry: ScanHistoryEntry): Promise<ScanHistoryEntry[]> {
  const result = await chrome.storage.local.get('scanHistory');
  const history: ScanHistoryEntry[] = result.scanHistory ?? [];

  history.push(entry);

  // Trim to max entries — drop oldest (front of array)
  while (history.length > MAX_HISTORY_ENTRIES) {
    history.shift();
  }

  await chrome.storage.local.set({ scanHistory: history });
  return history;
}

/** Get all scan history entries sorted newest first */
async function getScanHistory(): Promise<ScanHistoryEntry[]> {
  const result = await chrome.storage.local.get('scanHistory');
  const history: ScanHistoryEntry[] = result.scanHistory ?? [];
  return history.sort((a, b) => b.timestamp - a.timestamp);
}

/** Clear all scan history */
async function clearScanHistory(): Promise<void> {
  await chrome.storage.local.remove('scanHistory');
}

// --- Policy Alerts ---

const POLICY_UPDATES_URL = 'https://maxdobrovolsky-i.github.io/etsyshield-data/policy-updates.json';

interface PolicyUpdate {
  id: string;
  date: string;
  title: string;
  summary: string;
  severity: 'info' | 'warning' | 'critical';
}

async function checkPolicyUpdates(): Promise<PolicyUpdate[]> {
  try {
    const resp = await fetch(POLICY_UPDATES_URL, { cache: 'no-cache' });
    if (!resp.ok) return [];
    const updates: PolicyUpdate[] = await resp.json();

    // Get last seen update ID
    const stored = await chrome.storage.local.get('lastSeenPolicyId');
    const lastSeen = stored.lastSeenPolicyId || '';

    // Return only new updates
    if (!lastSeen) return updates.slice(0, 3);
    const lastIdx = updates.findIndex(u => u.id === lastSeen);
    if (lastIdx <= 0) return [];
    return updates.slice(0, lastIdx);
  } catch {
    return [];
  }
}

async function markPolicySeen(id: string): Promise<void> {
  await chrome.storage.local.set({ lastSeenPolicyId: id });
}

async function getPolicyUpdates(): Promise<PolicyUpdate[]> {
  try {
    const resp = await fetch(POLICY_UPDATES_URL, { cache: 'no-cache' });
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

// Set up periodic policy check (every 12 hours)
chrome.alarms.create('checkPolicyUpdates', { periodInMinutes: 720 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkPolicyUpdates') {
    const newUpdates = await checkPolicyUpdates();
    if (newUpdates.length > 0) {
      // Set badge to show new updates count
      chrome.action.setBadgeText({ text: String(newUpdates.length) });
      chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = async () => {
    try {
      switch (message.action) {
        case 'getScanCount': {
          const count = await getScanCount();
          sendResponse({ success: true, data: count });
          break;
        }
        case 'incrementScan': {
          const updated = await incrementScan();
          sendResponse({ success: true, data: updated });
          break;
        }
        case 'checkLimit': {
          const limit = await checkLimit();
          sendResponse({ success: true, data: limit });
          break;
        }
        case 'saveScanHistory': {
          const history = await saveScanHistory(message.data);
          sendResponse({ success: true, data: history });
          break;
        }
        case 'getScanHistory': {
          const history = await getScanHistory();
          sendResponse({ success: true, data: history });
          break;
        }
        case 'clearScanHistory': {
          await clearScanHistory();
          sendResponse({ success: true });
          break;
        }
        case 'toggleDevMode': {
          const devMode = await toggleDevMode();
          sendResponse({ success: true, data: devMode });
          break;
        }
        case 'getDevMode': {
          const devMode = await getDevMode();
          sendResponse({ success: true, data: devMode });
          break;
        }
        case 'getPolicyUpdates': {
          const updates = await getPolicyUpdates();
          sendResponse({ success: true, data: updates });
          break;
        }
        case 'checkNewPolicies': {
          const newUpdates = await checkPolicyUpdates();
          sendResponse({ success: true, data: newUpdates });
          break;
        }
        case 'markPolicySeen': {
          await markPolicySeen(message.data);
          chrome.action.setBadgeText({ text: '' });
          sendResponse({ success: true });
          break;
        }
        case 'openPayment': {
          extpay.openPaymentPage();
          sendResponse({ success: true });
          break;
        }
        case 'checkProStatus': {
          try {
            const user = await extpay.getUser();
            sendResponse({ success: true, data: { paid: user.paid, email: user.email } });
          } catch {
            sendResponse({ success: true, data: { paid: false } });
          }
          break;
        }
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
  };

  handler();
  return true; // Keep message channel open for async response
});
