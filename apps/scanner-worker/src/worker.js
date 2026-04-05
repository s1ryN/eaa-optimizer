/**
 * Scanner Worker
 * ══════════════
 * BullMQ consumer that processes WCAG scan jobs enqueued by the API.
 *
 * Job payload shape:
 *   { scanId: string, url: string, maxPages?: number, followLinks?: boolean, deduplicate?: boolean }
 *
 * Lifecycle:
 *   1. Mark Scan as RUNNING
 *   2. BFS-crawl the site with Playwright + axe-core
 *   3. Format violations and persist to DB
 *   4. Calculate score
 *   5. Mark Scan as COMPLETED (or FAILED on error)
 */

const { Worker } = require('bullmq');

const { crawlAndScan }      = require('./engine/runner');
const { formatViolations }  = require('./formatters/violation');
const { calculateScore }    = require('./scoring');
const { prisma }             = require('./lib/db');
const { verifyJobPayload }   = require('./lib/job-signature');
const { REDIS_CONFIG, SCAN_QUEUE_NAME, WORKER_CONCURRENCY } = require('./config');

if (process.env.NODE_ENV === 'production' && !process.env.JOB_SIGNING_SECRET) {
    throw new Error('JOB_SIGNING_SECRET must be set in production for worker queue signature verification.');
}

// ── Job handler ──────────────────────────────────────────────────────────────

async function processScanJob(job) {
    const {
        scanId,
        url,
        maxPages    = null,
        parallelPages = 4,
        followLinks = true,
        deduplicate = true,
        issuedAt,
        signature,
    } = job.data;

    const validSignature = verifyJobPayload(
        { scanId, url, maxPages, parallelPages, followLinks, deduplicate, issuedAt },
        signature
    );
    if (!validSignature) {
        throw new Error('Invalid or expired queue job signature.');
    }

    const safeParallelPages = Math.min(12, Math.max(1, parseInt(parallelPages, 10) || 4));
    const safeFollowLinks = followLinks !== false;
    const safeDeduplicate = deduplicate !== false;

    const cappedScan = Number.isFinite(maxPages) && maxPages > 0;
    const pageCap = cappedScan ? maxPages : null;

    console.log(`[Worker] Job ${job.id} — scan ${scanId} — ${url}`);

    // 1. Mark scan as in-progress so the API can reflect this immediately.
    await prisma.scan.update({
        where: { id: scanId },
        data:  { status: 'RUNNING' },
    });

    // 2. BFS crawl + axe analysis.
    const crawlResult = await crawlAndScan(url, {
        maxPages: pageCap,
        parallelPages: safeParallelPages,
        followLinks: safeFollowLinks,
        deduplicate: safeDeduplicate,
        onPageScanned: async (_page, pagesScannedSoFar) => {
            // Update BullMQ progress (0-100) so the API can stream progress.
            const pct = cappedScan
                ? Math.min(99, Math.round((pagesScannedSoFar / pageCap) * 100))
                : 50;
            await job.updateProgress(pct);
        },
    });

    if (!crawlResult.success) {
        throw new Error(crawlResult.error ?? 'Crawl returned success=false');
    }

    // 3. Format raw violations into Prisma records, enriched with KB data.
    const violationRecords = formatViolations(crawlResult.allViolations, scanId);

    // 4. Calculate accessibility score.
    const score = calculateScore(crawlResult.allViolations, crawlResult.pagesScanned);

    // 5. Persist violations + update scan in a single transaction.
    await prisma.$transaction([
        prisma.violation.createMany({
            data:           violationRecords,
            skipDuplicates: true,
        }),
        prisma.scan.update({
            where: { id: scanId },
            data: {
                status:       'COMPLETED',
                score,
                pagesScanned: crawlResult.pagesScanned,
                finishedAt:   new Date(),
            },
        }),
    ]);

    await job.updateProgress(100);

    console.log(
        `[Worker] Scan ${scanId} done — ` +
        `pages: ${crawlResult.pagesScanned}  ` +
        `violations: ${violationRecords.length}  ` +
        `score: ${score}`
    );

    return {
        scanId,
        score,
        pagesScanned:    crawlResult.pagesScanned,
        violationsFound: violationRecords.length,
    };
}

// ── Worker instance ──────────────────────────────────────────────────────────

const worker = new Worker(SCAN_QUEUE_NAME, processScanJob, {
    connection:  REDIS_CONFIG,
    concurrency: WORKER_CONCURRENCY,
});

worker.on('completed', (job, result) => {
    console.log(`[Worker] ✓ Job ${job.id} completed`, result);
});

worker.on('failed', async (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} failed: ${err.message}`);

    // Mark the scan as FAILED so the API can surface the error.
    const scanId = job?.data?.scanId;
    if (scanId) {
        await prisma.scan.update({
            where: { id: scanId },
            data:  { status: 'FAILED', finishedAt: new Date() },
        }).catch(() => { /* ignore if scan row is gone */ });
    }
});

worker.on('error', (err) => {
    console.error('[Worker] Worker-level error:', err);
});

console.log(`[Worker] Listening on queue "${SCAN_QUEUE_NAME}" (concurrency: ${WORKER_CONCURRENCY})`);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal) {
    console.log(`[Worker] ${signal} received — shutting down gracefully...`);
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = { worker };
