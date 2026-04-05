const { PrismaClient } = require('@prisma/client');

/**
 * Shared Prisma client for workspace packages that want to import DB access
 * directly from the database package rather than creating their own instance.
 *
 * Usage: const { prisma } = require('database');
 */
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
});

module.exports = { prisma, PrismaClient };
