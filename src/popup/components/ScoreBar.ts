import type { Severity } from '../../types/index';

/**
 * Return the color associated with a numeric score.
 *  >= 80  green
 *  >= 50  amber
 *  <  50  red
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#27AE60';
  if (score >= 50) return '#D4850A';
  return '#C0392B';
}

/**
 * Return a human-readable verdict for the given score.
 */
export function getScoreVerdict(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Needs work';
  return 'At risk';
}

/**
 * Animate an SVG circle + value element to reflect the given score (0-100).
 *
 * Uses r=34 for 80px circles (circumference ~ 213.6).
 * Includes a count-up animation for the numeric score over 800ms with ease-out cubic.
 *
 * @param circleEl  The <circle> element whose stroke-dashoffset we animate
 * @param valueEl   The element that displays the numeric score text
 * @param score     A number between 0 and 100
 */
export function animateScore(
  circleEl: SVGCircleElement,
  valueEl: HTMLElement,
  score: number,
): void {
  const circumference = 2 * Math.PI * 34; // ~213.6 for r=34
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  // Apply circle stroke animation in a rAF so the browser can batch the transition
  requestAnimationFrame(() => {
    circleEl.style.strokeDasharray = String(circumference);
    circleEl.style.strokeDashoffset = String(offset);
    circleEl.style.stroke = color;
    circleEl.style.transition =
      'stroke-dashoffset 0.8s ease, stroke 0.4s ease';
  });

  // Count-up animation for the number (0 -> score over 800ms, ease-out cubic)
  const duration = 800;
  const startTime = performance.now();
  const target = Math.round(score);

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  function tick(now: number): void {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    const current = Math.round(eased * target);

    valueEl.textContent = String(current);
    valueEl.style.color = color;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Return a single-character icon string based on finding severity.
 *  red / yellow  ->  '!'  (alert)
 *  green         ->  checkmark character
 */
export function getSeverityIcon(severity: Severity): string {
  if (severity === 'green') return '\u2713'; // checkmark
  return '!';
}
