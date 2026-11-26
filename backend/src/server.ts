// ==============================================================================
// OPENsketch Hardened Fastify Server Architecture
// Standards: OWASP API Security Top 10, REQ-SEC-01 to REQ-SEC-20
// Defense: Helmet, CORS, Signed Secure Cookies, Rate Limiting & Zero IDOR
// ==============================================================================

import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { AuthGuard, AuthenticatedUserSession } from './security/auth-guard';
import { CookieSecurityManager, SESSION_COOKIE_NAME } from './security/cookie-manager';
import { DistributedRateLimiter } from './security/rate-limiter';
import { TenantContextRunner, RequestTenantContext } from './security/tenant-context';
import { TenantScopedRepository } from './modules/repository/tenant-scoped-repository';
import { PromptSanitizer } from './ai/prompt-sanitizer';
import { detectChatMode, listAgencyAgentsSummary, selectAgentsForPrompt } from './ai/agency-router';
import { SecretsVault } from './security/secrets-vault';
import { handleServerError } from './security/error-handler';
import {
  AiQuotaGuard,
  AI_RATE_LIMIT_PER_DAY,
  AI_RATE_LIMIT_PER_MINUTE,
  MAX_AI_INPUT_CHARS,
  MAX_AI_OUTPUT_TOKENS,
  extractValidByokKey,
  getCurrentDayKey,
  normalizePlanTier,
} from './security/ai-quota-guard';
import {
  PagBankBillingService,
  PAGBANK_PLAN_CATALOG,
  PaidPlanId,
} from './security/pagbank-service';
import {
  sendPaymentInitiatedEmail,
  sendPaymentConfirmedEmail,
  sendCheckoutActivationEmail,
} from './security/email-service';
import { startBillingReminderJob } from './security/billing-reminder-job';

export interface ServerOptions {
  redis?: Redis;
  pool?: Pool;
  isProduction?: boolean;
}

const GEMINI_MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'] as const;

function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function callGeminiWithModelFallback(
  apiKey: string,
  requestBody: Record<string, unknown>,
  signal: AbortSignal
): Promise<{ response: Response; model: string }> {
  let lastResponse: Response | null = null;
  let lastModel: string = GEMINI_MODEL_CANDIDATES[0];

  for (const model of GEMINI_MODEL_CANDIDATES) {
    lastModel = model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Até 2 retries automáticos (3 tentativas no total por modelo) com espera de 2,5s para HTTP 429 / 503
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await waitMs(2500, signal);
      }

      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (response.status === 400 && (requestBody as any)?.generationConfig?.thinkingConfig) {
        const { thinkingConfig: _ignored, ...restGen } = (requestBody as any).generationConfig;
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({ ...requestBody, generationConfig: restGen }),
          signal,
        });
      }

      lastResponse = response;
      if (response.ok) {
        return { response, model };
      }

      if (response.status === 429 || response.status === 503) {
        console.warn(`[OPENsketch Gemini Retry] HTTP ${response.status} em ${model} (tentativa ${attempt + 1}/3).`);
        continue;
      }

      if (response.status !== 404) {
        return { response, model };
      }
      break;
    }
  }
  return { response: lastResponse!, model: lastModel };
}

