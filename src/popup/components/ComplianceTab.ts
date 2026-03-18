import type { ScanResult } from '../../types/index';
import { createFindingCard } from './FindingCard';

/**
 * Render the compliance findings into the given container element.
 * Clears existing content first.
 */
export function renderComplianceTab(
  container: HTMLElement,
  result: ScanResult,
): void {
  container.innerHTML = '';

  if (result.findings.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state visible';

    const title = document.createElement('div');
    title.className = 'empty-state-title';
    title.textContent = 'All clear!';

    const desc = document.createElement('div');
    desc.className = 'empty-state-desc';
    desc.textContent = 'No compliance issues found for this listing.';

    empty.appendChild(title);
    empty.appendChild(desc);
    container.appendChild(empty);
    return;
  }

  // Sort findings: red first, then yellow, then green
  const order = { red: 0, yellow: 1, green: 2 } as const;
  const sorted = [...result.findings].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );

  for (const finding of sorted) {
    container.appendChild(createFindingCard(finding));
  }
}

/**
 * Return the number of non-green (actionable) findings — used as
 * the badge count on the Compliance tab.
 */
export function getComplianceBadge(result: ScanResult): number {
  return result.findings.filter((f) => f.severity !== 'green').length;
}
