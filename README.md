# EU EAA Optimize

Accessibility scanning backend for WCAG 2.1 A/AA auditing.

## Overview

EU EAA Optimize is a queue-based backend that crawls websites, runs automated accessibility checks, stores findings, and exposes scan results through an API.

Core responsibilities:
- Accept scan requests and validate target URLs.
- Process crawl and scan jobs asynchronously.
- Persist scans and violations in PostgreSQL.
- Return status, score, and paginated findings for each scan.

## Tech stack

- Runtime: Node.js, npm workspaces
- API: Fastify, AJV validation, Helmet, rate limiting
- Queue: BullMQ with Redis
- Scanner: Playwright and axe-core
- Data: Prisma ORM with PostgreSQL
- Local infra: Docker Compose

## Repository layout

- apps/api: HTTP API, request validation, queue producer
- apps/scanner-worker: queue consumer, crawler, accessibility engine
- packages/database: Prisma schema, migrations, shared client

## Processing flow

1. POST /api/v1/scans receives a target URL and scan options.
2. API validates input and enqueues a signed job.
3. Worker verifies the job signature and starts crawl+scan.
4. Findings are normalized, deduplicated, and stored.
5. API exposes scan status and violation results.

## Prerequisites

- Node.js 20 or newer
- npm
- Docker with Compose

## Local setup

Install dependencies:

```bash
npm install
```

Start local infrastructure:

```bash
docker compose up -d
```

Run database migrations:

```bash
npm run migrate:dev --workspace packages/database
```

Start API:

```bash
npm run dev --workspace apps/api
```

Start worker:

```bash
npm run dev --workspace apps/scanner-worker
```

Run smoke test:

```bash
npm run scan:test -- https://example.com 5 true
```

## API endpoints

Base path: /api/v1

- POST /scans
- GET /scans/:scanId
- GET /scans/:scanId/violations
- PATCH /scans/:scanId/violations/:violationId
- GET /scans/:scanId/certificate-eligibility
- GET /health

Example create scan request:

```bash
curl -X POST http://localhost:3001/api/v1/scans \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","maxPages":50,"parallelPages":4,"followLinks":true,"deduplicate":true}'
```

## Detection coverage

Automated checks are intentionally positioned as first-pass auditing, not full compliance validation.

Realistic coverage for this stack:
- Approximately 35-40% of WCAG 2.1 A/AA criteria can be detected automatically with useful confidence.
- Remaining criteria require manual review, assistive technology testing, and business-context verification.

Areas with strong automated coverage:
- Missing alt attributes and common semantic structure defects
- Many ARIA misuse cases and form labeling issues
- Heading/landmark/link-name issues
- A significant subset of contrast and DOM-level violations

Areas requiring manual verification:
- Alt text quality and relevance
- Link purpose in context
- Keyboard behavior quality in custom components
- Focus order usability
- Caption/transcript correctness
- Error-prevention flows in critical user journeys
- Language quality and readability

## Deduplication behavior

Default mode uses deduplication to reduce repetitive findings on template-heavy sites.

Effects:
- Faster scans and cleaner reports
- Lower raw issue volume when many pages share the same templates

For exhaustive scans, use:
- deduplicate=false
- higher maxPages or uncapped crawling

## Security

- SSRF and private-network target protections
- Strict request schema validation and bounded payload sizes
- Global and route-level rate limits
- Optional auth enforcement for mutating endpoints
- HMAC job signature verification between API and worker
- Sanitized API error responses

## Configuration

Common environment variables:
- PORT
- DATABASE_URL
- REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- JOB_SIGNING_SECRET
- SCAN_API_KEY or API_KEY
- SCAN_BEARER_TOKEN or API_BEARER_TOKEN
- AUTH_REQUIRED
- CORS_ORIGIN

Worker crawl tuning is defined in apps/scanner-worker/src/config.js.

## Production checklist

1. Set NODE_ENV=production.
2. Configure JOB_SIGNING_SECRET.
3. Configure at least one auth secret (SCAN_API_KEY or SCAN_BEARER_TOKEN).
4. Set strict CORS_ORIGIN.
5. Tune rate limits and crawl limits for your environment.
6. Pair automated scanning with manual accessibility QA.

## License

MIT. See LICENSE.