export function validateProductionEnv(): void {
  const missing: string[] = [];
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32 || sessionSecret.includes('dev_secret_')) {
    missing.push('SESSION_SECRET (min 32 chars, non-default)');
  }
  if (!process.env.ALLOWED_ORIGINS && !process.env.ALLOWED_ORIGIN) {
    missing.push('ALLOWED_ORIGINS');
  }
  if (!process.env.GEMINI_API_KEY && !SecretsVault.get('GEMINI_API_KEY')) {
    missing.push('GEMINI_API_KEY');
  }
  if (missing.length > 0) {
    throw new Error(`FATAL [ESCORP IDS]: Missing required production environment variables: ${missing.join(', ')}`);
  }
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  startBillingReminderJob();
  const isProd = options.isProduction ?? process.env.NODE_ENV === 'production';
  const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  const officialProdOrigins = [
    'https://opensketch-e7eb1.web.app',
    'https://opensketch-e7eb1.firebaseapp.com',
  ];
  const configuredOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const corsOrigins = isProd
    ? Array.from(new Set([...configuredOrigins, ...officialProdOrigins]))
    : Array.from(new Set([...configuredOrigins, ...officialProdOrigins, 'http://127.0.0.1:3000', 'http://localhost:3000']));
  const sessionSecret = process.env.SESSION_SECRET || 'dev_secret_at_least_32_characters_long_opensketch_2026';

  const app = fastify({
    logger: !isProd,
    bodyLimit: 1024 * 1024, // 1 MB payload limit (Prevents DoS - REQ-SEC-15)
  });

  // 1. HELMET: Hardened HTTP Headers
  app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  // 2. CORS: Strict Origin Whitelisting
  app.register(fastifyCors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Workspace-Context',
      'X-Workspace-Plan',
      'X-Gemini-User-Key',
      'X-Requested-With',
    ],
  });

  // 3. COOKIES: Secure Signed Cookies
  app.register(fastifyCookie, {
    secret: sessionSecret,
    parseOptions: {},
  });

  // 4. ERROR SHIELD: Never leak stack traces or internal secrets
  app.setErrorHandler(handleServerError);

  // Initialize Core Services
  const redis = options.redis || (new Redis({ lazyConnect: true }) as any);
  const pool = options.pool || (new Pool({ max: 5 }) as any);
  const authGuard = new AuthGuard(redis, process.env.GOOGLE_CLIENT_ID || 'dummy_client_id');
  const rateLimiter = new DistributedRateLimiter(redis);
  const aiQuotaGuard = new AiQuotaGuard(redis);
  const pagBankService = new PagBankBillingService();
  const tenantRunner = new TenantContextRunner(pool);
  const repository = new TenantScopedRepository(tenantRunner);

  // In-memory sliding window fallback when Redis is unavailable (bounded to prevent OOM)
  const memoryBuckets = new Map<string, number[]>();
  const MAX_MEMORY_BUCKET_KEYS = 5000;
  const enforceRateLimit = async (action: string, subject: string, maxRequests: number, windowSeconds = 60): Promise<boolean> => {
    if (redis.status === 'ready' && redis.pipeline) {
      try {
        const rl = await rateLimiter.consume(action, subject, { windowSeconds, maxRequests });
        return rl.allowed;
      } catch {
        // Fall through to in-memory limiter if Redis errors
      }
    }
    const key = `${action}:${subject}`;
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const recent = (memoryBuckets.get(key) || []).filter((ts) => ts > cutoff);
    if (recent.length >= maxRequests) {
      memoryBuckets.set(key, recent);
      return false;
    }
    recent.push(now);
    if (memoryBuckets.size >= MAX_MEMORY_BUCKET_KEYS && !memoryBuckets.has(key)) {
      const oldestKey = memoryBuckets.keys().next().value;
      if (oldestKey !== undefined) memoryBuckets.delete(oldestKey);
    }
    memoryBuckets.set(key, recent);
    return true;
  };

  // Helper to extract verified context
  const extractContext = (req: FastifyRequest): RequestTenantContext => {
    const user = (req as any).userSession as AuthenticatedUserSession | undefined;
    if (!user) {
      throw new Error('SECURITY_VIOLATION: Unauthenticated request in protected handler.');
    }
    return {
      userId: user.userId,
      organizationId: user.activeOrgId || undefined,
      contextScope: user.scope,
    };
  };

  /**
   * Controle unificado de plano, rate-limit (10/min, 30/dia), franquia mensal (usage/{uid})
   * e suporte BYOK (chave própria do usuário não desconta da cota do servidor).
   */
  const enforceAiPlanAndQuota = async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<{
    uid: string;
    plan: 'free' | 'essential_monthly' | 'pro_lifetime';
    apiKey: string | null;
    byokActive: boolean;
    quota: Awaited<ReturnType<AiQuotaGuard['getQuotaSnapshot']>>;
  } | null> => {
    const userSession = (req as any).userSession as AuthenticatedUserSession | undefined;
    const ctx = extractContext(req);
    const rawByokHeader = req.headers['x-gemini-user-key'];
    const rawBodyByok = (req.body as any)?.userGeminiKey;
    const hasByokAttempt = Boolean(
      (typeof rawByokHeader === 'string' && rawByokHeader.trim()) ||
        (Array.isArray(rawByokHeader) && rawByokHeader.length > 0 && rawByokHeader[0]?.trim()) ||
        (typeof rawBodyByok === 'string' && rawBodyByok.trim())
    );
    const masterEmail = String(process.env.OWNER_MASTER_EMAIL || 'escorpsystems@gmail.com').trim().toLowerCase();
    const isMasterOwner =
      Boolean(userSession?.isOwner) ||
      Boolean(masterEmail && String(userSession?.email || '').trim().toLowerCase() === masterEmail);

    if (hasByokAttempt && !isMasterOwner) {
      reply.status(403).send({
        error: 'FORBIDDEN_BYOK_ACCESS',
        message: 'Acesso negado: o uso de chave própria (BYOK) é exclusivo do Proprietário Master.',
      });
      return null;
    }

    const userByokKey = isMasterOwner ? extractValidByokKey(rawByokHeader) : null;
    const byokActive = Boolean(userByokKey);
    const serverKey = SecretsVault.get('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || null;

    if (isMasterOwner) {
      const snapshot = await aiQuotaGuard.getQuotaSnapshot(ctx.userId, 'pro_lifetime', true);
      return {
        uid: ctx.userId,
        plan: 'pro_lifetime',
        apiKey: userByokKey || serverKey,
        byokActive: true,
        quota: {
          ...snapshot,
          limit: 999999,
          remaining: 999999,
        },
      };
    }

    const userPlanRecord = await pagBankService.getOrInitUserPlan(ctx.userId, {
      email: userSession?.email,
      isOwner: false,
    });
    const plan = normalizePlanTier(
      userPlanRecord.planStatus === 'active' ? userPlanRecord.plan : 'free'
    );

    if ((plan === 'free' || plan === 'essential_monthly') && ctx.contextScope === 'CORPORATE') {
      reply.status(403).send({
        error: 'PLAN_ENVIRONMENT_FORBIDDEN',
        message: 'O ambiente Minha Empresa requer o Plano Completo Vitalício.',
      });
      return null;
    }

    const minAllowed = await enforceRateLimit('ai_uid_min', ctx.userId, AI_RATE_LIMIT_PER_MINUTE, 60);
    if (!minAllowed) {
      reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de 10 requisições de IA por minuto atingido. Aguarde um instante.',
        fallback: true,
      });
      return null;
    }

    const dayKey = `${ctx.userId}:${getCurrentDayKey()}`;
    const dayAllowed = await enforceRateLimit('ai_uid_day', dayKey, AI_RATE_LIMIT_PER_DAY, 24 * 60 * 60);
    if (!dayAllowed) {
      reply.status(429).send({
        error: 'DAILY_RATE_LIMIT_EXCEEDED',
        message: 'Limite diário de 30 requisições de IA atingido. Tente novamente amanhã ou informe sua própria chave Gemini em Configurações.',
        fallback: true,
      });
      return null;
    }

    const { allowed, snapshot } = await aiQuotaGuard.consumeMonthlyQuota(ctx.userId, plan, byokActive);
    if (!allowed) {
      reply.status(429).send({
        error: 'MONTHLY_QUOTA_EXCEEDED',
        message: `Franquia mensal de ${snapshot.limit} consultas de IA atingida (${snapshot.used}/${snapshot.limit} em ${snapshot.resetMonth}). Adicione sua própria chave Gemini em Configurações para uso ilimitado.`,
        quota: snapshot,
        fallback: true,
      });
      return null;
    }

    return {
      uid: ctx.userId,
      plan,
      apiKey: userByokKey || serverKey,
      byokActive,
      quota: snapshot,
    };
  };

  /**
   * Middleware de autenticação híbrida (Sessão Redis + Bearer Token Firebase/OIDC)
   * Em NODE_ENV=production bloqueia acesso anônimo com HTTP 401;
   * Em development local permite fallback controlado para 'local_user' mantendo rate limit ativo.
   */
  const requireAuth = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    const authHeader = req.headers.authorization;
    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';

    let resolvedSession: AuthenticatedUserSession | null = null;

    if (sessionId && redis.get) {
      try {
        const sessionRaw = await redis.get(`sess:${sessionId}`);
        if (sessionRaw) {
          resolvedSession = JSON.parse(sessionRaw) as AuthenticatedUserSession;
        }
      } catch {
        resolvedSession = null;
      }
    }

    if (!resolvedSession && bearerToken) {
      try {
        if (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT) {
          const fbUser = await authGuard.verifyFirebaseIdToken(bearerToken);
          resolvedSession = {
            userId: fbUser.uid,
            email: fbUser.email,
            emailVerified: fbUser.emailVerified,
            isOwner: fbUser.isOwner,
            ownerRole: fbUser.isOwner ? 'owner' : 'user',
            googleSub: fbUser.uid,
            sessionId: `firebase_${fbUser.uid}`,
            activeOrgId: null,
            allowedOrgIds: [],
            scope: 'PERSONAL',
          };
        }
      } catch {
        // Tenta fallback via Google OIDC caso não seja token Firebase
      }

      if (!resolvedSession) {
        try {
          const verified = await authGuard.verifyGoogleIdToken(bearerToken);
          resolvedSession = {
            userId: verified.googleSub,
            email: verified.email,
            googleSub: verified.googleSub,
            sessionId: `bearer_${verified.googleSub}`,
            activeOrgId: null,
            allowedOrgIds: [],
            scope: 'PERSONAL',
          };
        } catch {
          if (isProd) {
            return reply.status(401).send({
              error: 'INVALID_BEARER_TOKEN',
              message: 'Token de autenticação inválido ou expirado.',
            });
          }
        }
      }
    }

    if (!resolvedSession) {
      if (isProd) {
        return reply.status(401).send({
          error: 'UNAUTHORIZED',
          message: 'Autenticação obrigatória para acessar esta rota.',
        });
      }
      // Fallback controlado exclusivo para desenvolvimento local
      const devScopeHeader = req.headers['x-workspace-context'] as string | undefined;
      (req as any).userSession = {
        userId: 'local_user',
        email: 'dev@opensketch.local',
        googleSub: 'local_user',
        sessionId: 'local_dev_session',
        activeOrgId: devScopeHeader && devScopeHeader !== 'personal' ? devScopeHeader : null,
        allowedOrgIds: devScopeHeader && devScopeHeader !== 'personal' ? [devScopeHeader] : [],
        scope: devScopeHeader && devScopeHeader !== 'personal' ? 'CORPORATE' : 'PERSONAL',
      } satisfies AuthenticatedUserSession;
      return;
    }

    // Validação estrita contra Tenant Hopping / IDOR
    const clientScopeHeader = req.headers['x-workspace-context'] as string | undefined;
    if (clientScopeHeader && clientScopeHeader !== 'personal' && clientScopeHeader !== 'corporate') {
      const normalizedHeader = String(clientScopeHeader).trim();
      const allowedList = Array.isArray(resolvedSession.allowedOrgIds)
        ? resolvedSession.allowedOrgIds
        : resolvedSession.activeOrgId
        ? [resolvedSession.activeOrgId]
        : [];
      if (!allowedList.includes(normalizedHeader)) {
        return reply.status(403).send({
          error: 'FORBIDDEN_TENANT_ACCESS',
          message: 'Acesso negado: organização não pertence ao usuário autenticado.',
        });
      }
      resolvedSession.scope = 'CORPORATE';
      resolvedSession.activeOrgId = normalizedHeader;
    } else if (clientScopeHeader === 'corporate') {
      resolvedSession.scope = 'CORPORATE';
    } else {
      resolvedSession.scope = 'PERSONAL';
      resolvedSession.activeOrgId = null;
    }

    (req as any).userSession = resolvedSession;
  };

  // ============================================================================
  // UNPROTECTED ROUTES (Health Check & Diagnostics)
  // ============================================================================

  app.get('/health', async (_req, reply) => {
    return reply.send({
      status: 'healthy',
      service: 'opensketch-backend',
      timestamp: new Date().toISOString(),
      geminiConfigured: Boolean(SecretsVault.get('GEMINI_API_KEY') || process.env.GEMINI_API_KEY),
    });
  });

  app.get('/api/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      service: 'opensketch-bff',
      operator: 'ESCORP IDS',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================

  app.post('/api/auth/google', async (req, reply) => {
    const authAllowed = await enforceRateLimit('auth_google', req.ip || 'anon', 15, 60);
    if (!authAllowed) {
      return reply.status(429).send({ error: 'RATE_LIMIT_EXCEEDED', message: 'Muitas tentativas de login. Aguarde um minuto.' });
    }
    const { idToken, targetScope, organizationId } = (req.body as any) || {};
    if (!idToken) {
      return reply.status(400).send({ error: 'MISSING_ID_TOKEN', message: 'Token Google OIDC é obrigatório.' });
    }

    try {
      const verified = await authGuard.verifyGoogleIdToken(idToken);
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const session: AuthenticatedUserSession = {
        userId: verified.googleSub,
        email: verified.email,
        googleSub: verified.googleSub,
        sessionId,
        activeOrgId: targetScope === 'CORPORATE' ? organizationId : null,
        allowedOrgIds: targetScope === 'CORPORATE' && organizationId ? [String(organizationId)] : [],
        scope: targetScope === 'CORPORATE' ? 'CORPORATE' : 'PERSONAL',
      };

      // Store session in Redis with 7 days TTL
      if (redis.set) {
        await redis.set(`sess:${sessionId}`, JSON.stringify(session), 'EX', 60 * 60 * 24 * 7);
      }

      // Set hardened session cookie
      CookieSecurityManager.setSessionCookie(reply, sessionId, { isProduction: isProd });

      return reply.send({
        user: {
          id: session.userId,
          email: session.email,
          scope: session.scope,
          organizationId: session.activeOrgId,
        },
      });
    } catch (err: any) {
      return reply.status(401).send({ error: 'AUTH_FAILED', message: 'Falha na autenticação Google OIDC.' });
    }
  });

  app.get('/api/auth/session', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const user = (req as any).userSession;
    return reply.send({ user: SecretsVault.redactSensitiveData(user) });
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    if (sessionId) {
      await authGuard.revokeSession(sessionId);
    }
    CookieSecurityManager.clearSessionCookie(reply);
    return reply.send({ message: 'Sessão encerrada com sucesso.' });
  });

  // ============================================================================
  // CLIENTS API (Strictly Tenant-Scoped & Anti-IDOR Protected)
  // ============================================================================

  app.get('/api/clients', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const context = extractContext(req);
    const clients = await repository.listClients(context);
    return reply.send({ clients });
  });

  app.post('/api/clients', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const context = extractContext(req);
    const body = (req.body as any) || {};

    if (!body.name || !body.email) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Nome e e-mail são obrigatórios.' });
    }

    PromptSanitizer.validateSafeInput(body.name);
    PromptSanitizer.validateSafeInput(body.notes || '');

    const client = await repository.createClient(context, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      documentTaxId: body.documentTaxId,
      segment: body.segment || 'Vendas',
      status: body.status || 'ATIVO',
      notes: body.notes,
      totalInvoiced: body.totalInvoiced || 0,
      invoicesCount: body.invoicesCount || 0,
      lastInvoiceDate: body.lastInvoiceDate || new Date().toISOString().slice(0, 10),
    });

    return reply.status(201).send({ client });
  });

  app.put('/api/clients/:id', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const context = extractContext(req);
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};

    if (body.name) PromptSanitizer.validateSafeInput(body.name);
    if (body.notes) PromptSanitizer.validateSafeInput(body.notes);

    const updated = await repository.updateClient(context, id, body);
    return reply.send({ client: updated });
  });

  app.delete('/api/clients/:id', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const context = extractContext(req);
    const { id } = req.params as { id: string };
    const success = await repository.deleteClient(context, id);
    return reply.send({ success });
  });

  // ============================================================================
  // ADS API (Tenant Scoped)
  // ============================================================================

  app.get('/api/ads', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const context = extractContext(req);
    const ads = await repository.listAds(context);
    return reply.send({ ads });
  });

  app.post('/api/ads', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const context = extractContext(req);
    const body = (req.body as any) || {};

    if (!body.title) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', message: 'Título do anúncio é obrigatório.' });
    }

    PromptSanitizer.validateSafeInput(body.title);
    PromptSanitizer.validateSafeInput(body.caption || '');

    const ad = await repository.createAd(context, {
      title: body.title,
      format: body.format || '9:16',
      caption: body.caption,
      imageUrl: body.imageUrl,
      status: body.status || 'APROVADO',
      aspectRatioLabel: body.aspectRatioLabel || 'Stories / Reels (9:16)',
    });

    return reply.status(201).send({ ad });
  });

  app.delete('/api/ads/:id', { preHandler: [authGuard.authenticate.bind(authGuard)] }, async (req, reply) => {
    const context = extractContext(req);
    const { id } = req.params as { id: string };
    const success = await repository.deleteAd(context, id);
    return reply.send({ success });
  });

  // ============================================================================
  // PROSPECTING API (Rate Limited & Protected against Prompt Injection)
  // ============================================================================

  app.post('/api/prospecting/generate-phrases', { preHandler: [requireAuth] }, async (req, reply) => {
    const { customPrompt, profession, targetCompany, city, state } = (req.body as any) || {};

    if (customPrompt && String(customPrompt).length > MAX_AI_INPUT_CHARS) {
      return reply.status(400).send({
        error: 'INPUT_TOO_LONG',
        message: `O texto enviado excede o limite máximo de ${MAX_AI_INPUT_CHARS} caracteres.`,
      });
    }

    // Inspect for Prompt Injection attempts
    if (customPrompt) {
      PromptSanitizer.detectInjection(String(customPrompt));
    }

    const guardResult = await enforceAiPlanAndQuota(req, reply);
    if (!guardResult) return;

    const safeProf = String(profession || 'Gestão Comercial').trim().slice(0, 100);
    const safeCity = String(city || '').trim().slice(0, 80);
    const safeState = String(state || '').trim().slice(0, 20);
    const safeCompany = String(targetCompany || '').trim().slice(0, 100);
    const regionLabel = [safeCity, safeState && safeState !== 'TODOS' ? safeState : ''].filter(Boolean).join(' - ') || 'sua região';

    const apiKey = guardResult.apiKey;
    if (apiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const promptText = `Gere exatamente 3 scripts curtos de abordagem comercial B2B em Português Brasileiro para "${safeProf}" na região "${regionLabel}"${safeCompany ? `, direcionados para a empresa "${safeCompany}"` : ''}${customPrompt ? `, considerando o pedido: "${String(customPrompt).slice(0, 250)}"` : ''}.
Retorne APENAS um JSON válido com este formato:
{"phrases":[{"id":"1","channel":"WhatsApp / Mensagem Rápida","title":"Título curto","text":"Mensagem pronta"},{"id":"2","channel":"Abordagem Consultiva","title":"Título curto","text":"Mensagem pronta"},{"id":"3","channel":"E-mail / Ligação","title":"Título curto","text":"Mensagem pronta"}]}`;
        const { response } = await callGeminiWithModelFallback(
          apiKey,
          {
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: MAX_AI_OUTPUT_TOKENS, responseMimeType: 'application/json' },
          },
          controller.signal
        );
        clearTimeout(timeout);
        if (response.ok) {
          const data = (await response.json()) as any;
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed?.phrases) && parsed.phrases.length > 0) {
            return reply.send({
              phrases: parsed.phrases.slice(0, 3).map((p: any, idx: number) => ({
                id: `PITCH-${idx + 1}-${Date.now()}`,
                channel: String(p.channel || 'WhatsApp / Mensagem Rápida').slice(0, 60),
                title: String(p.title || 'Abordagem Comercial').slice(0, 80),
                text: String(p.text || '').slice(0, 500),
              })),
              source: 'gemini',
              quota: guardResult.quota,
            });
          }
        }
      } catch {
        clearTimeout(timeout);
      }
    }

    // Return safe deterministic approaches
    return reply.send({
      phrases: [
        {
          id: `PITCH-1-${Date.now()}`,
          channel: 'WhatsApp / Mensagem Rápida',
          title: 'Abordagem Direta & Convidativa',
          text: `Olá${safeCompany ? `, equipe da ${safeCompany}` : ''}! Notamos seu destaque em ${regionLabel} no setor de ${safeProf}. Podemos conversar 3 minutos esta semana sobre uma parceria prática?`,
        },
        {
          id: `PITCH-2-${Date.now()}`,
          channel: 'Abordagem Consultiva de Valor',
          title: 'Abordagem Consultiva de Valor',
          text: `Olá! Atuamos com ${safeProf} em ${regionLabel} ajudando empresas a otimizar custos e aumentar vendas. Posso te enviar 3 ideias rápidas aplicáveis à sua operação?`,
        },
        {
          id: `PITCH-3-${Date.now()}`,
          channel: 'Apresentação Formal / E-mail',
          title: 'Apresentação Formal / E-mail',
          text: `Prezado(a) gestor(a)${safeCompany ? ` da ${safeCompany}` : ''}, entro em contato para apresentar soluções de ${safeProf} voltadas para resultados em ${regionLabel}.`,
        },
      ],
      source: 'deterministic-fallback',
    });
  });

  // ============================================================================
  // SECURE BACKEND PROXY: GEMINI AI CHAT GATEWAY (Server-Side Secrets Only)
  // ============================================================================

  app.get('/api/ai/agents', { preHandler: [requireAuth] }, async (_req, reply) => {
    const agents = listAgencyAgentsSummary();
    return reply.send({
      total: agents.length,
      categories: ['sales', 'marketing', 'paid-media', 'finance', 'strategy'],
      agents,
    });
  });

  app.get('/api/ai/quota', { preHandler: [requireAuth] }, async (req, reply) => {
    const userSession = (req as any).userSession as AuthenticatedUserSession | undefined;
    const ctx = extractContext(req);
    const rawByokHeader = req.headers['x-gemini-user-key'];
    const hasByokAttempt = Boolean(
      (typeof rawByokHeader === 'string' && rawByokHeader.trim()) ||
        (Array.isArray(rawByokHeader) && rawByokHeader.length > 0 && rawByokHeader[0]?.trim())
    );
    const masterEmail = String(process.env.OWNER_MASTER_EMAIL || 'escorpsystems@gmail.com').trim().toLowerCase();
    const isMasterOwner =
      Boolean(userSession?.isOwner) ||
      Boolean(masterEmail && String(userSession?.email || '').trim().toLowerCase() === masterEmail);

    if (hasByokAttempt && !isMasterOwner) {
      return reply.status(403).send({
        error: 'FORBIDDEN_BYOK_ACCESS',
        message: 'Acesso negado: o uso de chave própria (BYOK) é exclusivo do Proprietário Master.',
      });
    }

    if (isMasterOwner) {
      const snapshot = await aiQuotaGuard.getQuotaSnapshot(ctx.userId, 'pro_lifetime', true);
      return reply.send({
        ...snapshot,
        limit: 999999,
        remaining: 999999,
        isOwner: true,
        role: 'owner',
        unlimitedQuota: true,
      });
    }
    const userPlanRecord = await pagBankService.getOrInitUserPlan(ctx.userId, {
      email: userSession?.email,
      isOwner: false,
    });
    const plan = normalizePlanTier(
      userPlanRecord.planStatus === 'active' ? userPlanRecord.plan : 'free'
    );
    const snapshot = await aiQuotaGuard.getQuotaSnapshot(ctx.userId, plan, false);
    return reply.send(snapshot);
  });

  app.post('/api/ai/chat', { bodyLimit: 8 * 1024 * 1024, preHandler: [requireAuth] }, async (req, reply) => {
    // 1. Prompt Validation (limite rígido de 1.500 caracteres)
    const { prompt, workspaceSnapshot, attachment, agentId } = (req.body as any) || {};
    if (!prompt || typeof prompt !== 'string' || prompt.length > MAX_AI_INPUT_CHARS) {
      return reply.status(400).send({
        error: 'INVALID_PROMPT',
        message: `Pergunta inválida ou excede o limite de ${MAX_AI_INPUT_CHARS} caracteres.`,
      });
    }

    // Validate optional multimodal attachment (Foto or Documento <= 5 MB)
    const ALLOWED_CHAT_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);
    let validatedAttachment: { fileName: string; mimeType: string; buffer: Buffer } | null = null;
    if (attachment && attachment.base64Data) {
      if (!attachment.mimeType || !ALLOWED_CHAT_MIMES.has(attachment.mimeType) || typeof attachment.base64Data !== 'string') {
        return reply.status(400).send({ error: 'INVALID_ATTACHMENT', message: 'Formato de anexo não suportado. Use JPG, PNG, WebP, PDF ou TXT.' });
      }
      const cleanB64 = attachment.base64Data.includes(',') ? attachment.base64Data.split(',')[1] : attachment.base64Data;
      const buf = Buffer.from(cleanB64, 'base64');
      if (buf.length === 0 || buf.length > 5 * 1024 * 1024) {
        return reply.status(400).send({ error: 'ATTACHMENT_TOO_LARGE', message: 'O anexo excede o limite máximo de 5 MB.' });
      }
      const hex = buf.subarray(0, 12).toString('hex').toLowerCase();
      const magicOk =
        (attachment.mimeType === 'image/jpeg' && hex.startsWith('ffd8ff')) ||
        (attachment.mimeType === 'image/png' && hex.startsWith('89504e47')) ||
        (attachment.mimeType === 'image/webp' && hex.startsWith('52494646') && buf.subarray(8, 12).toString('ascii') === 'WEBP') ||
        (attachment.mimeType === 'application/pdf' && buf.subarray(0, 4).toString('ascii') === '%PDF') ||
        attachment.mimeType === 'text/plain';
      if (!magicOk) {
        return reply.status(400).send({ error: 'MAGIC_BYTES_MISMATCH', message: 'Conteúdo do arquivo inválido para o tipo informado.' });
      }
      validatedAttachment = {
        fileName: String(attachment.fileName || 'anexo').slice(0, 80),
        mimeType: attachment.mimeType,
        buffer: buf,
      };
    }

    try {
      PromptSanitizer.detectInjection(prompt);
      PromptSanitizer.validateSafeInput(prompt);
      if (workspaceSnapshot?.profile?.profession) {
        PromptSanitizer.detectInjection(String(workspaceSnapshot.profile.profession));
      }
    } catch (err: any) {
      return reply.status(400).send({
        error: 'PROMPT_SECURITY_VIOLATION',
        message: 'A mensagem contém comandos que violam as políticas de segurança do sistema.',
        fallback: true,
      });
    }

    // 4. Enforce Plan, Rate Limit (10/min, 30/day), Atomic Monthly Quota & BYOK
    const guardResult = await enforceAiPlanAndQuota(req, reply);
    if (!guardResult) return;

    const apiKey = guardResult.apiKey;
    if (!apiKey) {
      return reply.send({
        text: null,
        fallback: true,
        quota: guardResult.quota,
        message: 'Chave Gemini não configurada no servidor. Acionando motor cognitivo local.',
      });
    }

    // 5. Call Gemini API via Server Side with AbortController (com margem para retries 429/503)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const profileProfession = workspaceSnapshot?.profile?.profession || 'Profissional / Gestor de Negócios';
      const profileArea = workspaceSnapshot?.profile?.areaAtuacao || workspaceSnapshot?.profile?.segment || 'Geral';
      const userName = workspaceSnapshot?.profile?.fullName || 'Usuário';
      const { mode: chatMode, hasExplicitObjection } = detectChatMode(prompt);
      const selectedAgents = selectAgentsForPrompt(
        prompt,
        typeof agentId === 'string' ? agentId : undefined,
        chatMode
      );
      const selectedAgent = selectedAgents[0] || null;
      const isMultiAgent = selectedAgents.length > 1;
      const isLiveMode = chatMode === 'LIVE_NEGOTIATION' && !isMultiAgent;

      const agentDirectiveBlock = isMultiAgent
        ? `\n\nEQUIPE MULTIAGENTE ACIONADA EM COLABORAÇÃO (${selectedAgents.map((a) => a.badge).join(' + ')}):
- REGRA OBRIGATÓRIA DE IDENTIDADE E SEPARAÇÃO: Utilize EXCLUSIVAMENTE os nomes próprios em português (${selectedAgents.map((a) => a.displayName).join(', ')}). É PROIBIDO citar nomes antigos em inglês (como Riley, Marcus, etc.) ou nomes técnicos de arquivos.
${selectedAgents
  .map(
    (ag) => `--- BLOCO DO ESPECIALISTA: ${ag.badge} ---
Nome Próprio: ${ag.displayName} (${ag.categoryLabel})
Playbook resumido:
${ag.instructions.slice(0, 1100)}`
  )
  .join('\n\n')}`
        : selectedAgent
        ? `\n\nESPECIALISTA ACIONADO DA EQUIPE (${selectedAgent.categoryLabel.toUpperCase()}):
- Seu Nome Próprio neste atendimento: ${selectedAgent.displayName} (${selectedAgent.categoryLabel})
- Identificador no sistema: ${selectedAgent.badge}
- REGRA OBRIGATÓRIA DE IDENTIDADE: Quando se apresentar ou for mencionado no texto, utilize EXCLUSIVAMENTE o nome próprio "${selectedAgent.displayName}" (ex: "Aqui é ${selectedAgent.displayName}..."). É PROIBIDO citar nomes antigos em inglês (como Riley, Marcus, etc.) ou nomes técnicos de arquivos/agentes em inglês.
- Playbook & Metodologia Técnica (aplique em Português Brasileiro dentro do cenário exato informado pelo usuário):
${isLiveMode ? selectedAgent.instructions.slice(0, 1400) : selectedAgent.instructions}`
        : '';

      const isFinanceMode = !isLiveMode && !isMultiAgent && selectedAgent?.category === 'finance';
      const isPaidMediaMode = !isLiveMode && !isMultiAgent && selectedAgent?.category === 'paid-media';
      const isMarketingMode = !isLiveMode && !isMultiAgent && selectedAgent?.category === 'marketing';

      const modeInstructionsBlock = isMultiAgent
        ? `
MODO ATIVO: COLABORAÇÃO MULTIAGENTE (${selectedAgents.map((a) => a.badge).join(' + ')}):
1. Estruture a resposta em blocos claramente separados para cada especialista acionado, começando cada bloco exatamente com o título em negrito:
${selectedAgents.map((a) => `   **${a.badge}:**`).join('\n')}
2. Cada especialista deve entregar orientações práticas, complementares e aplicáveis ao cenário exato informado pelo usuário, sem repetir o que o outro especialista já disse.
3. Caso Mike • Finanças esteja na equipe, ele deve calcular primeiro a margem disponível (ou pedir apenas os números faltantes da pergunta atual) antes de Lana • Vendas sugerir a resposta comercial ao cliente.`
        : isLiveMode
        ? hasExplicitObjection
          ? `
MODO ATIVO: NEGOCIAÇÃO AO VIVO (LANA • VENDAS — COM OBJEÇÃO / CONDIÇÃO) — COPILOTO NO PONTO ELETRÔNICO:
1. PROIBIDO saudações longas ("Olá...", "É um prazer..."), introduções, aulas teóricas ou listas extensas.
2. Responda em NO MÁXIMO 3 a 5 linhas curtas no total.
3. Cruze os dados do cliente, metas e eventuais regras de margem/ágio do snapshot quando disponíveis.
4. Entregue EXCLUSIVAMENTE neste formato enxuto:
   Jogada: <1 frase curta com a jogada estratégica/financeira>
   Envie agora: "<resposta exata, natural e persuasiva pronta para o vendedor copiar ou falar ao cliente>"`
          : `
MODO ATIVO: NEGOCIAÇÃO AO VIVO (LANA • VENDAS — SEM OBJEÇÃO DETALHADA) — COPILOTO NO PONTO ELETRÔNICO:
1. PROIBIDO saudações longas, explicações teóricas ou listas.
2. Responda imediatamente em NO MÁXIMO 2 a 3 linhas curtas, direto ao ponto, conduzindo o vendedor (ex: "Certo. Em que ponto da negociação vocês estão e o que ele está respondendo agora para eu te guiar até o fechamento?").`
        : isFinanceMode
        ? `
MODO ATIVO: CÁLCULOS PRÁTICOS DE META E MARGEM (MIKE • FINANÇAS):
1. Vá DIRETO ao cálculo objetivo usando EXCLUSIVAMENTE os números informados na pergunta atual do usuário (nunca invente nem repita contas de exemplos antigos).
2. Mostre a fórmula em texto limpo e legível (ex: Preço de Venda Mínimo = Custo / (1 - Margem% - Impostos% - Comissão%)).
3. Pergunte APENAS os dados exatos que faltam para fechar a conta real (ex: custo/piso do produto ou veículo, comissão e alíquota de impostos).
4. Seja objetivo e prático, sem introduções longas ou teoria genérica.`
        : isPaidMediaMode
        ? `
MODO ATIVO: ANÚNCIOS, TRÁFEGO PAGO E AQUISIÇÃO (LOIS • ANÚNCIOS):
1. Apresente-se EXCLUSIVAMENTE como **Lois • Anúncios**, especialista em Anúncios, Tráfego Pago e Aquisição do opensketch. É PROIBIDO se identificar como "Gerente de Vendas".
2. Se a aba Anúncios do snapshot estiver vazia (ads: []) e o usuário pedir estrutura de campanha, tráfego pago ou ideias de anúncios, informe brevemente em 1 linha que ainda não há anúncios salvos na aba Anúncios e entregue IMEDIATAMENTE a estrutura completa da campanha solicitada para "${profileProfession}" (${profileArea}):
   • Canais recomendados (Meta Ads, Google Ads, LinkedIn Ads conforme o público);
   • Segmentação de público / decisores;
   • Copy principal (gancho, oferta e CTA);
   • Etapas de funil (atração, qualificação e conversão).`
        : isMarketingMode
        ? `
MODO ATIVO: MARKETING, POSICIONAMENTO E AQUISIÇÃO ORGÂNICA (CLOWE • MARKETING):
1. Apresente-se EXCLUSIVAMENTE como **Clowe • Marketing**, especialista em Marketing, Posicionamento, Marca e Aquisição Orgânica do opensketch. É PROIBIDO se identificar como "Gerente de Vendas".
2. Entregue sempre estratégias práticas de posicionamento, autoridade de marca e aquisição orgânica adaptadas ao segmento exato do usuário ("${profileProfession}" / "${profileArea}"), com ações concretas e aplicáveis.`
        : `
MODO ATIVO: INSTRUÇÃO PRÁTICA & PLANEJAMENTO (${selectedAgent?.displayName?.toUpperCase() || 'COPILOTO'}):
- Entregue um passo a passo direto, concreto e aplicável na prática dentro do cenário exato informado pelo usuário, com listas simples (•).`;

      const systemContext = `
Você é o Copiloto Comercial e de Gestão Estratégica do sistema opensketch (ESCORP IDS), atuando com 4 frentes integradas: Negociação ao Vivo (Lana • Vendas), Atração e Conteúdo (Clowe • Marketing), Anúncios e Tráfego (Lois • Anúncios), Finanças e Margem (Mike • Finanças) e Estratégia (Lex • Estratégia).
Você atende ${userName} (perfil padrão cadastrado: "${profileProfession}" / "${profileArea}").

DIRETRIZ DE LIBERDADE DE CENÁRIO, FORMATAÇÃO LIMPA E PRECISÃO:
1. LIBERDADE TOTAL DE CENÁRIO: Responda sempre dentro do cenário, produto ou ramo exato que o usuário trouxer na pergunta (ex: vender carros, produtos físicos, imóveis, loja ou serviços). Nunca bloqueie, recuse ou corrija o ramo citado pelo usuário.
2. Se o usuário não especificar outro produto/ramo na pergunta, utilize o perfil cadastrado ("${profileProfession}") como contexto natural.
3. PROIBIÇÃO DE LATEX: É ESTRITAMENTE PROIBIDO usar sintaxe LaTeX ou delimitadores matemáticos como $$, $, \\frac, \\text, \\times ou \\approx. Escreva todas as fórmulas e contas em texto simples e legível (ex: Preço de Venda Mínimo = Custo / (1 - Margem% - Impostos% - Comissão%)).
4. Idioma: Português brasileiro claro, direto e prático.${modeInstructionsBlock}${agentDirectiveBlock}
`.trim();

      const userParts: any[] = [
        {
          text: `INFORMAÇÕES DO AMBIENTE:\n- Profissão Ativa: ${profileProfession}\n- Área: ${profileArea}\n- Snapshot de Clientes e Metas: ${JSON.stringify(workspaceSnapshot || {})}\n\nPergunta do Usuário: ${prompt}`,
        },
      ];

      if (validatedAttachment) {
        if (validatedAttachment.mimeType === 'text/plain') {
          const textAttach = validatedAttachment.buffer.toString('utf8').slice(0, 15000);
          userParts.push({
            text: `\n[Documento Anexo: ${validatedAttachment.fileName}]\n${textAttach}`,
          });
        } else {
          userParts.push({
            inlineData: {
              mimeType: validatedAttachment.mimeType,
              data: validatedAttachment.buffer.toString('base64'),
            },
          });
        }
        validatedAttachment = null;
      }

      const contents = [
        {
          role: 'user',
          parts: userParts,
        },
      ];

      const { response, model } = await callGeminiWithModelFallback(
        apiKey,
        {
          systemInstruction: {
            parts: [{ text: systemContext }],
          },
          contents,
          generationConfig: {
            temperature: isLiveMode ? 0.35 : isFinanceMode ? 0.25 : 0.6,
            maxOutputTokens: MAX_AI_OUTPUT_TOKENS,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        },
        controller.signal
      );

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[OPENsketch Backend Gemini] Erro HTTP ${response.status} ao consultar API externa (${model}).`);
        return reply.send({
          text: null,
          fallback: true,
          status: response.status,
          message: 'Instabilidade na API externa. Acionando motor cognitivo local.',
        });
      }

      const data = (await response.json()) as any;
      const candidate = data?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`[OPENsketch Backend Gemini] Resposta interrompida/incompleta (${model}) — finishReason=${finishReason}`);
      }

      const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
      const text = parts
        .filter((p: any) => !p?.thought && typeof p?.text === 'string')
        .map((p: any) => p.text)
        .join('\n')
        .trim();

      if (!text) {
        console.warn(`[OPENsketch Backend Gemini] Resposta vazia do modelo (${model}) — finishReason=${finishReason || 'UNKNOWN'}`);
        return reply.send({
          text: null,
          fallback: true,
          message: 'Resposta vazia do modelo. Acionando motor cognitivo local.',
        });
      }

      return reply.send({
        text,
        fallback: false,
        source: model,
        finishReason: finishReason || 'STOP',
        chatMode,
        quota: guardResult.quota,
        agentUsed: selectedAgent
          ? {
              id: isMultiAgent ? selectedAgents.map((a) => a.id).join('+') : selectedAgent.id,
              name: isMultiAgent ? selectedAgents.map((a) => a.displayName).join(' + ') : selectedAgent.displayName,
              displayName: isMultiAgent ? selectedAgents.map((a) => a.displayName).join(' + ') : selectedAgent.displayName,
              badge: isMultiAgent ? selectedAgents.map((a) => a.badge).join(' + ') : selectedAgent.badge,
              category: selectedAgent.category,
              categoryLabel: isMultiAgent
                ? selectedAgents.map((a) => a.categoryLabel).join(' + ')
                : selectedAgent.categoryLabel,
              emoji: isMultiAgent ? selectedAgents.map((a) => a.emoji).join(' ') : selectedAgent.emoji,
            }
          : null,
        agentsUsed: selectedAgents.map((a) => ({
          id: a.id,
          name: a.displayName,
          displayName: a.displayName,
          badge: a.badge,
          category: a.category,
          categoryLabel: a.categoryLabel,
          emoji: a.emoji,
        })),
      });
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn('[OPENsketch Backend Gemini] Falha de comunicação ou timeout. Degradação para motor local.');
      return reply.send({
        text: null,
        fallback: true,
        message: 'Timeout ou erro de rede no servidor. Acionando motor cognitivo local.',
      });
    }
  });

  // ============================================================================
  // SECURE BACKEND PROXY: GOOGLE PLACES SEARCH GATEWAY (Server-Side Secrets Only)
  // ============================================================================

  app.post('/api/prospecting/search', { preHandler: [requireAuth] }, async (req, reply) => {
    // 1. Session Auth (cookie or dev session)
    const sessionId = req.cookies[SESSION_COOKIE_NAME];
    let userId = 'local_user';

    if (sessionId && redis.get) {
      try {
        const sessionRaw = await redis.get(`sess:${sessionId}`);
        if (sessionRaw) {
          const parsed = JSON.parse(sessionRaw);
          userId = parsed.userId || userId;
        }
      } catch {}
    }

    // 2. Rate Limiting (40 req/min)
    const rateSubject = userId !== 'local_user' ? userId : req.ip || 'local_user';
    const placesAllowed = await enforceRateLimit('places_search', rateSubject, 40, 60);
    if (!placesAllowed) {
      return reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de buscas por minuto excedido.',
        fallback: true,
      });
    }

    const { query, profession, state, city } = (req.body as any) || {};

    if (query) {
      if (typeof query !== 'string' || query.length > 160) {
        return reply.status(400).send({
          error: 'INPUT_SECURITY_VIOLATION',
          message: 'Termo de busca inválido ou muito longo.',
          fallback: true,
        });
      }
      try {
        PromptSanitizer.validateSafeInput(query);
      } catch (err: any) {
        return reply.status(400).send({
          error: 'INPUT_SECURITY_VIOLATION',
          message: 'Termo de busca inválido.',
          fallback: true,
        });
      }
    }

    // 3. Server-Side Key Exclusively (process.env / SecretsVault)
    const apiKey = SecretsVault.get('GOOGLE_PLACES_API_KEY') || process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey || !query) {
      return reply.send({
        opportunities: null,
        fallback: true,
        message: 'Chave Google Places não configurada ou busca vazia. Utilizando catálogo local.',
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const searchQuery = [query, city, state, 'Brasil'].filter(Boolean).join(' ');
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=pt-BR`;

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[OPENsketch Backend Places] Erro HTTP ${response.status} ao consultar Places API.`);
        return reply.send({
          opportunities: null,
          fallback: true,
          status: response.status,
          message: 'Instabilidade na API Google Places. Ativando catálogo local.',
        });
      }

      const data = (await response.json()) as any;
      if (!data.results || !Array.isArray(data.results)) {
        return reply.send({
          opportunities: null,
          fallback: true,
        });
      }

      const opportunities = data.results.slice(0, 10).map((p: any, idx: number) => {
        const rating = typeof p.rating === 'number' ? p.rating : 4.5;
        const ratingsTotal = typeof p.user_ratings_total === 'number' ? p.user_ratings_total : 10;
        const fitScore = Math.min(99, Math.round(rating * 18 + Math.min(ratingsTotal, 20) * 0.45));

        return {
          id: p.place_id || `place_${idx}_${Date.now()}`,
          name: p.name || 'Estabelecimento Comercial',
          category: p.types && p.types[0] ? p.types[0].replace(/_/g, ' ') : profession || 'Comércio',
          rating,
          userRatingsTotal: ratingsTotal,
          address: p.formatted_address || 'Endereço comercial verificado',
          phone: '(11) 3000-0000',
          state: state || 'SP',
          city: city || 'São Paulo',
          area: profession || 'Comércio Geral',
          profession: profession || 'Geral',
          fitScore,
          latitude: p.geometry?.location?.lat || -23.5505,
          longitude: p.geometry?.location?.lng || -46.6333,
        };
      });

      return reply.send({
        opportunities,
        fallback: false,
        total: opportunities.length,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn('[OPENsketch Backend Places] Falha de comunicação ou timeout. Ativando catálogo local.');
      return reply.send({
        opportunities: null,
        fallback: true,
        message: 'Timeout ou erro na Google Places API. Ativando catálogo local.',
      });
    }
  });

  // ============================================================================
  // SECURE BACKEND PROXY: MULTIMODAL CLIENT EXTRACTION (EPHEMERAL / NO RETENTION)
  // ============================================================================
  app.post('/api/clients/extract-document', { bodyLimit: 8 * 1024 * 1024, preHandler: [requireAuth] }, async (req, reply) => {
    const userSession = (req as any).userSession as AuthenticatedUserSession | undefined;
    const userId = userSession?.userId || 'local_user';

    // 1. Rate Limiting (20 req/min por UID ou IP)
    const rateSubject = userId !== 'local_user' ? userId : req.ip || 'local_user';
    const allowed = await enforceRateLimit('client_extract', rateSubject, 20, 60);
    if (!allowed) {
      return reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de extrações por minuto excedido. Aguarde um instante.',
        fallback: true,
      });
    }

    const { fileName, mimeType, base64Data } = (req.body as any) || {};
    const ALLOWED_MIMES = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'text/plain',
    ]);

    if (!mimeType || !ALLOWED_MIMES.has(mimeType) || !base64Data || typeof base64Data !== 'string') {
      return reply.status(400).send({
        error: 'INVALID_FILE_PAYLOAD',
        message: 'Formato não suportado. Envie JPEG, PNG, WEBP, PDF ou TXT de até 5 MB.',
      });
    }

    // Strip optional data URL prefix safely
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    let fileBuffer: Buffer | null = Buffer.from(cleanBase64, 'base64');

    const MAX_BYTES = 5 * 1024 * 1024;
    if (fileBuffer.length === 0 || fileBuffer.length > MAX_BYTES) {
      fileBuffer = null;
      return reply.status(400).send({
        error: 'FILE_TOO_LARGE',
        message: 'O arquivo excede o limite máximo permitido de 5 MB.',
      });
    }

    // 2. Magic Bytes Validation for binary formats
    const hexHeader = fileBuffer.subarray(0, 12).toString('hex').toLowerCase();
    const isValidMagic =
      (mimeType === 'image/jpeg' && hexHeader.startsWith('ffd8ff')) ||
      (mimeType === 'image/png' && hexHeader.startsWith('89504e47')) ||
      (mimeType === 'image/webp' && hexHeader.startsWith('52494646') && fileBuffer.subarray(8, 12).toString('ascii') === 'WEBP') ||
      (mimeType === 'application/pdf' && fileBuffer.subarray(0, 4).toString('ascii') === '%PDF') ||
      mimeType === 'text/plain';

    if (!isValidMagic) {
      fileBuffer = null;
      return reply.status(400).send({
        error: 'MAGIC_BYTES_MISMATCH',
        message: 'O conteúdo do arquivo não corresponde ao tipo informado.',
      });
    }

    // Deterministic text fallback helper for text/plain when external key is absent
    const parsePlainTextFallback = (rawText: string) => {
      const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const cpfMatch = rawText.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
      const phoneMatch = rawText.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\d{4}|\d{4})[-.\s]?\d{4}/);
      const nomeLine = rawText.match(/(?:nome|cliente|contato|paciente)\s*[:\-]\s*([^\r\n]+)/i);
      const firstLine = rawText.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 2 && !l.includes('@') && !/\d{4,}/.test(l));
      const nome = (nomeLine ? nomeLine[1].trim() : firstLine || '').slice(0, 120);
      return {
        nome,
        cpf: cpfMatch ? cpfMatch[0].trim() : '',
        telefone: phoneMatch ? phoneMatch[0].trim() : '',
        email: emailMatch ? emailMatch[0].trim() : '',
        contexto: rawText.trim().slice(0, 500),
      };
    };

    const apiKey = SecretsVault.get('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      if (mimeType === 'text/plain') {
        const plainText = fileBuffer.toString('utf8').slice(0, 15000);
        fileBuffer = null;
        return reply.send({
          extracted: parsePlainTextFallback(plainText),
          fallback: false,
          source: 'local-text-parser',
        });
      }
      fileBuffer = null;
      return reply.send({
        extracted: null,
        fallback: true,
        message: 'Chave Gemini não configurada no servidor para leitura de imagem/PDF. Preencha os campos manualmente.',
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const systemPrompt = `
Você é um extrator rigoroso de dados cadastrais de clientes para o sistema OPENsketch.
Analise o documento ou imagem fornecida e extraia ESTRITAMENTE as informações legíveis presentes no arquivo, retornando APENAS um objeto JSON válido com exatamente estas 5 chaves:
{
  "nome": "",
  "cpf": "",
  "telefone": "",
  "email": "",
  "contexto": ""
}
REGRAS OBRIGATÓRIAS:
1. NUNCA invente, deduza ou complete dados que não estejam claramente visíveis no arquivo. Se um campo não existir, retorne "".
2. No campo "contexto", resuma de forma objetiva e útil observações comerciais, interesses, histórico ou detalhes extras presentes no documento (máximo 400 caracteres). Se não houver, retorne "".
3. Responda apenas com JSON válido.
`.trim();

      const parts: any[] = [];
      if (mimeType === 'text/plain') {
        const safeText = fileBuffer.toString('utf8').slice(0, 15000);
        parts.push({ text: `Arquivo de texto (${String(fileName || 'documento.txt').slice(0, 80)}):\n\n${safeText}` });
      } else {
        parts.push({
          inlineData: {
            mimeType,
            data: fileBuffer.toString('base64'),
          },
        });
        parts.push({ text: 'Extraia os dados cadastrais e o contexto deste documento conforme as instruções.' });
      }

      // Descartar buffer bruto da memória imediatamente após serialização
      fileBuffer = null;

      const { response, model } = await callGeminiWithModelFallback(
        apiKey,
        {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
          },
        },
        controller.signal
      );

      clearTimeout(timeout);

      if (!response.ok) {
        return reply.send({
          extracted: null,
          fallback: true,
          message: 'Não foi possível extrair os dados automaticamente no momento.',
        });
      }

      const data = (await response.json()) as any;
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(rawJson);

      return reply.send({
        extracted: {
          nome: typeof parsed.nome === 'string' ? parsed.nome.trim().slice(0, 120) : '',
          cpf: typeof parsed.cpf === 'string' ? parsed.cpf.trim().slice(0, 25) : '',
          telefone: typeof parsed.telefone === 'string' ? parsed.telefone.trim().slice(0, 30) : '',
          email: typeof parsed.email === 'string' ? parsed.email.trim().slice(0, 120) : '',
          contexto: typeof parsed.contexto === 'string' ? parsed.contexto.trim().slice(0, 500) : '',
        },
        fallback: false,
        source: model,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      fileBuffer = null;
      return reply.send({
        extracted: null,
        fallback: true,
        message: 'Falha ao processar o documento enviado. Preencha os dados manualmente.',
      });
    }
  });

  // ============================================================================
  // SECURE BACKEND PROXY: REGIONAL B2B PROSPECTION (ALL MUNICIPALITIES IN BRAZIL)
  // ============================================================================
  app.post('/api/ai/prospection', { preHandler: [requireAuth] }, async (req, reply) => {
    const userSession = (req as any).userSession as AuthenticatedUserSession | undefined;
    const userId = userSession?.userId || 'local_user';

    // 1. Rate Limiting (30 req/min por UID ou IP)
    const rateSubject = userId !== 'local_user' ? userId : req.ip || 'local_user';
    const allowed = await enforceRateLimit('ai_prospection', rateSubject, 30, 60);
    if (!allowed) {
      return reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Limite de buscas de prospecção excedido. Aguarde um instante.',
        fallback: true,
      });
    }

    const { profession, state, city } = (req.body as any) || {};
    const safeProf = String(profession || 'Gestão Geral').trim().slice(0, 100);
    const safeState = String(state || 'SP').trim().toUpperCase().slice(0, 10);
    const safeCity = String(city || '').trim().slice(0, 100);

    try {
      if (safeProf) PromptSanitizer.validateSafeInput(safeProf);
      if (safeCity) PromptSanitizer.validateSafeInput(safeCity);
    } catch {
      return reply.status(400).send({
        error: 'INPUT_SECURITY_VIOLATION',
        message: 'Parâmetros de busca inválidos.',
      });
    }

    const STATE_DDD_MAP: Record<string, { ddd: string; interiorDdd?: string; capital: string; lat: number; lng: number }> = {
      AC: { ddd: '68', capital: 'Rio Branco', lat: -9.975, lng: -67.824 },
      AL: { ddd: '82', capital: 'Maceió', lat: -9.666, lng: -35.735 },
      AM: { ddd: '92', interiorDdd: '97', capital: 'Manaus', lat: -3.119, lng: -60.021 },
      AP: { ddd: '96', capital: 'Macapá', lat: 0.035, lng: -51.07 },
      BA: { ddd: '71', interiorDdd: '75', capital: 'Salvador', lat: -12.971, lng: -38.501 },
      CE: { ddd: '85', interiorDdd: '88', capital: 'Fortaleza', lat: -3.717, lng: -38.543 },
      DF: { ddd: '61', capital: 'Brasília', lat: -15.794, lng: -47.882 },
      ES: { ddd: '27', interiorDdd: '28', capital: 'Vitória', lat: -20.315, lng: -40.312 },
      GO: { ddd: '62', interiorDdd: '64', capital: 'Goiânia', lat: -16.686, lng: -49.264 },
      MA: { ddd: '98', interiorDdd: '99', capital: 'São Luís', lat: -2.53, lng: -44.302 },
      MG: { ddd: '31', interiorDdd: '34', capital: 'Belo Horizonte', lat: -19.916, lng: -43.934 },
      MS: { ddd: '67', capital: 'Campo Grande', lat: -20.469, lng: -54.62 },
      MT: { ddd: '65', interiorDdd: '66', capital: 'Cuiabá', lat: -15.601, lng: -56.097 },
      PA: { ddd: '91', interiorDdd: '93', capital: 'Belém', lat: -1.455, lng: -48.502 },
      PB: { ddd: '83', capital: 'João Pessoa', lat: -7.119, lng: -34.845 },
      PE: { ddd: '81', interiorDdd: '87', capital: 'Recife', lat: -8.047, lng: -34.877 },
      PI: { ddd: '86', interiorDdd: '89', capital: 'Teresina', lat: -5.092, lng: -42.803 },
      PR: { ddd: '41', interiorDdd: '43', capital: 'Curitiba', lat: -25.428, lng: -49.273 },
      RJ: { ddd: '21', interiorDdd: '22', capital: 'Rio de Janeiro', lat: -22.906, lng: -43.172 },
      RN: { ddd: '84', capital: 'Natal', lat: -5.779, lng: -35.20 },
      RO: { ddd: '69', capital: 'Porto Velho', lat: -8.761, lng: -63.903 },
      RR: { ddd: '95', capital: 'Boa Vista', lat: 2.823, lng: -60.675 },
      RS: { ddd: '51', interiorDdd: '54', capital: 'Porto Alegre', lat: -30.034, lng: -51.217 },
      SC: { ddd: '48', interiorDdd: '47', capital: 'Florianópolis', lat: -27.595, lng: -48.548 },
      SE: { ddd: '79', capital: 'Aracaju', lat: -10.947, lng: -37.073 },
      SP: { ddd: '11', interiorDdd: '19', capital: 'São Paulo', lat: -23.55, lng: -46.633 },
      TO: { ddd: '63', capital: 'Palmas', lat: -10.184, lng: -48.333 },
    };

    const normalizedCityInput = safeCity.replace(/\s+/g, ' ').trim();
    const resolvedUf = safeState === 'TODOS' ? 'SP' : (STATE_DDD_MAP[safeState] ? safeState : 'SP');
    const ufMeta = STATE_DDD_MAP[resolvedUf];
    const targetCity = normalizedCityInput || ufMeta.capital;

    const translateOsmCategory = (tags: Record<string, string>): string => {
      const map: Record<string, string> = {
        supermarket: 'Supermercado',
        convenience: 'Mercearia / Conveniência',
        bakery: 'Padaria & Confeitaria',
        butcher: 'Açougue',
        clothes: 'Loja de Vestuário',
        shoes: 'Loja de Calçados',
        beauty: 'Estética & Beleza',
        hairdresser: 'Salão de Beleza / Barbearia',
        car_repair: 'Oficina Mecânica',
        car_parts: 'Autopeças',
        car: 'Concessionária / Veículos',
        electronics: 'Eletrônicos & Informática',
        mobile_phone: 'Telefonia & Acessórios',
        hardware: 'Materiais de Construção / Ferragens',
        furniture: 'Móveis & Decoração',
        optician: 'Ótica',
        jewelry: 'Joalheria / Relojoaria',
        books: 'Livraria / Papelaria',
        stationery: 'Papelaria',
        pet: 'Pet Shop',
        pharmacy: 'Farmácia / Drogaria',
        dentist: 'Clínica Odontológica',
        clinic: 'Clínica / Consultório Médico',
        doctors: 'Consultório Médico',
        hospital: 'Hospital / Saúde',
        veterinary: 'Clínica Veterinária',
        restaurant: 'Restaurante',
        cafe: 'Cafeteria / Lanchonete',
        fast_food: 'Lanchonete / Fast Food',
        bank: 'Agência Bancária',
        fuel: 'Posto de Combustíveis',
        marketplace: 'Mercado / Centro Comercial',
        estate_agent: 'Imobiliária',
        lawyer: 'Escritório de Advocacia',
        accountant: 'Escritório de Contabilidade',
        insurance: 'Corretora de Seguros',
        it: 'Tecnologia & Software',
        company: 'Empresa / Escritório',
      };
      const rawTag = tags.shop || tags.amenity || tags.office || tags.craft || '';
      if (map[rawTag]) return map[rawTag];
      if (rawTag) return rawTag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return safeProf && safeProf !== 'Todas as Profissões' ? safeProf : 'Comércio & Serviços';
    };

    const geocodeCityOsm = async (city: string, uf: string): Promise<{ lat: number; lng: number; detectedUf?: string }> => {
      const cleanCity = city.replace(/\s+/g, ' ').trim();
      const cacheKey = `${cleanCity.toLowerCase()}|${safeState === 'TODOS' ? 'ANY' : uf}`;
      const globalCache = ((globalThis as any).__osmGeocodeCache ||= new Map<string, { lat: number; lng: number; detectedUf?: string }>());
      if (globalCache.has(cacheKey)) {
        return globalCache.get(cacheKey)!;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const searchStr = safeState === 'TODOS' && normalizedCityInput
          ? `${cleanCity}, Brazil`
          : `${cleanCity}, ${uf}, Brazil`;
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchStr)}&format=json&limit=1&addressdetails=1`;
        const nomRes = await fetch(nomUrl, {
          headers: { 'User-Agent': 'opensketch-ESCORP-IDS/1.0 (escorpsystems@gmail.com)' },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (nomRes.ok) {
          const items = (await nomRes.json()) as Array<{ lat?: string; lon?: string; address?: Record<string, string> }>;
          if (Array.isArray(items) && items[0]?.lat && items[0]?.lon) {
            const iso = items[0].address?.['ISO3166-2-lvl4'] || '';
            const detectedUf = iso.startsWith('BR-') ? iso.slice(3).toUpperCase() : undefined;
            const coords = { lat: Number(items[0].lat), lng: Number(items[0].lon), detectedUf };
            if (Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
              globalCache.set(cacheKey, coords);
              return coords;
            }
          }
        }
      } catch {
        clearTimeout(timeout);
      }
      return { lat: ufMeta.lat, lng: ufMeta.lng };
    };

    const buildThreePoleOverpassQuery = (
      nodeSelectors: string[],
      lat: number,
      lng: number,
      radiusMeters = 5000
    ): string => {
      const poles = [
        { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }, // Polo 1: Centro Comercial / Financeiro
        { lat: Number((lat + 0.045).toFixed(6)), lng: Number((lng + 0.035).toFixed(6)) }, // Polo 2: Corredor Empresarial / Norte-Leste
        { lat: Number((lat - 0.040).toFixed(6)), lng: Number((lng - 0.035).toFixed(6)) }, // Polo 3: Polo de Serviços & Expansão / Sul-Oeste
      ];
      const poleBlocks = poles
        .map((p) => {
          const lines = nodeSelectors
            .map((sel) => `node${sel}(around:${radiusMeters},${p.lat},${p.lng});`)
            .join('');
          return `(${lines});out body 5;`;
        })
        .join('');
      return `[out:json][timeout:8];${poleBlocks}`;
    };

    const resolveProfessionSearchSpec = (profFilter: string): {
      buildOverpass: (lat: number, lng: number, radius?: number) => string;
      nominatimTerms: string[];
    } => {
      const pLower = profFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const makeSpec = (selectors: string[], nominatimTerms: string[]) => ({
        buildOverpass: (lat: number, lng: number, radius = 5000) =>
          buildThreePoleOverpassQuery(selectors, lat, lng, radius),
        nominatimTerms,
      });

      if (pLower.includes('tecnologia') || pLower.includes('software')) {
        return makeSpec(
          ['["office"="it"]["name"]', '["shop"="computer"]["name"]', '["office"="telecommunication"]["name"]'],
          ['tecnologia', 'software', 'informática', 'sistemas']
        );
      }
      if (pLower.includes('consultoria') || pLower.includes('gestao')) {
        return makeSpec(
          ['["office"="consulting"]["name"]', '["office"="accountant"]["name"]', '["office"="lawyer"]["name"]'],
          ['consultoria', 'contabilidade', 'assessoria']
        );
      }
      if (pLower.includes('odonto') || pLower.includes('dent')) {
        return makeSpec(
          ['["amenity"="dentist"]["name"]', '["healthcare"="dentist"]["name"]'],
          ['clínica odontológica', 'dentista']
        );
      }
      if (pLower.includes('imove') || pLower.includes('imobil') || pLower.includes('corretor')) {
        return makeSpec(
          ['["office"="estate_agent"]["name"]', '["office"="property_management"]["name"]'],
          ['imobiliária', 'construtora']
        );
      }
      if (pLower.includes('comercio') || pLower.includes('varejo')) {
        return makeSpec(
          ['["shop"="supermarket"]["name"]', '["shop"="department_store"]["name"]', '["shop"="clothes"]["name"]'],
          ['comércio', 'loja']
        );
      }
      if (pLower.includes('engenharia') || pLower.includes('constru')) {
        return makeSpec(
          ['["office"="architect"]["name"]', '["office"="engineer"]["name"]', '["craft"="builder"]["name"]', '["shop"="hardware"]["name"]'],
          ['engenharia', 'construtora', 'arquitetura']
        );
      }
      if (pLower.includes('saude') || pLower.includes('clinic')) {
        return makeSpec(
          ['["amenity"="clinic"]["name"]', '["amenity"="doctors"]["name"]', '["healthcare"="clinic"]["name"]'],
          ['clínica médica', 'consultório']
        );
      }
      if (pLower.includes('industria') || pLower.includes('fabrica')) {
        return makeSpec(
          ['["man_made"="works"]["name"]', '["office"="company"]["name"]'],
          ['indústria', 'fábrica']
        );
      }
      if (pLower.includes('advocacia') || pLower.includes('juridic')) {
        return makeSpec(
          ['["office"="lawyer"]["name"]', '["office"="notary"]["name"]'],
          ['advocacia', 'escritório de advocacia']
        );
      }
      if (pLower.includes('aliment') || pLower.includes('gastronom')) {
        return makeSpec(
          ['["amenity"="restaurant"]["name"]', '["amenity"="cafe"]["name"]', '["shop"="bakery"]["name"]'],
          ['restaurante', 'padaria']
        );
      }
      if (pLower.includes('mecan') || pLower.includes('oficina') || pLower.includes('auto')) {
        return makeSpec(
          ['["shop"="car_repair"]["name"]'],
          ['oficina mecânica', 'autopeças']
        );
      }
      // "Todas as Profissões"
      return makeSpec(
        ['["office"]["name"]', '["shop"]["name"]'],
        ['empresa', 'escritório']
      );
    };

    const queryOverpassPlaces = async (lat: number, lng: number, radiusMeters: number, profFilter: string) => {
      const spec = resolveProfessionSearchSpec(profFilter);
      const overpassQuery = spec.buildOverpass(lat, lng, radiusMeters);
      const overpassEndpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
      ];

      try {
        const result = await Promise.any(
          overpassEndpoints.map(async (endpoint) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4500);
            try {
              const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'opensketch-ESCORP-IDS/1.0',
                },
                body: `data=${encodeURIComponent(overpassQuery)}`,
                signal: controller.signal,
              });
              clearTimeout(timeout);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const contentType = res.headers.get('content-type') || '';
              if (!contentType.includes('json')) throw new Error('NON_JSON');
              const json = (await res.json()) as { elements?: any[] };
              if (!Array.isArray(json?.elements)) throw new Error('NO_ELEMENTS');
              return json.elements.slice(0, 15);
            } catch (err) {
              clearTimeout(timeout);
              throw err;
            }
          })
        );
        return result;
      } catch {
        return [];
      }
    };

    const queryNominatimPois = async (city: string, uf: string, profFilter: string, lat: number, lng: number) => {
      const { nominatimTerms } = resolveProfessionSearchSpec(profFilter);
      const termsToQuery = nominatimTerms.slice(0, 2);
      const viewbox = `${(lng - 0.14).toFixed(4)},${(lat + 0.14).toFixed(4)},${(lng + 0.14).toFixed(4)},${(lat - 0.14).toFixed(4)}`;
      const locationClause = safeState === 'TODOS' && normalizedCityInput ? `${city}, Brazil` : `${city}, ${uf}, Brazil`;

      const batches = await Promise.all(
        termsToQuery.map(async (term) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4500);
          try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${term}, ${locationClause}`)}&format=json&limit=8&addressdetails=1&extratags=1&bounded=1&viewbox=${viewbox}`;
            const res = await fetch(url, {
              headers: { 'User-Agent': 'opensketch-ESCORP-IDS/1.0' },
              signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) return [];
            const items = (await res.json()) as any[];
            if (!Array.isArray(items)) return [];
            const mapped: any[] = [];
            for (const it of items) {
              if (!it?.name && !it?.display_name) continue;
              if (!['shop', 'amenity', 'office', 'craft'].includes(it.class)) continue;
              if (it.type === 'place_of_worship') continue;
              const tags: Record<string, string> = {
                name: it.name || String(it.display_name).split(',')[0],
                ...(it.extratags || {}),
              };
              if (it.class === 'shop' && it.type) tags.shop = it.type;
              else if (it.class === 'amenity' && it.type) tags.amenity = it.type;
              else if (it.class === 'office' && it.type) tags.office = it.type;
              if (it.address?.road) tags['addr:street'] = it.address.road;
              if (it.address?.house_number) tags['addr:housenumber'] = it.address.house_number;
              if (it.address?.suburb) tags['addr:suburb'] = it.address.suburb;
              if (it.address?.city || it.address?.town || it.address?.municipality) {
                tags['addr:city'] = it.address.city || it.address.town || it.address.municipality;
              }
              mapped.push({
                type: it.osm_type || 'node',
                id: it.osm_id || it.place_id,
                lat: Number(it.lat),
                lon: Number(it.lon),
                tags,
              });
            }
            return mapped;
          } catch {
            clearTimeout(timeout);
            return [];
          }
        })
      );

      return batches.flat().slice(0, 15);
    };

    const fetchRealCityElements = async (
      city: string,
      uf: string,
      profFilter: string,
      minDesired: number
    ): Promise<{ elements: any[]; usedSource: string; detectedUf?: string }> => {
      const cityCache = ((globalThis as any).__osmCityCache ||= new Map<string, { ts: number; elements: any[]; usedSource: string; detectedUf?: string }>());
      const cKey = `${uf}|${city.toLowerCase()}|${profFilter.toLowerCase()}`;
      const cachedCity = cityCache.get(cKey);
      if (cachedCity && Date.now() - cachedCity.ts < 5 * 60 * 1000) {
        return cachedCity;
      }

      const center = await geocodeCityOsm(city, uf);
      const effectiveUf = (safeState === 'TODOS' && center.detectedUf) ? center.detectedUf : uf;
      const [overpassElements, nomPois] = await Promise.all([
        queryOverpassPlaces(center.lat, center.lng, 5000, profFilter),
        queryNominatimPois(city, effectiveUf, profFilter, center.lat, center.lng),
      ]);
      const seenNames = new Set<string>();
      const elements: any[] = [];
      for (const el of [...overpassElements, ...nomPois]) {
        const nameKey = String(el?.tags?.name || '').trim().toLowerCase();
        if (!nameKey || seenNames.has(nameKey)) continue;
        seenNames.add(nameKey);
        elements.push(el);
        if (elements.length >= 15) break;
      }
      const usedSource = overpassElements.length > 0 ? 'openstreetmap-overpass' : 'openstreetmap-nominatim';
      const tagged = elements.map((el) => ({ ...el, _resolvedCity: city, _resolvedUf: effectiveUf }));
      if (tagged.length > 0) {
        cityCache.set(cKey, { ts: Date.now(), elements: tagged, usedSource, detectedUf: center.detectedUf });
      }
      return { elements: tagged, usedSource, detectedUf: center.detectedUf };
    };

    try {
      const osmCache = ((globalThis as any).__osmProspectCache ||= new Map<string, { ts: number; data: any[] }>());
      const inFlight = ((globalThis as any).__osmInFlight ||= new Map<string, Promise<{ elements: any[]; usedSource: string; finalUf: string }>>());
      const prospectKey = `${safeState === 'TODOS' ? 'ANY' : resolvedUf}|${normalizedCityInput ? targetCity.toLowerCase() : '__STATE_WIDE__'}|${safeProf.toLowerCase()}`;
      const cached = osmCache.get(prospectKey);
      if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
        return reply.send({
          opportunities: cached.data,
          fallback: false,
          source: 'openstreetmap-overpass-cache',
        });
      }

      let loader = inFlight.get(prospectKey);
      if (!loader) {
        loader = (async () => {
          // Caso 1: Apenas Estado (UF) selecionado sem cidade digitada -> Busca rápida na Capital (raio 15km)
          if (!normalizedCityInput && safeState !== 'TODOS') {
            const res = await fetchRealCityElements(ufMeta.capital, resolvedUf, safeProf, 15);
            return { elements: res.elements.slice(0, 15), usedSource: res.usedSource, finalUf: resolvedUf };
          }

          // Caso 2: Município específico digitado/selecionado -> Busca direta por raio 15km (sem loops multi-cidade)
          const primaryRes = await fetchRealCityElements(targetCity, resolvedUf, safeProf, 15);
          const finalUf = (safeState === 'TODOS' && primaryRes.detectedUf) ? primaryRes.detectedUf : resolvedUf;
          return { elements: primaryRes.elements.slice(0, 15), usedSource: primaryRes.usedSource, finalUf };
        })();
        inFlight.set(prospectKey, loader);
      }

      let loadResult: { elements: any[]; usedSource: string; finalUf: string };
      try {
        loadResult = await loader;
      } finally {
        inFlight.delete(prospectKey);
      }

      const { elements, usedSource, finalUf } = loadResult;
      const seenNames = new Set<string>();
      const opportunities = elements
        .filter((el: any) => el?.tags?.name && typeof el.tags.name === 'string')
        .filter((el: any) => {
          const norm = el.tags.name.trim().toLowerCase();
          if (!norm || seenNames.has(norm)) return false;
          seenNames.add(norm);
          return true;
        })
        .slice(0, 25)
        .map((el: any, idx: number) => {
          const tags = el.tags || {};
          const lat = typeof el.lat === 'number' ? el.lat : Number(el.center?.lat ?? ufMeta.lat);
          const lng = typeof el.lon === 'number' ? el.lon : Number(el.center?.lon ?? ufMeta.lng);
          const category = translateOsmCategory(tags);
          const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
          const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'] || '';
          const cityName = tags['addr:city'] || el._resolvedCity || targetCity;
          const oppUf = el._resolvedUf || finalUf;
          const fullAddress = [street, suburb, `${cityName} - ${oppUf}`].filter(Boolean).join(' • ');
          const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '';
          const website = tags.website || tags['contact:website'] || '';
          const email = tags.email || tags['contact:email'] || '';

          return {
            id: `OSM-${el.type || 'node'}-${el.id || idx}`,
            name: String(tags.name).trim().slice(0, 120),
            category,
            rating: 4.7,
            userRatingsTotal: 1,
            address: fullAddress,
            phoneNumber: phone ? String(phone).slice(0, 40) : 'Sem telefone público',
            website: website ? String(website).slice(0, 160) : '',
            email: email ? String(email).slice(0, 120) : '',
            cnpj: '',
            state: oppUf,
            city: cityName,
            area: category,
            profession: category,
            fitScore: 92 - Math.min(idx, 12),
            estimatedVolume: 'Dados reais OpenStreetMap',
            contactPerson: tags.operator || 'Contato Comercial',
            notes: [
              `Estabelecimento real mapeado via OpenStreetMap (Overpass API) em ${cityName} - ${finalUf}.`,
              website ? `Site: ${website}` : '',
              tags.opening_hours ? `Horário OSM: ${tags.opening_hours}` : '',
            ]
              .filter(Boolean)
              .join(' '),
            latitude: lat,
            longitude: lng,
          };
        });

      if (opportunities.length > 0) {
        osmCache.set(prospectKey, { ts: Date.now(), data: opportunities });
      }

      return reply.send({
        opportunities,
        fallback: false,
        source: usedSource,
      });
    } catch {
      return reply.send({
        opportunities: [],
        fallback: true,
        source: 'openstreetmap-overpass-error',
      });
    }
  });

  // ============================================================================
  // USER PLAN & PAGBANK CHECKOUT / WEBHOOK ROUTES
  // ============================================================================

  app.post('/api/users/me/init', { preHandler: [requireAuth] }, async (req, reply) => {
    const user = (req as any).userSession as AuthenticatedUserSession;
    const body = (req.body as any) || {};
    const masterEmail = String(process.env.OWNER_MASTER_EMAIL || 'escorpsystems@gmail.com').trim().toLowerCase();
    const isMasterOwner =
      Boolean(user.isOwner) ||
      Boolean(masterEmail && String(user.email || '').trim().toLowerCase() === masterEmail);

    if (isMasterOwner) {
      return reply.send({
        uid: user.userId,
        email: user.email,
        name: typeof body.name === 'string' ? body.name.slice(0, 120) : undefined,
        role: 'owner',
        isOwner: true,
        plan: 'pro_lifetime',
        planStatus: 'active',
        lifetimeAccess: true,
        unlimitedQuota: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const record = await pagBankService.getOrInitUserPlan(user.userId, {
      email: typeof body.email === 'string' ? body.email.slice(0, 120) : user.email,
      name: typeof body.name === 'string' ? body.name.slice(0, 120) : undefined,
      isOwner: false,
    });
    return reply.send(record);
  });

  app.get('/api/users/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const user = (req as any).userSession as AuthenticatedUserSession;
    const masterEmail = String(process.env.OWNER_MASTER_EMAIL || 'escorpsystems@gmail.com').trim().toLowerCase();
    const isMasterOwner =
      Boolean(user.isOwner) ||
      Boolean(masterEmail && String(user.email || '').trim().toLowerCase() === masterEmail);

    if (isMasterOwner) {
      return reply.send({
        uid: user.userId,
        email: user.email,
        role: 'owner',
        isOwner: true,
        plan: 'pro_lifetime',
        planStatus: 'active',
        lifetimeAccess: true,
        unlimitedQuota: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const record = await pagBankService.getOrInitUserPlan(user.userId, {
      email: user.email,
      isOwner: false,
    });
    return reply.send(record);
  });

  app.get('/api/users/me/stream', { preHandler: [requireAuth] }, async (req, reply) => {
    const user = (req as any).userSession as AuthenticatedUserSession;
    const initial = await pagBankService.getOrInitUserPlan(user.userId, {
      email: user.email,
      isOwner: Boolean(user.isOwner),
    });

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    reply.raw.write(`data: ${JSON.stringify(initial)}\n\n`);

    const unsubscribe = pagBankService.subscribeUserPlan(user.userId, (updated) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(updated)}\n\n`);
      } catch {
        // connection closed
      }
    });

    const keepAlive = setInterval(() => {
      try {
        reply.raw.write(': keepalive\n\n');
      } catch {
        clearInterval(keepAlive);
      }
    }, 25000);

    req.raw.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });

    return reply;
  });

  // Checkout-First Anônimo pela Landing Page (sem uid prévio)
  app.post('/api/payments/checkout', async (req, reply) => {
    const allowed = await enforceRateLimit('anon_checkout', req.ip || 'anon', 5, 60);
    if (!allowed) {
      return reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas tentativas de checkout. Aguarde um minuto e tente novamente.',
      });
    }
    const body = (req.body as any) || {};
    const requestedPlan = String(body.plan || '').trim() as PaidPlanId;

    if (!Object.prototype.hasOwnProperty.call(PAGBANK_PLAN_CATALOG, requestedPlan)) {
      return reply.status(400).send({
        error: 'INVALID_PLAN',
        message: 'Plano inválido. Escolha essential_monthly ou pro_lifetime.',
      });
    }

    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const result = await pagBankService.createCheckout({
      plan: requestedPlan,
      customerEmail: typeof body.email === 'string' ? body.email.trim().slice(0, 120) : undefined,
      customerName: typeof body.name === 'string' ? body.name.trim().slice(0, 120) : undefined,
      customerTaxId: typeof body.cpf === 'string' ? body.cpf.trim().slice(0, 20) : undefined,
      originUrl: originHeader,
    });

    return reply.send(result);
  });

  app.get('/api/payments/activation-status', async (req, reply) => {
    const allowed = await enforceRateLimit('activation_status', req.ip || 'anon', 20, 60);
    if (!allowed) {
      return reply.status(429).send({
        valid: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas consultas seguidas. Aguarde um instante.',
      });
    }
    const query = (req.query as any) || {};
    const token = typeof query.token === 'string' ? query.token.trim() : '';
    const ref = typeof query.ref === 'string' ? query.ref.trim() : '';

    if (!token && !ref) {
      return reply.status(400).send({
        valid: false,
        error: 'MISSING_TOKEN_OR_REF',
        message: 'Informe o token de ativação ou referência do pedido.',
      });
    }

    const record = await pagBankService.getPaidActivation({ token, ref });
    if (!record) {
      return reply.status(404).send({
        valid: false,
        status: 'not_found',
        message: 'Ativação ainda não confirmada ou não encontrada. Se você acabou de pagar, aguarde alguns segundos e tente novamente.',
      });
    }

    if (record.status === 'completed') {
      return reply.status(409).send({
        valid: false,
        status: 'completed',
        message: 'Este link de ativação já foi utilizado. Faça login com sua conta em /entrar.',
      });
    }

    return reply.send({
      valid: true,
      status: record.status,
      activationToken: record.activationToken,
      referenceId: record.referenceId,
      email: record.email,
      name: record.name,
      plan: record.plan,
    });
  });

  app.post('/api/payments/complete-activation', { preHandler: [requireAuth] }, async (req, reply) => {
    const user = (req as any).userSession as AuthenticatedUserSession;
    const allowed = await enforceRateLimit('complete_activation', user.userId, 10, 60);
    if (!allowed) {
      return reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas tentativas de ativação. Aguarde um instante.',
      });
    }
    const body = (req.body as any) || {};
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const ref = typeof body.ref === 'string' ? body.ref.trim() : '';

    const record = await pagBankService.getPaidActivation({ token, ref });
    if (!record || record.status !== 'pending_signup') {
      return reply.status(400).send({
        error: 'INVALID_OR_USED_ACTIVATION',
        message: 'Token de ativação inválido ou já utilizado.',
      });
    }

    const targetUid = user.userId;
    await pagBankService.getOrInitUserPlan(targetUid, {
      email: user.email || record.email,
      name: record.name || (typeof body.name === 'string' ? body.name.slice(0, 120) : undefined),
    });
    const updatedPlan = await pagBankService.updateUserPlan(targetUid, record.plan, 'active');
    await pagBankService.completePaidActivation(record.activationToken, targetUid);

    return reply.send({
      activated: true,
      userPlan: updatedPlan,
    });
  });

  app.post('/api/payments/create-checkout', { preHandler: [requireAuth] }, async (req, reply) => {
    const user = (req as any).userSession as AuthenticatedUserSession;
    const allowed = await enforceRateLimit('user_checkout', user.userId, 5, 60);
    if (!allowed) {
      return reply.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas tentativas de checkout. Aguarde um minuto.',
      });
    }
    const body = (req.body as any) || {};
    const requestedPlan = String(body.plan || '').trim() as PaidPlanId;

    if (!Object.prototype.hasOwnProperty.call(PAGBANK_PLAN_CATALOG, requestedPlan)) {
      return reply.status(400).send({
        error: 'INVALID_PLAN',
        message: 'Plano inválido. Escolha essential_monthly ou pro_lifetime.',
      });
    }

    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const customerName = typeof body.name === 'string' ? body.name.slice(0, 120) : undefined;
    const result = await pagBankService.createCheckout({
      uid: user.userId,
      plan: requestedPlan,
      customerEmail: user.email,
      customerName,
      customerTaxId: typeof body.cpf === 'string' ? body.cpf.trim().slice(0, 20) : undefined,
      originUrl: originHeader,
    });

    if (user.email) {
      const planSpec = PAGBANK_PLAN_CATALOG[requestedPlan];
      const amountFormatted = (planSpec.amountCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      void sendPaymentInitiatedEmail({
        to: user.email,
        name: customerName,
        planName: planSpec.name,
        amountFormatted,
        checkoutUrl: result.checkoutUrl,
      }).catch(() => {});
    }

    return reply.send(result);
  });

  const processedWebhookRefs = new Set<string>();
  const recordProcessedWebhookRef = (ref: string) => {
    if (processedWebhookRefs.size >= 5000) {
      const oldest = processedWebhookRefs.values().next().value;
      if (oldest !== undefined) processedWebhookRefs.delete(oldest);
    }
    processedWebhookRefs.add(ref);
  };

  app.post('/api/webhooks/pagbank', async (req, reply) => {
    const rawBody = JSON.stringify(req.body || {});
    const sig = req.headers['x-authenticity-token'] || req.headers['x-pagbank-signature'];

    if (!pagBankService.verifyWebhookSignature(rawBody, sig)) {
      return reply.status(401).send({
        error: 'INVALID_WEBHOOK_SIGNATURE',
        message: 'Assinatura de webhook PagBank inválida.',
      });
    }

    const payload = (req.body as any) || {};
    const referenceId = String(payload?.reference_id || '');
    const charges = Array.isArray(payload?.charges) ? payload.charges : [];
    const chargeStatus = String(
      charges[0]?.status || payload?.status || ''
    ).toUpperCase();

    const [uidOrAnon, rawPlan] = referenceId.split(':');
    const isConfirmed = chargeStatus === 'PAID' || chargeStatus === 'AUTHORIZED' || chargeStatus === 'AVAILABLE';

    if (uidOrAnon && isConfirmed && (rawPlan === 'essential_monthly' || rawPlan === 'pro_lifetime')) {
      if (uidOrAnon === 'anon') {
        const customerEmail = String(payload?.customer?.email || '').trim().toLowerCase();
        const customerName = typeof payload?.customer?.name === 'string' ? payload.customer.name.trim() : '';
        if (!customerEmail) {
          return reply.status(400).send({
            error: 'MISSING_CUSTOMER_EMAIL',
            message: 'E-mail do comprador não informado no payload do PagBank.',
          });
        }
        const activation = await pagBankService.createPaidActivation({
          referenceId,
          email: customerEmail,
          name: customerName,
          plan: rawPlan,
        });
        if (activation.alreadyExisted || processedWebhookRefs.has(referenceId)) {
          return reply.send({ received: true, idempotent: true, activationToken: activation.activationToken });
        }
        recordProcessedWebhookRef(referenceId);
        const frontendUrl = (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
        const activationUrl = `${frontendUrl}/criar-conta?token=${encodeURIComponent(
          activation.activationToken
        )}&email=${encodeURIComponent(customerEmail)}`;

        void sendCheckoutActivationEmail({
          to: customerEmail,
          name: customerName || undefined,
          planName: PAGBANK_PLAN_CATALOG[rawPlan].name,
          isLifetime: rawPlan === 'pro_lifetime',
          activationUrl,
        }).catch(() => {});

        return reply.send({ received: true, activationCreated: true, activationToken: activation.activationToken });
      }

      if (processedWebhookRefs.has(referenceId)) {
        return reply.send({ received: true, idempotent: true });
      }
      recordProcessedWebhookRef(referenceId);

      const updated = await pagBankService.updateUserPlan(uidOrAnon, rawPlan, 'active');
      const targetEmail = updated.email || (typeof payload?.customer?.email === 'string' ? payload.customer.email : '');
      if (targetEmail) {
        void sendPaymentConfirmedEmail({
          to: targetEmail,
          name: updated.name || (typeof payload?.customer?.name === 'string' ? payload.customer.name : undefined),
          planName: PAGBANK_PLAN_CATALOG[rawPlan].name,
          isLifetime: rawPlan === 'pro_lifetime',
          nextBillingDate: updated.nextBillingDate,
        }).catch(() => {});
      }
      return reply.send({ received: true, updated });
    }

    return reply.send({ received: true, ignored: true });
  });

  return app;
}
