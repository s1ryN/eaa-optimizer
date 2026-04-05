const crypto = require('node:crypto');

const DEFAULT_MAX_AGE_MS = parseInt(process.env.JOB_SIGNATURE_MAX_AGE_MS || '300000', 10);

function getSecret() {
    const secret = process.env.JOB_SIGNING_SECRET || '';
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JOB_SIGNING_SECRET must be set in production.');
    }
    return secret;
}

function canonicalPayload(jobData) {
    const normalized = {
        scanId: jobData.scanId,
        url: jobData.url,
        maxPages: jobData.maxPages ?? null,
        parallelPages: jobData.parallelPages ?? null,
        followLinks: jobData.followLinks ?? true,
        deduplicate: jobData.deduplicate ?? true,
        issuedAt: jobData.issuedAt,
    };
    return JSON.stringify(normalized);
}

function signJobPayload(jobData) {
    const secret = getSecret();
    if (!secret) return null;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(canonicalPayload(jobData));
    return hmac.digest('hex');
}

function verifyJobPayload(jobData, signature, maxAgeMs = DEFAULT_MAX_AGE_MS) {
    const secret = getSecret();
    if (!secret) return true;
    if (!signature) return false;

    const expected = signJobPayload(jobData);
    if (!expected) return false;

    // timingSafeEqual throws when buffer lengths differ.
    if (String(signature).length !== String(expected).length) {
        return false;
    }

    const isEqual = crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
    if (!isEqual) return false;

    const issuedAt = Number(jobData.issuedAt || 0);
    if (!Number.isFinite(issuedAt) || issuedAt <= 0) return false;
    if ((Date.now() - issuedAt) > maxAgeMs) return false;

    return true;
}

module.exports = {
    signJobPayload,
    verifyJobPayload,
};
