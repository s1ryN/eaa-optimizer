/**
 * API service configuration.
 * Both the queue (producer) side and the Prisma client read from here.
 */

const REDIS_CONFIG = {
    host:     process.env.REDIS_HOST     || 'localhost',
    port:     parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

/** Must match the queue name the scanner-worker listens on. */
const SCAN_QUEUE_NAME = 'scan-jobs';

module.exports = { REDIS_CONFIG, SCAN_QUEUE_NAME };
