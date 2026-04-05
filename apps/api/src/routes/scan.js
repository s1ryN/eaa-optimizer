/**
 * Scan routes — /api/v1/scans
 * ════════════════════════════
 *
 * POST   /scans                    — trigger a new scan
 * GET    /scans/:scanId            — poll status + summary
 * GET    /scans/:scanId/violations — paginated violation list
 * PATCH  /scans/:scanId/violations/:violationId — mark a violation as excluded
 * GET    /scans/:scanId/certificate-eligibility — check if a certificate can be issued
 */

const { prisma }      = require('../lib/db');
const { enqueueScan } = require('../lib/queue');
const { checkCertificateEligibility } = require('../../../scanner-worker/src/scoring');
const { MANUAL_CHECKS } = require('../lib/manual-checks');
const { validateAndNormalizeScanUrl } = require('../lib/security');
const { shouldThrottleScanAttempt, sendAbuseAlert } = require('../lib/abuse-monitor');
const { requireAuthIfConfigured } = require('../lib/auth');

const scanIdParamSchema = {
    type: 'object',
    required: ['scanId'],
    additionalProperties: false,
    properties: {
        scanId: { type: 'string', minLength: 8, maxLength: 128 },
    },
};

const scanViolationParamSchema = {
    type: 'object',
    required: ['scanId', 'violationId'],
    additionalProperties: false,
    properties: {
        scanId: { type: 'string', minLength: 8, maxLength: 128 },
        violationId: { type: 'string', minLength: 8, maxLength: 128 },
    },
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeViolation(violation) {
    return {
        ...violation,
        htmlContext: violation.htmlContext ? escapeHtml(violation.htmlContext) : null,
        target: violation.target ? escapeHtml(violation.target) : null,
        failureSummary: violation.failureSummary ? escapeHtml(violation.failureSummary) : null,
    };
}

async function urlLooksReachable(url) {
    const timeoutMs = 12000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        // Try lightweight HEAD first.
        const headResp = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'EAA-Auditor-Bot/1.0 (+https://eu-eaa-optimize.com/bot)',
            },
        });
        const headType = headResp.headers.get('content-type') || '';
        if ((headResp.ok || [401, 403, 405].includes(headResp.status)) &&
            (!headResp.ok || /text\/html|application\/xhtml\+xml/i.test(headType) || !headType)) {
            return { ok: true, status: headResp.status };
        }

        // Some sites block HEAD. Fallback to GET for reliability.
        const getResp = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                'User-Agent': 'EAA-Auditor-Bot/1.0 (+https://eu-eaa-optimize.com/bot)',
            },
        });
        const getType = getResp.headers.get('content-type') || '';
        const isHtmlLike = /text\/html|application\/xhtml\+xml/i.test(getType);
        return {
            ok: (getResp.ok || [401, 403].includes(getResp.status)) && isHtmlLike,
            status: getResp.status,
            contentType: getType,
        };
    } catch (error) {
        return { ok: false, status: null, error: error.message };
    } finally {
        clearTimeout(timer);
    }
}

// Shared JSON Schema fragments reused across routes.
const paginationSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        page:   { type: 'integer', minimum: 1, default: 1 },
        limit:  { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        impact: { type: 'string', enum: ['critical', 'serious', 'moderate', 'minor'] },
    },
};

