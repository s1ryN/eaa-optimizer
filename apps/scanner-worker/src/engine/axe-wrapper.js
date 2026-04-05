const { AxeBuilder } = require('@axe-core/playwright');
const { CRAWLER_DEFAULTS } = require('../config');

function normalizeForKey(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function toViolationKey(violation) {
    const rule = normalizeForKey(violation.ruleId);
    const impact = normalizeForKey(violation.impact);
    const target = normalizeForKey(violation.target);
    const html = normalizeForKey(violation.htmlContext).slice(0, 250);
    const summary = normalizeForKey(violation.failureSummary).slice(0, 250);
    return `${rule}||${impact}||${target}||${html}||${summary}`;
}

function dedupeViolations(violations) {
    const seen = new Set();
    const unique = [];

    for (const v of violations) {
        const key = toViolationKey(v);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(v);
    }

    return unique;
}

async function runCustomChecks(page) {
    const findings = await page.evaluate(() => {
        function getAccessibleName(el) {
            const ariaLabel = (el.getAttribute('aria-label') || '').trim();
            if (ariaLabel) return ariaLabel;

            const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();
            if (labelledBy) {
                const text = labelledBy
                    .split(/\s+/)
                    .map((id) => document.getElementById(id))
                    .filter(Boolean)
                    .map((node) => node.textContent || '')
                    .join(' ')
                    .trim();
                if (text) return text;
            }

            const title = (el.getAttribute('title') || '').trim();
            if (title) return title;

            return (el.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function shortHtml(el) {
            return (el.outerHTML || '').slice(0, 500);
        }

        function targetSelector(el) {
            if (el.id) return `#${el.id}`;
            const cls = (el.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 3);
            if (cls.length) return `${el.tagName.toLowerCase()}.${cls.join('.')}`;
            return el.tagName.toLowerCase();
        }

        const issues = [];

        // 2A: Icon-only button labels
        const buttonCandidates = document.querySelectorAll('button, [role="button"]');
        for (const el of buttonCandidates) {
            const hasIconChild = !!el.querySelector('svg, i, img');
            if (!hasIconChild) continue;

            const hasName = !!getAccessibleName(el);
            if (!hasName) {
                issues.push({
                    ruleId: 'custom-icon-button-name',
                    impact: 'critical',
                    description: 'Icon-only button has no accessible name.',
                    help: 'Add aria-label, aria-labelledby, or screen-reader text.',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
                    htmlContext: shortHtml(el),
                    target: targetSelector(el),
                    failureSummary: 'Icon-only controls must expose a programmatic name (WCAG 4.1.2).',
                });
            }
        }

        // 2A: Unlabeled listbox/toggle widgets (common carousel and accordion issues)
        const widgetCandidates = document.querySelectorAll(
            '[role="listbox"], [role="tablist"], [role="switch"], [role="checkbox"], [aria-expanded]'
        );
        for (const el of widgetCandidates) {
            const hasName = !!getAccessibleName(el);
            if (!hasName) {
                issues.push({
                    ruleId: 'custom-widget-accessible-name',
                    impact: 'serious',
                    description: 'Interactive widget is missing an accessible name.',
                    help: 'Add aria-label/aria-labelledby and ensure control purpose is announced by assistive tech.',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
                    htmlContext: shortHtml(el),
                    target: targetSelector(el),
                    failureSummary: 'Interactive role/state must have a discernible accessible name (WCAG 4.1.2).',
                });
            }
        }

        // 2C: Media track presence (partial check for 1.2.x)
        const videos = document.querySelectorAll('video');
        for (const video of videos) {
            const hasCaptions = !!video.querySelector('track[kind="captions"], track[kind="subtitles"]');
            const hasDescriptions = !!video.querySelector('track[kind="descriptions"]');
            if (!hasCaptions) {
                issues.push({
                    ruleId: 'custom-video-captions-track',
                    impact: 'serious',
                    description: 'Video element has no captions/subtitles track.',
                    help: 'Provide a <track kind="captions"> or <track kind="subtitles"> for prerecorded media.',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/captions-prerecorded.html',
                    htmlContext: shortHtml(video),
                    target: targetSelector(video),
                    failureSummary: 'Prerecorded synchronized media should provide captions support (WCAG 1.2.2 partial automation).',
                });
            }

            if (!hasDescriptions) {
                issues.push({
                    ruleId: 'custom-video-audio-description-track',
                    impact: 'moderate',
                    description: 'Video element has no descriptions track for audio description support.',
                    help: 'Provide a <track kind="descriptions"> or equivalent media alternative for prerecorded video content.',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-description-prerecorded.html',
                    htmlContext: shortHtml(video),
                    target: targetSelector(video),
                    failureSummary: 'Prerecorded video should provide audio description support (WCAG 1.2.5 partial automation).',
                });
            }
        }

        const mediaFrames = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"], iframe[src*="vimeo.com"]');
        for (const frame of mediaFrames) {
            issues.push({
                ruleId: 'custom-iframe-media-manual-review',
                impact: 'moderate',
                description: 'Embedded media iframe detected; captions/audio descriptions require manual verification.',
                help: 'Verify captions and audio descriptions in embedded media player settings/content.',
                helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/time-based-media.html',
                htmlContext: shortHtml(frame),
                target: targetSelector(frame),
                failureSummary: 'Embedded players require manual media accessibility review (WCAG 1.2.x).',
            });
        }

        // 2A: Form field association checks
        const formFields = document.querySelectorAll('input, textarea, select');
        for (const field of formFields) {
            const tag = field.tagName.toLowerCase();
            const type = (field.getAttribute('type') || '').toLowerCase();
            if (tag === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;

            const id = field.getAttribute('id');
            const hasForLabel = !!(id && Array.from(document.querySelectorAll('label[for]')).some((l) => l.getAttribute('for') === id));
            const wrappedByLabel = !!field.closest('label');
            const hasAriaLabel = !!(field.getAttribute('aria-label') || '').trim();
            const hasAriaLabelledBy = !!(field.getAttribute('aria-labelledby') || '').trim();
            const hasPlaceholder = !!(field.getAttribute('placeholder') || '').trim();
            const hasAnyLabel = hasForLabel || wrappedByLabel || hasAriaLabel || hasAriaLabelledBy;

            if (!hasAnyLabel) {
                issues.push({
                    ruleId: 'custom-form-field-missing-label',
                    impact: 'serious',
                    description: 'Form field has no associated label.',
                    help: 'Associate a <label for="..."> or provide aria-label/aria-labelledby.',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
                    htmlContext: shortHtml(field),
                    target: targetSelector(field),
                    failureSummary: 'Inputs require programmatic labels (WCAG 3.3.2 / 4.1.2).',
                });
            }

            if (!hasForLabel && !wrappedByLabel && hasAriaLabel && !hasPlaceholder) {
                issues.push({
                    ruleId: 'custom-form-field-aria-label-only',
                    impact: 'moderate',
                    description: 'Form field relies only on aria-label without visible label context.',
                    help: 'Prefer visible labels connected with <label for="..."> for better usability and consistency.',
                    helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
                    htmlContext: shortHtml(field),
                    target: targetSelector(field),
                    failureSummary: 'Aria-only labels can reduce visible context; use associated visible labels where possible.',
                });
            }
        }

        // 2A: Motion event and reduced-motion checks
        const scriptBodies = Array.from(document.querySelectorAll('script'))
            .map((s) => s.textContent || '')
            .join('\n')
            .toLowerCase();
        const hasDeviceMotionListeners =
            scriptBodies.includes('devicemotion') ||
            scriptBodies.includes('deviceorientation');
        const hasReducedMotionStyles = Array.from(document.styleSheets || []).some((sheet) => {
            try {
                return Array.from(sheet.cssRules || []).some((rule) => {
                    return rule.media && String(rule.media.mediaText || '').toLowerCase().includes('prefers-reduced-motion');
                });
            } catch {
                return false;
            }
        });

        if (hasDeviceMotionListeners && !hasReducedMotionStyles) {
            issues.push({
                ruleId: 'custom-motion-without-reduced-motion',
                impact: 'serious',
                description: 'Motion/device-orientation handling detected without prefers-reduced-motion fallback styles.',
                help: 'Support reduced-motion users and provide non-motion alternatives for motion-triggered interactions.',
                helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/motion-actuation.html',
                htmlContext: '<script>/* motion event handlers detected */</script>',
                target: 'script',
                failureSummary: 'Motion-based interactions should provide alternatives and reduced-motion support (WCAG 2.5.4).',
            });
        }

        return issues;
    });

    return findings;
}

/**
 * Runs axe-core WCAG 2.1 analysis on a Playwright page.
 * Returns one record per failing node so every HTML element can be shown
 * individually in the report.
 *
 * @param {import('playwright').Page} page
 * @returns {{ violations: Array, passes: number, incomplete: number }}
 */
async function runAxeScan(page) {
    const axeBuilder = new AxeBuilder({ page })
        .withTags(CRAWLER_DEFAULTS.wcagTags);

    if (!CRAWLER_DEFAULTS.axeIncludeIframes) {
        // @axe-core/playwright does not expose disableIframeTesting in this version;
        // legacy mode avoids cross-origin frame partial execution noise.
        axeBuilder.setLegacyMode(true);
    }

    const results = await axeBuilder.analyze();
    const customFindings = await runCustomChecks(page);

    // One record per failing DOM node (not per rule), so we can show exact
    // HTML context and a precise fix tip for every element in the report.
    const violations = [];

    for (const violation of results.violations) {
        for (const node of violation.nodes) {
            // node.target is an array of CSS selector strings (or nested arrays
            // for iframes). Flatten to a single readable selector string.
            const target = Array.isArray(node.target)
                ? node.target
                      .map(t => (Array.isArray(t) ? t.join(' > ') : String(t)))
                      .join(', ')
                : String(node.target);

            violations.push({
                ruleId:          violation.id,
                impact:          violation.impact,
                description:     violation.description,
                help:            violation.help,           // short fix description
                helpUrl:         violation.helpUrl,        // link to Deque docs
                htmlContext:     node.html,                // exact failing HTML snippet
                target,                                   // CSS selector path
                failureSummary:  node.failureSummary || null, // "Fix any of: ..."
            });
        }
    }

    const hasEquivalentAxeFinding = (customFinding) => {
        if (customFinding.ruleId !== 'custom-icon-button-name') return false;

        return violations.some((v) => {
            if (!(v.ruleId === 'button-name' || v.ruleId === 'input-button-name')) return false;
            const sameTarget = (v.target || '') === (customFinding.target || '');
            const sameHtml = (v.htmlContext || '') === (customFinding.htmlContext || '');
            return sameTarget || sameHtml;
        });
    };

    for (const finding of customFindings) {
        if (hasEquivalentAxeFinding(finding)) continue;
        violations.push(finding);
    }

    const dedupedViolations = dedupeViolations(violations);

    return {
        violations: dedupedViolations,
        passes:      results.passes.length,
        incomplete:  results.incomplete.length,
        inapplicable: results.inapplicable.length,
    };
}

module.exports = { runAxeScan };