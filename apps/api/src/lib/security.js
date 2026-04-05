const dns = require('node:dns/promises');
const net = require('node:net');

function isPrivateIPv4(ip) {
    const octets = ip.split('.').map((v) => parseInt(v, 10));
    if (octets.length !== 4 || octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
        return false;
    }

    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
}

function isPrivateIPv6(ip) {
    const normalized = ip.toLowerCase();
    return (
        normalized === '::1' ||
        normalized === '::' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
    );
}

function isPrivateOrLocalAddress(ip) {
    const family = net.isIP(ip);
    if (family === 4) return isPrivateIPv4(ip);
    if (family === 6) return isPrivateIPv6(ip);
    return true;
}

async function hostnameResolvesToPrivateAddress(hostname) {
    try {
        const records = await dns.lookup(hostname, { all: true });
        if (!records.length) return true;
        return records.some((record) => isPrivateOrLocalAddress(record.address));
    } catch {
        return true;
    }
}

/**
 * Normalize and validate user-supplied scan URL to reduce SSRF risk.
 * Returns canonicalized URL string or throws an Error.
 */
async function validateAndNormalizeScanUrl(inputUrl) {
    if (typeof inputUrl !== 'string' || !inputUrl.trim()) {
        throw new Error('URL must be a non-empty string.');
    }

    if (inputUrl.length > 2048) {
        throw new Error('URL is too long.');
    }

    let parsed;
    try {
        parsed = new URL(inputUrl.trim());
    } catch {
        throw new Error('Invalid URL format.');
    }

    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
        throw new Error('Only http and https URLs are allowed.');
    }

    if (parsed.username || parsed.password) {
        throw new Error('URLs with embedded credentials are not allowed.');
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost')) {
        throw new Error('Localhost targets are not allowed.');
    }

    if (net.isIP(host) && isPrivateOrLocalAddress(host)) {
        throw new Error('Private/local IP targets are not allowed.');
    }

    if (!net.isIP(host)) {
        const privateResolution = await hostnameResolvesToPrivateAddress(host);
        if (privateResolution) {
            throw new Error('Target host resolves to a private/local address.');
        }
    }

    parsed.hash = '';
    return parsed.toString();
}

module.exports = {
    validateAndNormalizeScanUrl,
};
