/**
 * Violation formatter
 * ════════════════════
 * Transforms raw axe-core node records (as produced by crawlAndScan) into
 * the shape expected by Prisma's Violation model, enriching each record with
 * guidance from the WCAG rules knowledge base.
 */

const { getRule }     = require('../rules/index');
const { IMPACT_ORDER } = require('../scoring');

/**
 * Map a flat array of raw violation objects (one per failing DOM node) to
 * Prisma-ready DB records.
 *
 * Each raw violation comes from runner.js and has the shape:
 *   { ruleId, impact, description, help, helpUrl, htmlContext,
 *     target, failureSummary, pageUrl }
 *
 * @param {Array}  rawViolations - Output of crawlAndScan().allViolations
 * @param {string} scanId        - Prisma Scan.id to link every record to
 * @returns {Array} Array of objects ready for prisma.violation.createMany()
 */
function formatViolations(rawViolations, scanId) {
    return rawViolations.map(v => {
        const rule = getRule(v.ruleId);

        return {
            scanId,

            // ── Rule identity ──────────────────────────────────────────────
            ruleId:      v.ruleId,
            wcagRef:     rule.wcagRef  ?? null,
            wcagLevel:   rule.wcagLevel ?? null,

            // ── Severity ──────────────────────────────────────────────────
            impact:      v.impact,
            impactOrder: IMPACT_ORDER[v.impact] ?? 9,  // for DB ordering

            // ── Descriptions ──────────────────────────────────────────────
            description:    v.description,
            help:           v.help            ?? rule.fixTip    ?? null,
            helpUrl:        v.helpUrl         ?? rule.helpUrl   ?? null,
            failureSummary: v.failureSummary  ?? null,

            // ── DOM location ──────────────────────────────────────────────
            pageUrl:     v.pageUrl     ?? null,
            htmlContext: v.htmlContext ?? '',
            target:      v.target      ?? '',

            // ── Fix examples from KB ───────────────────────────────────────
            badExample:  rule.badExample  ?? null,
            goodExample: rule.goodExample ?? null,
        };
    });
}

module.exports = { formatViolations };
