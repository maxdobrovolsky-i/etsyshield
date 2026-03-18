/**
 * ExtensionPay integration stub.
 *
 * To activate:
 * 1. Register at https://extensionpay.com
 * 2. Create an extension, get your Extension ID
 * 3. Replace EXTENSION_ID below
 * 4. Add ExtPay script to manifest or import their npm package
 *
 * For now, Pro status is checked via:
 * - chrome.storage.sync 'proLicense' key (set by ExtensionPay callback)
 * - Dev mode toggle (for testing)
 */

const EXTENSION_ID = ''; // TODO: Set your ExtensionPay extension ID

/**
 * Check if user has Pro license.
 * Returns true if:
 * 1. ExtensionPay reports paid status, OR
 * 2. Dev mode is enabled (for testing)
 */
export async function isPro(): Promise<boolean> {
  // Check dev mode first
  const local = await chrome.storage.local.get('devMode');
  if (local.devMode === true) return true;

  // Check stored Pro license
  const sync = await chrome.storage.sync.get('proLicense');
  if (sync.proLicense) return true;

  return false;
}

/**
 * Open the payment/upgrade page.
 * When ExtensionPay is configured, this triggers their payment flow.
 * For now, opens the upgrade URL.
 */
export function openUpgrade(): void {
  if (EXTENSION_ID) {
    // ExtensionPay flow would go here:
    // ExtPay(EXTENSION_ID).openPaymentPage();
    chrome.tabs.create({ url: 'https://etsyshield.com/upgrade' });
  } else {
    chrome.tabs.create({ url: 'https://etsyshield.com/upgrade' });
  }
}

/**
 * Activate Pro manually (for testing or manual license entry).
 */
export async function activatePro(licenseKey: string): Promise<void> {
  await chrome.storage.sync.set({ proLicense: licenseKey });
}

/**
 * Deactivate Pro.
 */
export async function deactivatePro(): Promise<void> {
  await chrome.storage.sync.remove('proLicense');
}
