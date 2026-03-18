import type { ScanResult } from '../../types/index';
import { createFindingCard, type AiFixType } from './FindingCard';

/**
 * Render the SEO findings into the given container element.
 * onAiFix callback is called when user clicks "Fix with AI" on a finding.
 */
export function renderSEOTab(
  container: HTMLElement,
  result: ScanResult,
  onAiFix?: (type: AiFixType) => void,
): void {
  container.innerHTML = '';

  if (result.findings.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state visible';

    const title = document.createElement('div');
    title.className = 'empty-state-title';
    title.textContent = 'Looking good!';

    const desc = document.createElement('div');
    desc.className = 'empty-state-desc';
    desc.textContent = 'No SEO improvements needed for this listing.';

    empty.appendChild(title);
    empty.appendChild(desc);
    container.appendChild(empty);
    return;
  }

  const order = { red: 0, yellow: 1, green: 2 } as const;
  const sorted = [...result.findings].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );

  for (const finding of sorted) {
    container.appendChild(createFindingCard(finding, {
      isSeo: true,
      onAiFix,
    }));
  }
}

export function getSEOBadge(result: ScanResult): number {
  return result.findings.filter((f) => f.severity !== 'green').length;
}
