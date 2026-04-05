const { Queue } = require('bullmq');
const { REDIS_CONFIG, SCAN_QUEUE_NAME } = require('../config');
const { signJobPayload } = require('../../../scanner-worker/src/lib/job-signature');

/**
 * The single BullMQ Queue instance used by the API to enqueue scan jobs.
 * The scanner-worker consumes this same queue.
 */
const scanQueue = new Queue(SCAN_QUEUE_NAME, {
    connection: REDIS_CONFIG,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        // Keep a rolling window of recent jobs for debugging via Bull Board.
        removeOnComplete: { count: 200 },
        removeOnFail:     { count: 500 },
    },
});

/**
 * Enqueue a new scan job.
 *
 * @param {{ scanId: string, url: string, maxPages?: number, followLinks?: boolean, deduplicate?: boolean }} data
 * @returns {Promise<import('bullmq').Job>}
 */
async function enqueueScan(data) {
    const issuedAt = Date.now();
    const payload = { ...data, issuedAt };
    const signature = signJobPayload(payload);

    return scanQueue.add('scan', { ...payload, signature }, {
        // Use scanId as jobId so duplicate enqueues are idempotent.
        jobId: `scan:${data.scanId}`,
    });
}

module.exports = { scanQueue, enqueueScan };
