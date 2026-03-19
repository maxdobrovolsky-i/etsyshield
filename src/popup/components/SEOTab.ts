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
  tags?: string[],
): void {
  container.innerHTML = '';

  // Show detected tags — collapsed by default
  const cappedTags = tags ? tags.slice(0, 13) : [];
  if (cappedTags.length > 0) {
    const tagsBlock = document.createElement('div');
    tagsBlock.className = 'tags-block';

    const tagsHeader = document.createElement('div');
    tagsHeader.className = 'tags-block-header';

    const tagsLabel = document.createElement('span');
    tagsLabel.className = 'tags-block-label';
    tagsLabel.textContent = `Detected Tags (${cappedTags.length}/13)`;

    const chevron = document.createElement('span');
    chevron.className = 'tags-block-chevron';
    chevron.textContent = '\u25BC';

    tagsHeader.appendChild(tagsLabel);
    tagsHeader.appendChild(chevron);
    tagsBlock.appendChild(tagsHeader);

    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'tags-block-list';
    for (const tag of cappedTags) {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = tag;
      tagsWrap.appendChild(chip);
    }
    tagsBlock.appendChild(tagsWrap);

    tagsHeader.addEventListener('click', () => {
      tagsBlock.classList.toggle('expanded');
    });

    container.appendChild(tagsBlock);
  }

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
