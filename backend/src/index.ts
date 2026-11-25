// ==============================================================================
// OPENsketch Backend Server Entry Point
// ==============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { buildServer, validateProductionEnv } from './server';
import { Pool } from 'pg';
import Redis from 'ioredis';

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  validateProductionEnv();
}

const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/opensketch_db',
  max: 20,
});

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    })
  : new Redis({
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

redis.on('error', (err) => {
  if (process.env.REDIS_URL) {
    console.warn('⚠️ Redis connection warning (falling back to in-memory rate limiter when unavailable):', err.message);
  }
});

const server = buildServer({
  pool,
  redis,
  isProduction,
});

server.listen({ port, host }, (err, address) => {
  if (err) {
    console.error('Fatal error starting opensketch backend server:', err);
    process.exit(1);
  }
  console.log(`🚀 opensketch Backend API (ESCORP IDS) running securely at ${address}`);
});
