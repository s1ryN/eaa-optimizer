function getBearerToken(request) {
    const authHeader = request.headers.authorization || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
    return authHeader.slice(7).trim();
}

function getConfiguredApiKeys() {
    return [process.env.SCAN_API_KEY, process.env.API_KEY]
        .map((v) => (v || '').trim())
        .filter(Boolean);
}

function getConfiguredBearerTokens() {
    return [process.env.SCAN_BEARER_TOKEN, process.env.API_BEARER_TOKEN]
        .map((v) => (v || '').trim())
        .filter(Boolean);
}

function hasAnyAuthSecretConfigured() {
    return getConfiguredApiKeys().length > 0 || getConfiguredBearerTokens().length > 0;
}

function timingSafeEqual(a, b) {
    const aa = Buffer.from(String(a || ''), 'utf8');
    const bb = Buffer.from(String(b || ''), 'utf8');
    if (aa.length !== bb.length) return false;
    try {
        return require('node:crypto').timingSafeEqual(aa, bb);
    } catch {
        return false;
    }
}

function isAuthorizedRequest(request) {
    const apiKey = request.headers['x-api-key'];
    const bearer = getBearerToken(request);

    const apiKeyOk = getConfiguredApiKeys().some((expectedApiKey) => timingSafeEqual(apiKey, expectedApiKey));
    const bearerOk = getConfiguredBearerTokens().some((expectedBearer) => timingSafeEqual(bearer, expectedBearer));

    return apiKeyOk || bearerOk;
}

function requireAuthIfConfigured(request, reply, done) {
    const authEnabled = (process.env.AUTH_REQUIRED || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';
    if (!authEnabled) return done();

    if (!isAuthorizedRequest(request)) {
        reply.code(401).send({ error: 'Unauthorized. Provide valid API credentials.' });
        return;
    }

    done();
}

module.exports = {
    requireAuthIfConfigured,
    hasAnyAuthSecretConfigured,
};
