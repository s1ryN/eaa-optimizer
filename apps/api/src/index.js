/**
 * API entry point — Fastify HTTP server
 * ══════════════════════════════════════
 * Starts on PORT (default 3001).
 * All WCAG scan endpoints are mounted under /api/v1.
 */

const Fastify = require('fastify');
const cors    = require('@fastify/cors');
const helmet  = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');

const { scanRoutes } = require('./routes/scan');
const { prisma }     = require('./lib/db');
const { hasAnyAuthSecretConfigured } = require('./lib/auth');

const app = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
    // Keep payload limits conservative for scan API endpoints that only need small JSON bodies.
    bodyLimit: parseInt(process.env.API_BODY_LIMIT_BYTES || '131072', 10),
    maxParamLength: parseInt(process.env.API_MAX_PARAM_LENGTH || '200', 10),
    ajv: {
        customOptions: {
            removeAdditional: 'all',
            coerceTypes: false,
            useDefaults: true,
            allErrors: false,
        },
    },
});

function validateProductionSecrets() {
    if (process.env.NODE_ENV !== 'production') return;

    if (!hasAnyAuthSecretConfigured()) {
        throw new Error('In production, set SCAN_API_KEY/API_KEY or SCAN_BEARER_TOKEN/API_BEARER_TOKEN.');
    }

    if (!process.env.JOB_SIGNING_SECRET) {
        throw new Error('In production, JOB_SIGNING_SECRET must be set.');
    }
}

validateProductionSecrets();

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set in production.');
}

// ── Plugins ──────────────────────────────────────────────────────────────────

app.register(cors, {
    // In production, restrict to your frontend origin.
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    credentials: true,
});

app.register(helmet, {
    contentSecurityPolicy: false,
    global: true,
});

app.register(rateLimit, {
    global: true,
    max: parseInt(process.env.API_RATE_LIMIT_MAX || '300', 10),
    timeWindow: process.env.API_RATE_LIMIT_WINDOW || '1 minute',
});

// ── Routes ────────────────────────────────────────────────────────────────────

app.register(scanRoutes, { prefix: '/api/v1' });

// Prevent stack traces/internal details from being exposed to API clients.
app.setErrorHandler((error, request, reply) => {
    request.log.error({
        err: error,
        path: request.url,
        method: request.method,
    }, 'Unhandled API error');

    if (error.validation) {
        return reply.code(400).send({
            error: 'Invalid request payload or parameters.',
        });
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (statusCode >= 500) {
        return reply.code(500).send({ error: 'Internal server error.' });
    }

    return reply.code(statusCode).send({
        error: error.message || 'Request failed.',
    });
});

// Liveness probe — useful for Docker / k8s health checks.
app.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err) => {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

async function shutdown(signal) {
    app.log.info(`${signal} received — shutting down`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = { app };
