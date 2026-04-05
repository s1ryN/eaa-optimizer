const WINDOW_MS = parseInt(process.env.ABUSE_WINDOW_MS || '60000', 10);
const MAX_REQUESTS_PER_IP = parseInt(process.env.ABUSE_MAX_REQUESTS_PER_IP || '30', 10);
const MAX_REQUESTS_PER_HOST = parseInt(process.env.ABUSE_MAX_REQUESTS_PER_HOST || '20', 10);
const ALERT_WEBHOOK_URL = process.env.ABUSE_ALERT_WEBHOOK_URL || '';

const ipBuckets = new Map();
const hostBuckets = new Map();

function pruneOldEntries(bucket, now) {
    while (bucket.length && (now - bucket[0]) > WINDOW_MS) {
        bucket.shift();
    }
}

function pushEvent(map, key, now) {
    const bucket = map.get(key) || [];
    pruneOldEntries(bucket, now);
    bucket.push(now);
    map.set(key, bucket);
    return bucket.length;
}

function shouldThrottleScanAttempt({ ip, hostname }) {
    const now = Date.now();
    const ipCount = pushEvent(ipBuckets, ip || 'unknown', now);
    const hostCount = pushEvent(hostBuckets, hostname || 'unknown', now);

    const throttled = ipCount > MAX_REQUESTS_PER_IP || hostCount > MAX_REQUESTS_PER_HOST;

    return {
        throttled,
        ipCount,
        hostCount,
        limits: {
            maxPerIp: MAX_REQUESTS_PER_IP,
            maxPerHost: MAX_REQUESTS_PER_HOST,
            windowMs: WINDOW_MS,
        },
    };
}

async function sendAbuseAlert(event) {
    if (!ALERT_WEBHOOK_URL) return;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);

        await fetch(ALERT_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                type: 'abuse-throttle',
                timestamp: new Date().toISOString(),
                ...event,
            }),
            signal: controller.signal,
        });

        clearTimeout(timer);
    } catch {
        // Alert transport should never break request handling.
    }
}

module.exports = {
    shouldThrottleScanAttempt,
    sendAbuseAlert,
};
