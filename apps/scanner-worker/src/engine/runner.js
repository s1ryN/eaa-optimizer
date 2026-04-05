const { chromium } = require('playwright');
const { runAxeScan } = require('./axe-wrapper');
const { CRAWLER_DEFAULTS } = require('../config');

// Schemes and file extensions we never want to follow or scan.
const IGNORED_SCHEMES = /^(mailto:|tel:|javascript:|data:|#)/i;
const IGNORED_EXTENSIONS =
    /\.(pdf|zip|png|jpg|jpeg|gif|svg|webp|ico|css|js|ts|woff2?|ttf|eot|mp4|mp3|xml|json|csv|xlsx?|docx?|pptx?|rtf|odt|ods|odp)$/i;
const ALLOWED_QUERY_PARAMS = new Set(['page', 'p']);
const IGNORED_PATH_PATTERNS = [
    /\/my-account\//i,
    /\/account\//i,
    /\/login/i,
    /\/signin/i,
    /\/logout/i,
    /\/basket/i,
    /\/cart/i,
    /\/checkout/i,
    /\/privacy/i,
    /\/gdpr/i,
    /\/Order\d*\.htm/i,
    /\/compare/i,
    /\/wishlist/i,
    /\/support\//i,
    /\/help\//i,
];

function normaliseHostname(hostname) {
    return hostname.toLowerCase().replace(/^www\./, '');
}

function isSameSite(rawUrl, seedHostname) {
    try {
        const url = new URL(rawUrl);
        const hostname = normaliseHostname(url.hostname);
        return hostname === seedHostname || hostname.endsWith(`.${seedHostname}`);
    } catch {
        return false;
    }
}

function shouldSkipUrl(rawUrl, deduplicate = true) {
    if (!deduplicate) return false;
    try {
        const url = new URL(rawUrl);
        return IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname));
    } catch {
        return true;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeHtml(content = '') {
    const low = String(content).slice(0, 1500).toLowerCase();
    return low.includes('<!doctype html') || low.includes('<html');
}

function isBlockSignal(status, html = '') {
    if ([403, 429, 503].includes(status)) return true;
    const low = String(html).toLowerCase();
    return (
        low.includes('captcha') ||
        low.includes('access denied') ||
        low.includes('too many requests') ||
        low.includes('cf-chl') ||
        low.includes('verify you are human') ||
        low.includes('robot check')
    );
}

function pathPatternKey(rawUrl) {
    try {
        const u = new URL(rawUrl);
        const parts = u.pathname
            .split('/')
            .filter(Boolean)
            .map((part) => {
                const lower = part.toLowerCase();

                // Collapse product-like slugs such as "iphone-17-pro-d13078787.htm"
                // and numeric product ids like "18853613-e62.htm" to stable tokens.
                if (/\.html?$/i.test(lower)) {
                    const noExt = lower.replace(/\.html?$/i, '');
                    if (/\d{5,}/.test(noExt)) {
                        return ':item';
                    }
                    if (/-d\d+$/i.test(noExt)) {
                        return noExt.replace(/-d\d+$/i, '-d:id');
                    }
                    return noExt;
                }

                if (/^\d+$/.test(lower)) return ':id';
                if (/^[a-f0-9]{8,}$/i.test(lower)) return ':hash';
                if (/^[a-z0-9_-]{10,}$/i.test(lower) && /\d/.test(lower)) return ':slug';
                return lower;
            });

        const page = u.searchParams.get('page') || u.searchParams.get('p');
        const pagePart = page ? '?page=*' : '';
        return `${normaliseHostname(u.hostname)}/${parts.join('/')}${pagePart}`;
    } catch {
        return rawUrl;
    }
}

function isPaginationUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        return (
            u.searchParams.has('page') ||
            u.searchParams.has('p') ||
            /\/strana-\d+$/i.test(u.pathname) ||
            /\/page-\d+$/i.test(u.pathname)
        );
    } catch {
        return false;
    }
}

/**
 * Normalise a URL for deduplication:
 *  - Remove fragment (#section) — same page regardless of anchor
 *  - Remove trailing slash on non-root paths
 *  - Lowercase scheme + host (paths are case-sensitive by spec, keep as-is)
 *  - Strip query string for dedup but keep full URL for actual navigation
 */