async function scanRoutes(fastify) {

    fastify.get('/manual-checks', async () => {
        return {
            total: MANUAL_CHECKS.length,
            checks: MANUAL_CHECKS,
        };
    });

    // ── POST /scans ───────────────────────────────────────────────────────────
    fastify.post('/scans', {
        preHandler: requireAuthIfConfigured,
        config: {
            rateLimit: {
                max: parseInt(process.env.API_CREATE_SCAN_RATE_LIMIT_MAX || '20', 10),
                timeWindow: process.env.API_CREATE_SCAN_RATE_LIMIT_WINDOW || '1 minute',
            },
        },
        schema: {
            body: {
                type: 'object',
                required: ['url'],
                additionalProperties: false,
                properties: {
                    url:         { type: 'string', format: 'uri' },
                    maxPages: {
                        anyOf: [
                            { type: 'integer', minimum: 1, maximum: 5000 },
                            { type: 'null' },
                        ],
                        default: null,
                    },
                    parallelPages: { type: 'integer', minimum: 1, maximum: 12, default: 4 },
                    followLinks: { type: 'boolean', default: true },
                    deduplicate: { type: 'boolean', default: true },
                },
            },
        },
    }, async (request, reply) => {
        const { url, maxPages = null, parallelPages = 4, followLinks = true, deduplicate = true } = request.body;

        let normalizedUrl;
        try {
            normalizedUrl = await validateAndNormalizeScanUrl(url);
        } catch (err) {
            return reply.code(400).send({ error: err.message });
        }

        const effectiveMaxPages = Number.isInteger(maxPages) && maxPages > 0 ? maxPages : null;
        const safeParallelPages = Math.min(12, Math.max(1, parseInt(parallelPages, 10) || 4));

        const abuseCheck = shouldThrottleScanAttempt({
            ip: request.ip,
            hostname: new URL(normalizedUrl).hostname,
        });
        if (abuseCheck.throttled) {
            request.log.warn({ abuseCheck, ip: request.ip, url: normalizedUrl }, 'Scan request throttled by abuse monitor');
            await sendAbuseAlert({
                ip: request.ip,
                hostname: new URL(normalizedUrl).hostname,
                url: normalizedUrl,
                abuseCheck,
            });
            return reply.code(429).send({
                error: 'Scan rate temporarily limited due to suspicious request volume.',
                details: abuseCheck,
            });
        }

        const reachable = await urlLooksReachable(normalizedUrl);
        if (!reachable.ok) {
            return reply.code(400).send({
                error: 'Target URL is not reachable.',
                details: reachable,
            });
        }

        // Upsert a minimal anonymous project for URL-only scans.
        // Full multi-user project ownership can be layered on top of this API later.
        let project = await prisma.project.findFirst({ where: { url: normalizedUrl } });
        if (!project) {
            // Ensure the anonymous placeholder user exists.
            const anonUser = await prisma.user.upsert({
                where:  { email: 'anonymous@eu-eaa.local' },
                update: {},
                create: { email: 'anonymous@eu-eaa.local', password: '' },
            });
            project = await prisma.project.create({
                data: {
                    name:   new URL(normalizedUrl).hostname,
                    url: normalizedUrl,
                    userId: anonUser.id,
                },
            });
        }

        // Create the Scan record in PENDING state before enqueueing.
        const scan = await prisma.scan.create({
            data: { projectId: project.id, status: 'PENDING' },
        });

        await enqueueScan({
            scanId: scan.id,
            url: normalizedUrl,
            maxPages: effectiveMaxPages,
            parallelPages: safeParallelPages,
            followLinks,
            deduplicate,
        });

        return reply.code(202).send({
            scanId:  scan.id,
            status:  'PENDING',
            settings: {
                url: normalizedUrl,
                maxPages: effectiveMaxPages,
                parallelPages: safeParallelPages,
                followLinks,
                deduplicate,
            },
            message: `Scan queued. Poll GET /api/v1/scans/${scan.id} for results.`,
        });
    });

    // ── GET /scans/:scanId ────────────────────────────────────────────────────
    fastify.get('/scans/:scanId', {
        schema: { params: scanIdParamSchema },
    }, async (request, reply) => {
        const { scanId } = request.params;

        const scan = await prisma.scan.findUnique({
            where: { id: scanId },
            include: {
                // Return a capped preview; use the /violations sub-route for pagination.
                violations: {
                    where:   { excluded: false },
                    orderBy: [{ impactOrder: 'asc' }, { ruleId: 'asc' }],
                    take:    100,
                },
            },
        });

        if (!scan) return reply.code(404).send({ error: 'Scan not found' });

        const totalViolations = await prisma.violation.count({ where: { scanId } });
        const excludedCount   = await prisma.violation.count({ where: { scanId, excluded: true } });

        return {
            scanId:          scan.id,
            status:          scan.status,
            score:           scan.score,
            pagesScanned:    scan.pagesScanned,
            createdAt:       scan.createdAt,
            finishedAt:      scan.finishedAt,
            totalViolations,
            excludedCount,
            violations:      scan.violations.map(sanitizeViolation),
        };
    });

    // ── GET /scans/:scanId/violations ─────────────────────────────────────────
    fastify.get('/scans/:scanId/violations', {
        schema: {
            params: scanIdParamSchema,
            querystring: paginationSchema,
        },
    }, async (request, reply) => {
        const { scanId }                          = request.params;
        const { page = 1, limit = 50, impact }  = request.query;

        const where = { scanId };
        if (impact) where.impact = impact;

        const [violations, total] = await prisma.$transaction([
            prisma.violation.findMany({
                where,
                orderBy: [{ impactOrder: 'asc' }, { ruleId: 'asc' }, { pageUrl: 'asc' }],
                skip:  (page - 1) * limit,
                take:  limit,
            }),
            prisma.violation.count({ where }),
        ]);

        return {
            violations: violations.map(sanitizeViolation),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    });

    // ── PATCH /scans/:scanId/violations/:violationId ──────────────────────────
    // Allows users to mark a violation as a false-positive before requesting
    // a certificate. The scanner score is re-evaluated on each request.
    fastify.patch('/scans/:scanId/violations/:violationId', {
        preHandler: requireAuthIfConfigured,
        schema: {
            params: scanViolationParamSchema,
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    excluded:      { type: 'boolean' },
                    excludeReason: { type: 'string', maxLength: 500 },
                },
            },
        },
    }, async (request, reply) => {
        const { scanId, violationId } = request.params;
        const { excluded, excludeReason } = request.body;

        const violation = await prisma.violation.findFirst({
            where: { id: violationId, scanId },
        });
        if (!violation) return reply.code(404).send({ error: 'Violation not found' });

        const updated = await prisma.violation.update({
            where: { id: violationId },
            data:  { excluded: excluded ?? violation.excluded, excludeReason: excludeReason ?? null },
        });

        return updated;
    });

    // ── GET /scans/:scanId/certificate-eligibility ────────────────────────────
    fastify.get('/scans/:scanId/certificate-eligibility', {
        schema: { params: scanIdParamSchema },
    }, async (request, reply) => {
        const { scanId } = request.params;

        const scan = await prisma.scan.findUnique({ where: { id: scanId } });
        if (!scan) return reply.code(404).send({ error: 'Scan not found' });
        if (scan.status !== 'COMPLETED') {
            return reply.code(400).send({ error: 'Scan is not yet completed.' });
        }

        // Only non-excluded violations count against the certificate.
        const activeViolations = await prisma.violation.findMany({
            where:  { scanId, excluded: false },
            select: { impact: true },
        });

        const eligibility = checkCertificateEligibility(activeViolations, scan.score ?? 0);
        return { scanId, score: scan.score, ...eligibility };
    });
}

module.exports = { scanRoutes };
