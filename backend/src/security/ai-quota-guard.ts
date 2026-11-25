import Redis from 'ioredis';
import { createFirestoreGoogleAuth } from './google-auth-helper';

export type PlanTier = 'free' | 'essential_monthly' | 'pro_lifetime';

export const MAX_AI_INPUT_CHARS = 1500;
export const MAX_AI_OUTPUT_TOKENS = 700;
export const AI_RATE_LIMIT_PER_MINUTE = 10;
export const AI_RATE_LIMIT_PER_DAY = 30;

export const PLAN_MONTHLY_QUOTA: Record<PlanTier, number> = {
  free: 30,
  essential_monthly: 100,
  pro_lifetime: 150,
};

export interface AiQuotaSnapshot {
  uid: string;
  plan: PlanTier;
  used: number;
  limit: number;
  remaining: number;
  resetMonth: string;
  byokActive: boolean;
}

export function normalizePlanTier(raw?: string | null): PlanTier {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'free' || val === 'gratuito') {
    return 'free';
  }
  if (val === 'essential_monthly' || val === 'essencial') {
    return 'essential_monthly';
  }
  return 'pro_lifetime';
}

export function getCurrentMonthKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getCurrentDayKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Valida formato básico de chave API do Google Gemini fornecida pelo próprio usuário (BYOK).
 */
export function extractValidByokKey(rawHeader?: string | string[] | null): string | null {
  const raw = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!/^AIza[0-9A-Za-z_-]{20,80}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/**
 * Controlador atômico de franquia mensal de IA (`usage/{uid}`) com suporte a Firestore REST API
 * e espelhamento/fallback em Redis e memória local.
 */
export class AiQuotaGuard {
  private readonly memoryUsage = new Map<string, { count: number; resetMonth: string; plan: PlanTier }>();
  private readonly googleAuth = createFirestoreGoogleAuth();

  constructor(private readonly redis: Redis) {}

  private getFirestoreProjectId(): string | null {
    return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || null;
  }

  private async getFirestoreUsage(uid: string): Promise<{ count: number; resetMonth: string } | null> {
    const projectId = this.getFirestoreProjectId();
    if (!projectId) return null;

    try {
      const client = await this.googleAuth.getClient();
      const tokenResponse = await client.getAccessToken();
      const accessToken = tokenResponse?.token;
      if (!accessToken) return null;

      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/usage/${encodeURIComponent(uid)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 404) {
        return { count: 0, resetMonth: getCurrentMonthKey() };
      }
      if (!res.ok) return null;

      const doc = (await res.json()) as any;
      const fields = doc?.fields || {};
      const count = Number(fields?.count?.integerValue ?? 0);
      const resetMonth = String(fields?.resetMonth?.stringValue || getCurrentMonthKey());
      return { count: Number.isFinite(count) ? count : 0, resetMonth };
    } catch {
      return null;
    }
  }

  private async persistFirestoreUsage(uid: string, count: number, resetMonth: string, plan: PlanTier): Promise<void> {
    const projectId = this.getFirestoreProjectId();
    if (!projectId) return;

    try {
      const client = await this.googleAuth.getClient();
      const tokenResponse = await client.getAccessToken();
      const accessToken = tokenResponse?.token;
      if (!accessToken) return;

      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/usage/${encodeURIComponent(uid)}?updateMask.fieldPaths=count&updateMask.fieldPaths=resetMonth&updateMask.fieldPaths=plan&updateMask.fieldPaths=updatedAt`;

      await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            count: { integerValue: String(count) },
            resetMonth: { stringValue: resetMonth },
            plan: { stringValue: plan },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      });
    } catch {
      // Silencioso para manter resiliência caso ADC não esteja configurado localmente
    }
  }

  public async getQuotaSnapshot(uid: string, plan: PlanTier, byokActive = false): Promise<AiQuotaSnapshot> {
    const currentMonth = getCurrentMonthKey();
    const limit = PLAN_MONTHLY_QUOTA[plan];

    // 1. Tenta Firestore primeiro quando configurado
    const firestoreDoc = await this.getFirestoreUsage(uid);
    if (firestoreDoc) {
      const used = firestoreDoc.resetMonth === currentMonth ? firestoreDoc.count : 0;
      return {
        uid,
        plan,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        resetMonth: currentMonth,
        byokActive,
      };
    }

    // 2. Fallback Redis
    const redisKey = `ai_usage:${uid}:${currentMonth}`;
    if (typeof (this.redis as any).get === 'function') {
      try {
        const raw = await (this.redis as any).get(redisKey);
        if (raw !== null) {
          const used = Math.max(0, Number(raw) || 0);
          return {
            uid,
            plan,
            used,
            limit,
            remaining: Math.max(0, limit - used),
            resetMonth: currentMonth,
            byokActive,
          };
        }
      } catch {
        // Fallback para memória
      }
    }

    // 3. Fallback em memória
    const mem = this.memoryUsage.get(uid);
    const used = mem && mem.resetMonth === currentMonth ? mem.count : 0;
    return {
      uid,
      plan,
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetMonth: currentMonth,
      byokActive,
    };
  }

  /**
   * Verifica e incrementa atomicamente a cota mensal ANTES de chamar o Gemini.
   * Quando `byokActive` é true, não consome a cota do servidor.
   */
  public async consumeMonthlyQuota(
    uid: string,
    plan: PlanTier,
    byokActive = false
  ): Promise<{ allowed: boolean; snapshot: AiQuotaSnapshot }> {
    const currentMonth = getCurrentMonthKey();
    const limit = PLAN_MONTHLY_QUOTA[plan];

    if (byokActive) {
      const snapshot = await this.getQuotaSnapshot(uid, plan, true);
      return { allowed: true, snapshot };
    }

    const currentSnapshot = await this.getQuotaSnapshot(uid, plan, false);
    if (currentSnapshot.used >= limit) {
      return { allowed: false, snapshot: currentSnapshot };
    }

    let nextCount = currentSnapshot.used + 1;
    const redisKey = `ai_usage:${uid}:${currentMonth}`;

    if (typeof (this.redis as any).incr === 'function') {
      try {
        const incremented = await (this.redis as any).incr(redisKey);
        if (incremented === 1 && typeof (this.redis as any).expire === 'function') {
          await (this.redis as any).expire(redisKey, 35 * 24 * 60 * 60);
        }
        nextCount = Math.max(nextCount, Number(incremented) || nextCount);
        if (nextCount > limit) {
          if (typeof (this.redis as any).decr === 'function') {
            await (this.redis as any).decr(redisKey);
          }
          return {
            allowed: false,
            snapshot: {
              uid,
              plan,
              used: limit,
              limit,
              remaining: 0,
              resetMonth: currentMonth,
              byokActive: false,
            },
          };
        }
      } catch {
        // Segue com contador em memória
      }
    }

    this.memoryUsage.set(uid, { count: nextCount, resetMonth: currentMonth, plan });
    await this.persistFirestoreUsage(uid, nextCount, currentMonth, plan);

    return {
      allowed: true,
      snapshot: {
        uid,
        plan,
        used: nextCount,
        limit,
        remaining: Math.max(0, limit - nextCount),
        resetMonth: currentMonth,
        byokActive: false,
      },
    };
  }
}