function normaliseUrl(rawUrl, deduplicate = true) {
    try {
        const u = new URL(rawUrl);
        u.hash = '';
        u.hostname = normaliseHostname(u.hostname);
        if (u.pathname !== '/' && u.pathname.endsWith('/')) {
            u.pathname = u.pathname.slice(0, -1);
        }

        if (deduplicate) {
            // Cost-optimized mode strips tracking/filter noise while keeping true pagination.
            const keptParams = new URLSearchParams();
            for (const [key, value] of u.searchParams.entries()) {
                if (ALLOWED_QUERY_PARAMS.has(key.toLowerCase())) {
                    keptParams.append(key, value);
                }
            }

            const query = keptParams.toString();
            return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${u.pathname}${query ? `?${query}` : ''}`;
        }

        // Full-fidelity mode keeps full query string but normalizes key ordering.
        const sortedParams = new URLSearchParams(Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b)));
        const query = sortedParams.toString();
        return `${u.protocol.toLowerCase()}//${u.host.toLowerCase()}${u.pathname}${query ? `?${query}` : ''}`;
    } catch {
        return rawUrl;
    }
}

function normalizeViolationValue(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function siteViolationPatternKey(violation) {
    const rule = normalizeViolationValue(violation.ruleId);
    const impact = normalizeViolationValue(violation.impact);
    const target = normalizeViolationValue(violation.target);
    const html = normalizeViolationValue(violation.htmlContext).slice(0, 220);
    const summary = normalizeViolationValue(violation.failureSummary).slice(0, 220);
    return `${rule}||${impact}||${target}||${html}||${summary}`;
}

function dedupeSiteViolations(violations) {
    const index = new Map();
    const deduped = [];

    for (const violation of violations) {
        const key = siteViolationPatternKey(violation);
        const existing = index.get(key);
        if (!existing) {
            const base = {
                ...violation,
                occurrences: 1,
                repeatedOnPages: [],
            };
            index.set(key, base);
            deduped.push(base);
            continue;
        }

        existing.occurrences += 1;
        if (
            violation.pageUrl &&
            violation.pageUrl !== existing.pageUrl &&
            !existing.repeatedOnPages.includes(violation.pageUrl)
        ) {
            existing.repeatedOnPages.push(violation.pageUrl);
        }
    }

    return deduped;
}

function buildConsistencySummary(violations) {
    const perRule = new Map();
    const perRuleTarget = new Map();

    for (const v of violations) {
        const rule = String(v.ruleId || 'unknown');
        const page = String(v.pageUrl || '');
        const target = String(v.target || '').trim() || '(no-target)';
        const impact = String(v.impact || 'unknown');

        if (!perRule.has(rule)) {
            perRule.set(rule, {
                ruleId: rule,
                occurrences: 0,
                pages: new Set(),
                impacts: new Set(),
            });
        }
        const r = perRule.get(rule);
        r.occurrences += 1;
        if (page) r.pages.add(page);
        if (impact) r.impacts.add(impact);

        const rtKey = `${rule}||${target}`;
        if (!perRuleTarget.has(rtKey)) {
            perRuleTarget.set(rtKey, {
                ruleId: rule,
                target,
                occurrences: 0,
                pages: new Set(),
            });
        }
        const rt = perRuleTarget.get(rtKey);
        rt.occurrences += 1;
        if (page) rt.pages.add(page);
    }

    const topRules = Array.from(perRule.values())
        .map((entry) => ({
            ruleId: entry.ruleId,
            occurrences: entry.occurrences,
            pages: entry.pages.size,
            impacts: Array.from(entry.impacts),
        }))
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 10);

    const recurringSelectors = Array.from(perRuleTarget.values())
        .map((entry) => ({
            ruleId: entry.ruleId,
            target: entry.target,
            occurrences: entry.occurrences,
            pages: entry.pages.size,
        }))
        .filter((entry) => entry.pages > 1)
        .sort((a, b) => b.pages - a.pages || b.occurrences - a.occurrences)
        .slice(0, 10);

    return {
        topRules,
        recurringSelectors,
    };
}

/**
 * Return all same-origin <a href> links found on the current page.
 * Runs inside the browser context so it has access to the resolved href.
 * Enhanced to find links in hidden elements, data attributes, and dynamically loaded content.
 *
 * @param {import('playwright').Page} page
 * @param {string} seedHostname - e.g. "example.com"
 * @returns {Promise<string[]>}
 */
async function discoverLinks(page, seedHostname) {
    try {
        return await page.evaluate((seedHostname) => {
            const links = new Set();
            const normaliseHostname = (hostname) => hostname.toLowerCase().replace(/^www\./, '');
            const isSameSite = (href) => {
                try {
                    const url = new URL(href, window.location.href);
                    const hostname = normaliseHostname(url.hostname);
                    return hostname === seedHostname || hostname.endsWith(`.${seedHostname}`);
                } catch {
                    return false;
                }
            };
            
            for (const a of document.querySelectorAll('a[href]')) {
                const href = a.href;
                if (href && isSameSite(href)) links.add(href);
            }
            
            for (const elem of document.querySelectorAll('[data-href]')) {
                const href = elem.getAttribute('data-href');
                if (href) {
                    try {
                        const url = new URL(href, window.location.href).href;
                        if (isSameSite(url)) links.add(url);
                    } catch { /* skip malformed */ }
                }
            }
            
            for (const elem of document.querySelectorAll('[onclick*="href"], [onclick*="navigate"], [onclick*="location"]')) {
                const onclick = elem.getAttribute('onclick');
                const match = onclick?.match(/([A-Za-z0-9_:\/\-.?=&%#]+(?:\.html|\.htm|\/|[A-Za-z0-9\-_/]+))/);
                if (match?.[1]) {
                    try {
                        const url = new URL(match[1].replace(/['";]/g, ''), window.location.href).href;
                        if (isSameSite(url)) links.add(url);
                    } catch { /* skip malformed */ }
                }
            }
            
            for (const paginationLink of document.querySelectorAll('[rel="next"], [rel="prev"], .pagination a, .pager a')) {
                const href = paginationLink.href;
                if (href && isSameSite(href)) links.add(href);
            }

            return Array.from(links).slice(0, 500); // Cap at 500 discovered links to avoid explosion
        }, seedHostname);
    } catch (err) {
        console.warn(`Link discovery error: ${err.message}`);
        return [];
    }
}

async function discoverSitemapLinks(origin, seedHostname) {
    const sitemapCandidates = [
        `${origin}/sitemap.xml`,
        `${origin}/sitemap_index.xml`,
        `${origin}/sitemap-index.xml`,
    ];

    const links = new Set();

    for (const sitemapUrl of sitemapCandidates) {
        try {
            const response = await fetch(sitemapUrl, {
                method: 'GET',
                headers: { 'User-Agent': CRAWLER_DEFAULTS.userAgent },
            });
            if (!response.ok) continue;

            const body = await response.text();
            const locMatches = body.match(/<loc>\s*([^<\s]+)\s*<\/loc>/gi) || [];
            for (const match of locMatches) {
                const urlMatch = match.match(/<loc>\s*([^<\s]+)\s*<\/loc>/i);
                const candidate = urlMatch?.[1];
                if (!candidate) continue;
                if (isSameSite(candidate, seedHostname)) {
                    links.add(candidate);
                }
            }

            if (links.size > 0) {
                return Array.from(links).slice(0, 2000);
            }
        } catch {
            // Continue with next known sitemap location.
        }
    }

    return [];
}

/**
 * Crawl a website with BFS and run a WCAG axe scan on every discovered page.
 *
 * @param {string} seedUrl        - Starting URL (must include protocol)
 * @param {object} [options]
 * @param {number} [options.maxPages=50]        - Hard cap on pages to scan
 * @param {boolean} [options.followLinks=true]  - Set false to scan seed only
 * @param {function} [options.onPageScanned]    - Async callback(pageResult, pagesScannedSoFar)
 * @returns {Promise<ScanResult>}
 *
 * @typedef {object} ScanResult
 * @property {boolean} success
 * @property {string}  url           - Seed URL
 * @property {number}  pagesScanned
 * @property {Array}   pageResults   - Per-page scan outcomes
 * @property {Array}   allViolations - Flat list; each item includes pageUrl
 * @property {string}  [error]       - Set when success===false
 */
async function crawlAndScan(seedUrl, options = {}) {
    const {
        maxPages       = CRAWLER_DEFAULTS.maxPages,
        followLinks    = true,
        parallelPages  = CRAWLER_DEFAULTS.parallelPages,
        deduplicate    = CRAWLER_DEFAULTS.deduplicateByDefault,
        onPageScanned = null,
    } = options;
    const cappedScan = Number.isFinite(maxPages) && maxPages > 0;
    const pageCap = cappedScan ? maxPages : Infinity;

    let origin;
    let seedHostname;
    try {
        const parsedSeed = new URL(seedUrl);
        origin = parsedSeed.origin;
        seedHostname = normaliseHostname(parsedSeed.hostname);
    } catch (e) {
        return { success: false, url: seedUrl, error: `Invalid URL: ${e.message}`, allViolations: [] };
    }

    const visited = new Set();        // successfully processed URLs
    const queued = new Set();         // URLs waiting in queue
    const inFlight = new Set();       // currently scanned URLs
    const queue = [];                 // FIFO work queue
    const pageResults = [];
    const retries = new Map();
    const patternCounts = new Map();
    let stopEarly = false;
    let completedPages = 0;
    let startedPages = 0;
    let banSignals = 0;
    let cooldownUntil = 0;
    let skippedSimilar = 0;
    let sitemapFallbackUsed = false;
    let skippedByScheme = 0;
    let skippedByExtension = 0;
    let skippedOffsite = 0;

    async function seedFromSitemapIfNeeded() {
        if (sitemapFallbackUsed || !followLinks) return;
        const sitemapLinks = await discoverSitemapLinks(origin, seedHostname);
        if (sitemapLinks.length <= 0) return;

        sitemapFallbackUsed = true;
        let queuedCount = 0;
        for (const link of sitemapLinks) {
            if (enqueue(link)) queuedCount += 1;
        }

        console.log(`[Runner] Sitemap fallback seeded ${queuedCount} links`);
    }

    function enqueue(url) {
        const key = normaliseUrl(url, deduplicate);
        if (visited.has(key) || queued.has(key) || inFlight.has(key)) return false;

        if (shouldSkipUrl(url, deduplicate)) return false;

        if (deduplicate) {
            const pattern = pathPatternKey(url);
            const current = patternCounts.get(pattern) || 0;
            const limit = isPaginationUrl(url)
                ? CRAWLER_DEFAULTS.paginationPatternLimit
                : CRAWLER_DEFAULTS.similarPatternLimit;

            if (current >= limit) {
                skippedSimilar += 1;
                return false;
            }

            patternCounts.set(pattern, current + 1);
        }
        queue.push(url);
        queued.add(key);
        return true;
    }

    enqueue(seedUrl);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport:  { width: 1280, height: 720 },
        userAgent: CRAWLER_DEFAULTS.userAgent,
    });

    // Reduce bandwidth and processing cost by skipping heavy assets that are
    // not required for structural WCAG checks (DOM/ARIA/forms/labels).
    const blockedTypes = new Set(CRAWLER_DEFAULTS.blockedResourceTypes || []);
    await context.route('**/*', async (route) => {
        const request = route.request();
        const type = request.resourceType().toLowerCase();
        if (blockedTypes.has(type)) {
            await route.abort();
            return;
        }
        await route.continue();
    });

    console.log(
        `[Runner] Crawl starting — seed: ${seedUrl}  max: ${cappedScan ? `${maxPages} pages` : 'all pages'}  parallel: ${parallelPages}  deduplicate: ${deduplicate}`
    );

    function dequeue() {
        if (stopEarly) return null;
        // Hard guard against parallel overshoot:
        // inFlight pages already reserved should count toward the max cap.
        if (cappedScan && (completedPages + inFlight.size) >= pageCap) return null;
        while (queue.length > 0) {
            const url = queue.shift();
            const key = normaliseUrl(url, deduplicate);
            queued.delete(key);

            if (IGNORED_SCHEMES.test(url)) {
                skippedByScheme += 1;
                continue;
            }
            if (!isSameSite(url, seedHostname)) {
                skippedOffsite += 1;
                continue;
            }

            let pathname;
            try {
                pathname = new URL(url).pathname;
            } catch {
                continue;
            }
            if (IGNORED_EXTENSIONS.test(pathname)) {
                skippedByExtension += 1;
                continue;
            }
            if (visited.has(key) || inFlight.has(key)) continue;

            if (cappedScan && (completedPages + inFlight.size) >= pageCap) {
                return null;
            }

            inFlight.add(key);
            return { url, key };
        }
        return null;
    }

    try {
        async function workerLoop(workerId) {
            while (!stopEarly) {
                if (Date.now() < cooldownUntil) {
                    await sleep(cooldownUntil - Date.now());
                }

                const next = dequeue();
                if (!next) {
                    if (inFlight.size === 0) break;
                    await sleep(100);
                    continue;
                }

                const { url: currentUrl, key } = next;
                startedPages += 1;
                console.log(
                    `[Runner/W${workerId}] [${startedPages}/${cappedScan ? pageCap : 'ALL'}] ${currentUrl}`
                );

                const page = await context.newPage();
                const pageResult = {
                    url: currentUrl,
                    violations: [],
                    passes: 0,
                    incomplete: 0,
                    isHtml: false,
                    error: null,
                    estimatedBytes: 0,
                    discoveredLinks: 0,
                    blockSignal: false,
                };

                try {
                    const delay = CRAWLER_DEFAULTS.requestDelayMs + Math.floor(Math.random() * CRAWLER_DEFAULTS.requestJitterMs);
                    await sleep(delay);

                    const response = await page.goto(currentUrl, {
                        waitUntil: 'networkidle',
                        timeout: CRAWLER_DEFAULTS.pageTimeout,
                    });

                    const html = await page.content();
                    const contentType = response?.headers()?.['content-type'] || '';
                    const contentTypeLooksHtml = /text\/html|application\/xhtml\+xml/i.test(contentType);
                    if (response && contentType && !contentTypeLooksHtml && !looksLikeHtml(html)) {
                        pageResult.error = `Skipped non-HTML content type: ${contentType}`;
                        if (completedPages === 0) {
                            await seedFromSitemapIfNeeded();
                            pageResult.discoveredLinks = queue.length;
                        }
                        visited.add(key);
                        pageResults.push(pageResult);
                        completedPages += 1;
                        continue;
                    }

                    pageResult.isHtml = true;

                    const status = response ? response.status() : 200;

                    if (isBlockSignal(status, html)) {
                        pageResult.blockSignal = true;
                        pageResult.error = `Block/throttle detected (status ${status})`;
                        banSignals += 1;
                        cooldownUntil = Date.now() + CRAWLER_DEFAULTS.banCooldownMs;

                        const attempt = (retries.get(key) || 0) + 1;
                        retries.set(key, attempt);
                        if (attempt <= 2) {
                            // Requeue blocked URL at the end, as requested.
                            queued.delete(key);
                            inFlight.delete(key);
                            queue.push(currentUrl);
                            queued.add(key);
                        } else {
                            visited.add(key);
                        }

                        if (banSignals >= CRAWLER_DEFAULTS.maxBanSignals) {
                            stopEarly = true;
                        }
                    } else {
                        const axeResults = await runAxeScan(page);
                        pageResult.violations = axeResults.violations;
                        pageResult.passes = axeResults.passes;
                        pageResult.incomplete = axeResults.incomplete;
                        pageResult.estimatedBytes = Buffer.byteLength(html, 'utf8') + (pageResult.violations.length * 2000);

                        if (followLinks && (!cappedScan || completedPages < pageCap)) {
                            const links = await discoverLinks(page, seedHostname);
                            pageResult.discoveredLinks = links.length;
                            for (const link of links) {
                                enqueue(link);
                            }

                            if (!sitemapFallbackUsed && completedPages === 0 && links.length === 0) {
                                await seedFromSitemapIfNeeded();
                                pageResult.discoveredLinks = queue.length;
                            }
                        }

                        visited.add(key);
                    }
                } catch (pageError) {
                    pageResult.error = pageError.message;
                    if (completedPages === 0) {
                        await seedFromSitemapIfNeeded();
                        pageResult.discoveredLinks = queue.length;
                    }
                    visited.add(key);
                } finally {
                    inFlight.delete(key);
                    await page.close();
                }

                pageResults.push(pageResult);
                completedPages += 1;

                if (typeof onPageScanned === 'function') {
                    await onPageScanned(pageResult, completedPages);
                }

                if (cappedScan && completedPages >= pageCap) {
                    stopEarly = true;
                }
            }
        }

        const workerCount = Math.max(1, parallelPages);
        await Promise.all(Array.from({ length: workerCount }, (_, i) => workerLoop(i + 1)));
    } finally {
        await browser.close();
    }

    // Attach the source pageUrl to every violation so the formatter can store it.
    const allViolationsRaw = pageResults.flatMap(r =>
        r.violations.map(v => ({ ...v, pageUrl: r.url }))
    );
    const allViolations = deduplicate
        ? dedupeSiteViolations(allViolationsRaw)
        : allViolationsRaw;
    const consistencySummary = buildConsistencySummary(allViolationsRaw);

    const htmlPagesScanned = pageResults.filter((p) => p.isHtml).length;
    const nonHtmlPagesSkipped = pageResults.filter((p) => !p.isHtml && (p.error || '').startsWith('Skipped non-HTML content type')).length;
    const pageErrors = pageResults.filter((p) => p.error && !(p.error || '').startsWith('Skipped non-HTML content type')).length;

    console.log(
        `[Runner] Done — pages: ${completedPages}  violations: ${allViolations.length}` +
        (deduplicate ? ` (raw ${allViolationsRaw.length})` : '')
    );

    return {
        success:      true,
        url:          seedUrl,
        pagesScanned: completedPages,
        pageResults,
        allViolations,
        allViolationsRawCount: allViolationsRaw.length,
        consistencySummary,
        htmlPagesScanned,
        nonHtmlPagesSkipped,
        pageErrors,
        queueLeft: queue.length,
        banSignals,
        skippedSimilar,
        skippedByScheme,
        skippedByExtension,
        skippedOffsite,
        deduplicate,
        sitemapFallbackUsed,
    };
}

module.exports = { crawlAndScan };