const { crawlAndScan } = require('./src/engine/runner');
const { calculateScore, checkCertificateEligibility } = require('./src/scoring');

const targetUrl = process.argv[2] || 'https://www.alza.cz';
const rawMaxPagesArg = process.argv[3];
const rawDeduplicateArg = process.argv[4];
const boolTokens = new Set(['true', 'false', '1', '0', 'yes', 'no', 'on', 'off']);
const rawMaxAsLower = String(rawMaxPagesArg ?? '').toLowerCase();
const maxArgLooksBoolean = boolTokens.has(rawMaxAsLower);
const parsedMaxPages = rawMaxPagesArg == null || rawMaxPagesArg === '' || maxArgLooksBoolean
    ? Number.POSITIVE_INFINITY
    : parseInt(rawMaxPagesArg, 10);
const maxPages = Number.isFinite(parsedMaxPages) && parsedMaxPages > 0
    ? parsedMaxPages
    : Number.POSITIVE_INFINITY;
const cappedScan = Number.isFinite(maxPages);
const dedupArg = rawDeduplicateArg ?? (maxArgLooksBoolean ? rawMaxPagesArg : null);
const deduplicate = dedupArg == null
    ? true
    : !['false', '0', 'no', 'off'].includes(String(dedupArg).toLowerCase());

