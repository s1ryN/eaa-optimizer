/**
 * Scoring and certificate eligibility logic.
 *
 * Scoring formula
 * ───────────────
 * Each failing node instance contributes a penalty based on its impact level.
 * The total penalty is normalised by the number of pages scanned so that a
 * large website is not penalised more harshly than a single-page site.
 *
 *   penalty per node:  critical=10  serious=5  moderate=2  minor=1
 *   normalised penalty = totalPenalty / max(1, pagesScanned)
 *   score = clamp(100 − round(normalised / 50 × 100), 0, 100)
 *
 * Meaning: one page would need 50 "penalty points" worth of violations to hit
 * score 0.  That equals 5 critical violations (50/10) or 50 minor ones.
 *
 * Certificate eligibility
 * ───────────────────────
 * After the user reviews the violation list and optionally marks false-positives:
 *  - Zero critical violations remaining
 *  - Zero serious violations remaining
 *  - Score ≥ 75
 */

/** @type {Record<string, number>} */
const IMPACT_WEIGHTS = {
    critical: 10,
    serious:  5,
    moderate: 2,
    minor:    1,
};

/**
 * Map an impact string to a numeric sort order so the DB / API can order
 * violations from most to least severe correctly.
 *
 * @type {Record<string, number>}
 */
const IMPACT_ORDER = {
    critical: 1,
    serious:  2,
    moderate: 3,
    minor:    4,
};

/**
 * Calculate an accessibility score 0–100 for a completed scan.
 *
 * @param {Array<{impact: string}>} violations - All violation records (one per failing node)
 * @param {number} pagesScanned
 * @returns {number} integer 0–100
 */
function calculateScore(violations, pagesScanned) {
    if (!violations || violations.length === 0) return 100;

    const totalPenalty = violations.reduce((sum, v) => {
        return sum + (IMPACT_WEIGHTS[v.impact] ?? 1);
    }, 0);

    const normalised = totalPenalty / Math.max(1, pagesScanned);
    const score      = Math.max(0, Math.round(100 - (normalised / 50) * 100));
    return Math.min(100, score);
}

/**
 * Determine whether a scan result qualifies for an EAA/WCAG certificate.
 *
 * @param {Array<{impact: string}>} violations - Remaining violations AFTER user exclusions
 * @param {number} score
 * @returns {{ eligible: boolean, reason: string }}
 */
function checkCertificateEligibility(violations, score) {
    const critical = violations.filter(v => v.impact === 'critical').length;
    const serious  = violations.filter(v => v.impact === 'serious').length;

    if (critical > 0) {
        return {
            eligible: false,
            reason: `${critical} critical violation(s) must be resolved before a certificate can be issued.`,
        };
    }
    if (serious > 0) {
        return {
            eligible: false,
            reason: `${serious} serious violation(s) must be resolved before a certificate can be issued.`,
        };
    }
    if (score < 75) {
        return {
            eligible: false,
            reason: `Score ${score}/100 is below the minimum threshold of 75.`,
        };
    }

    return {
        eligible: true,
        reason: 'All automated checks passed. A compliance certificate can be issued.',
    };
}

module.exports = { calculateScore, checkCertificateEligibility, IMPACT_WEIGHTS, IMPACT_ORDER };
