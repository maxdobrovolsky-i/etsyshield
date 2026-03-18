import type { Finding } from '../../types/index';

/** AI fix tool type based on finding content */
export type AiFixType = 'rewrite-title' | 'generate-tags' | 'improve-desc' | null;

/** Detect which AI tool can fix this finding */
function detectAiFix(finding: Finding): AiFixType {
  if (finding.severity === 'green') return null;
  const t = finding.title.toLowerCase();
  if (t.includes('title')) return 'rewrite-title';
  if (t.includes('tag')) return 'generate-tags';
  if (t.includes('description') || t.includes('keyword')) return 'improve-desc';
  return null;
}

/**
 * Create a DOM element for a finding card.
 * If isSeoFinding=true, adds "Fix with AI" button for Pro users.
 */
export function createFindingCard(
  finding: Finding,
  options?: { isSeo?: boolean; onAiFix?: (type: AiFixType) => void }
): HTMLElement {
  const card = document.createElement('div');
  card.className = `finding-card severity-${finding.severity}`;

  // ---------- Header ----------
  const header = document.createElement('div');
  header.className = 'finding-header';

  const badge = document.createElement('span');
  badge.className = `finding-severity-badge ${finding.severity}`;
  badge.textContent = finding.severity === 'green' ? 'PASS' : finding.severity === 'yellow' ? 'CAUTION' : 'ISSUE';

  const body = document.createElement('div');
  body.className = 'finding-body';

  const title = document.createElement('div');
  title.className = 'finding-title';
  title.textContent = finding.title;

  const desc = document.createElement('div');
  desc.className = 'finding-desc';
  desc.textContent = finding.description;

  body.appendChild(title);
  body.appendChild(desc);

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'finding-chevron');
  chevron.setAttribute('viewBox', '0 0 16 16');
  chevron.setAttribute('fill', 'none');
  chevron.setAttribute('stroke', 'currentColor');
  chevron.setAttribute('stroke-width', '2');
  chevron.setAttribute('stroke-linecap', 'round');
  chevron.setAttribute('stroke-linejoin', 'round');
  const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  chevronPath.setAttribute('d', 'M4 6l4 4 4-4');
  chevron.appendChild(chevronPath);

  header.appendChild(badge);
  header.appendChild(body);
  header.appendChild(chevron);

  // ---------- Fix section ----------
  const fix = document.createElement('div');
  fix.className = 'finding-fix';

  const fixLabel = document.createElement('div');
  fixLabel.className = 'finding-fix-label';
  fixLabel.textContent = 'How to fix';

  const fixText = document.createElement('div');
  fixText.textContent = finding.fix;

  fix.appendChild(fixLabel);
  fix.appendChild(fixText);

  // ---------- AI Fix button (SEO findings only) ----------
  const aiFixType = options?.isSeo ? detectAiFix(finding) : null;
  if (aiFixType && options?.onAiFix) {
    const aiBtn = document.createElement('button');
    aiBtn.className = 'ai-fix-btn';
    aiBtn.textContent = 'Fix with AI';
    aiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onAiFix!(aiFixType);
    });
    fix.appendChild(aiBtn);
  }

  // ---------- Assemble ----------
  card.appendChild(header);
  card.appendChild(fix);

  header.addEventListener('click', () => {
    card.classList.toggle('expanded');
  });

  return card;
}