async function run() {
    console.log(
        `\n🔍 Starting test scan: ${targetUrl}  (${cappedScan ? `max ${maxPages} pages` : 'scan all pages'}, deduplicate=${deduplicate})\n`
    );

    let totalDataSize = 0;
    let totalDiscoveredLinks = 0;
    let sampledViolations = 0;
    const startTime = Date.now();

    const result = await crawlAndScan(targetUrl, {
        maxPages,
        followLinks: maxPages > 1,
        deduplicate,
        onPageScanned: async (pageResult, pagesScannedSoFar) => {
            totalDataSize += pageResult.estimatedBytes || 0;
            totalDiscoveredLinks += pageResult.discoveredLinks || 0;
            sampledViolations += pageResult.violations.length;

            if (pagesScannedSoFar === 1 || pagesScannedSoFar % 25 === 0) {
                const elapsedSec = (Date.now() - startTime) / 1000;
                const pagesPerSec = pagesScannedSoFar / Math.max(1, elapsedSec);
                const remainingPages = cappedScan ? Math.max(0, maxPages - pagesScannedSoFar) : null;
                const etaSec = cappedScan
                    ? remainingPages / Math.max(0.01, pagesPerSec)
                    : null;
                console.log(
                    `[Progress] pages=${pagesScannedSoFar} queue-discovered≈${totalDiscoveredLinks} ` +
                    `data=${(totalDataSize / 1_000_000).toFixed(2)}MB sampled-issues=${sampledViolations} ` +
                    `elapsed=${elapsedSec.toFixed(1)}s ` +
                    `eta=${cappedScan ? `${etaSec.toFixed(1)}s` : 'n/a'}`
                );
            }
        },
    });

    if (!result.success) {
        console.error('❌ Scan failed:', result.error);
        process.exit(1);
    }

    // Group violations by impact level for a clean summary.
    const byImpact = { critical: [], serious: [], moderate: [], minor: [] };
    for (const v of result.allViolations) {
        (byImpact[v.impact] || (byImpact[v.impact] = [])).push(v);
    }

    const score       = calculateScore(result.allViolations, result.pagesScanned);
    const eligibility = checkCertificateEligibility(result.allViolations, score);

    console.log('\n══════════════════════════════════════════════════');
    console.log(` SCAN RESULTS — ${result.url}`);
    console.log('══════════════════════════════════════════════════');
    console.log(` Pages scanned : ${result.pagesScanned}`);
    if (Number.isFinite(result.htmlPagesScanned)) {
        console.log(` HTML pages    : ${result.htmlPagesScanned}`);
    }
    if (Number.isFinite(result.nonHtmlPagesSkipped)) {
        console.log(` Non-HTML skip : ${result.nonHtmlPagesSkipped}`);
    }
    if (Number.isFinite(result.pageErrors)) {
        console.log(` Page errors   : ${result.pageErrors}`);
    }
    console.log(` Total issues  : ${result.allViolations.length}`);
    if (result.deduplicate && Number.isFinite(result.allViolationsRawCount)) {
        console.log(` Raw issues    : ${result.allViolationsRawCount}`);
        console.log(` Dedup saved   : ${Math.max(0, result.allViolationsRawCount - result.allViolations.length)}`);
    }
    console.log(` Score         : ${score}/100`);
    console.log(` Certificate   : ${eligibility.eligible ? '✅ Eligible' : '❌ Not eligible — ' + eligibility.reason}`);
    console.log(` Ban signals   : ${result.banSignals || 0}`);
    console.log(` Similar-skip  : ${result.skippedSimilar || 0}`);
    if (Number.isFinite(result.skippedByExtension)) {
        console.log(` Ext-skip      : ${result.skippedByExtension}`);
    }
    if (Number.isFinite(result.skippedOffsite)) {
        console.log(` Offsite-skip  : ${result.skippedOffsite}`);
    }
    console.log('──────────────────────────────────────────────────');
    
    // COVERAGE & PERFORMANCE
    const scanDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(` Data scanned  : ${(totalDataSize / 1_000_000).toFixed(2)} MB (est.)`);
    console.log(` Duration      : ${scanDurationSec}s`);
    if (result.pagesScanned > 0 && cappedScan && maxPages >= 1000) {
        const projectedBytes = Math.round((totalDataSize / result.pagesScanned) * 1000);
        const projectedViolations = Math.round((result.allViolations.length / result.pagesScanned) * 1000);
        console.log(` 1000-page est.: ${(projectedBytes / 1_000_000).toFixed(2)} MB, ${projectedViolations} issues`);
    }
    console.log('──────────────────────────────────────────────────\n');

    if (result.consistencySummary?.topRules?.length) {
        console.log(' Top recurring rules (cross-page consistency view)');
        for (const rule of result.consistencySummary.topRules.slice(0, 5)) {
            console.log(
                `   - ${rule.ruleId}: ${rule.occurrences} occurrence(s) across ${rule.pages} page(s)`
            );
        }
        console.log();
    }

    if (result.consistencySummary?.recurringSelectors?.length) {
        console.log(' Top recurring rule+selector patterns');
        for (const pattern of result.consistencySummary.recurringSelectors.slice(0, 5)) {
            console.log(
                `   - ${pattern.ruleId} @ ${pattern.target.substring(0, 90)} ` +
                `=> ${pattern.occurrences} occurrence(s) on ${pattern.pages} page(s)`
            );
        }
        console.log();
    }

    if (Array.isArray(result.pageResults)) {
        const topPageErrors = result.pageResults
            .filter((p) => p.error)
            .slice(0, 5);
        if (topPageErrors.length) {
            console.log(' Top page errors');
            for (const err of topPageErrors) {
                console.log(`   - ${err.url} => ${err.error}`);
            }
            console.log();
        }
    }


    for (const [impact, violations] of Object.entries(byImpact)) {
        if (violations.length === 0) continue;
        const emoji = { critical: '🔴', serious: '🟠', moderate: '🟡', minor: '🔵' }[impact] || '⚪';
        console.log(`${emoji} ${impact.toUpperCase()} (${violations.length})`);

        // Show up to 3 examples per impact level to keep output readable.
        for (const v of violations.slice(0, 3)) {
            console.log(`   Rule    : ${v.ruleId}`);
            console.log(`   Page    : ${v.pageUrl}`);
            console.log(`   Element : ${v.htmlContext?.substring(0, 120)}`);
            console.log(`   Fix     : ${v.help || v.failureSummary || '—'}`);
            if (v.target) console.log(`   Selector: ${v.target}`);
            console.log();
        }
        if (violations.length > 3) {
            console.log(`   … and ${violations.length - 3} more ${impact} violations\n`);
        }
    }
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
