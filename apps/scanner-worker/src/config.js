/**
 * Shared configuration for the scanner-worker process.
 * Values come from environment variables with safe defaults for local dev.
 */

const REDIS_CONFIG = {
    host:     process.env.REDIS_HOST     || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

/** Name of the BullMQ queue shared between API (producer) and worker (consumer). */
const SCAN_QUEUE_NAME = 'scan-jobs';

const CRAWLER_DEFAULTS = {
    /** Maximum pages to scan per crawl job. */
    maxPages:    parseInt(process.env.CRAWLER_MAX_PAGES || '50', 10),
    /** Parallel page workers within a single crawl job. */
    parallelPages: parseInt(process.env.CRAWLER_PARALLEL_PAGES || '4', 10),
    /** Milliseconds to wait for a page to reach networkidle. */
    pageTimeout: parseInt(process.env.CRAWLER_PAGE_TIMEOUT || '30000', 10),
    /** Polite base delay between page fetches per worker. */
    requestDelayMs: parseInt(process.env.CRAWLER_REQUEST_DELAY_MS || '350', 10),
    /** Random delay added to each request to avoid bursty behaviour. */
    requestJitterMs: parseInt(process.env.CRAWLER_REQUEST_JITTER_MS || '400', 10),
    /** Cooldown period after a 403/429/CAPTCHA-like signal. */
    banCooldownMs: parseInt(process.env.CRAWLER_BAN_COOLDOWN_MS || '12000', 10),
    /** Stop the crawl after too many block/throttle signals. */
    maxBanSignals: parseInt(process.env.CRAWLER_MAX_BAN_SIGNALS || '3', 10),
    /** Maximum number of same-pattern URLs we will scan. */
    similarPatternLimit: parseInt(process.env.CRAWLER_SIMILAR_PATTERN_LIMIT || '3', 10),
    /** Higher allowance for paginated listing pages. */
    paginationPatternLimit: parseInt(process.env.CRAWLER_PAGINATION_PATTERN_LIMIT || '8', 10),
    /** If true, apply crawl-level dedup and sampling shortcuts to reduce scan cost. */
    deduplicateByDefault: process.env.CRAWLER_DEDUPLICATE_BY_DEFAULT !== 'false',
    /** User-agent string sent with every request. */
    userAgent:   'EAA-Auditor-Bot/1.0 (+https://eu-eaa-optimize.com/bot)',
    /**
     * Resource types to block.
     * Default is empty for maximum audit fidelity (no speed/cost shortcuts).
     */
    blockedResourceTypes: (process.env.CRAWLER_BLOCKED_RESOURCE_TYPES || '')
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    /** If true, axe scans iframe internals; false reduces third-party embed noise in certification mode. */
    axeIncludeIframes: process.env.WCAG_AXE_INCLUDE_IFRAMES === 'true',
    /** Conformance target used for automated rules (A, AA, AAA). */
    wcagConformanceTarget: (process.env.WCAG_CONFORMANCE_TARGET || 'AA').toUpperCase(),
};

const CONFORMANCE_TAGS = {
    A: ['wcag2a', 'wcag21a'],
    AA: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    AAA: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa'],
};

CRAWLER_DEFAULTS.wcagTags = (
    process.env.WCAG_TAGS
        ? process.env.WCAG_TAGS.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)
        : (CONFORMANCE_TAGS[CRAWLER_DEFAULTS.wcagConformanceTarget] || CONFORMANCE_TAGS.AA)
);

/** How many scan jobs the worker processes concurrently. */
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

module.exports = {
    REDIS_CONFIG,
    SCAN_QUEUE_NAME,
    CRAWLER_DEFAULTS,
    WORKER_CONCURRENCY,
};
