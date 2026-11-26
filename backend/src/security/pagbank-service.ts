import crypto from 'crypto';
import { EventEmitter } from 'events';
import { SecretsVault } from './secrets-vault';
import { createFirestoreGoogleAuth } from './google-auth-helper';

export type SubscriptionPlan = 'free' | 'essential_monthly' | 'pro_lifetime';
export type PaidPlanId = 'essential_monthly' | 'pro_lifetime';

export interface PaidActivationRecord {
  activationToken: string;
  referenceId: string;
  email: string;
  name: string;
  plan: PaidPlanId;
  status: 'pending_signup' | 'completed';
  paidAt: string;
  completedUid?: string;
  completedAt?: string;
}

export interface UserPlanRecord {
  uid: string;
  email?: string;
  name?: string;
  role: 'owner' | 'user';
  isOwner: boolean;
  plan: SubscriptionPlan;
  planStatus: 'active' | 'pending' | 'canceled';
  lifetimeAccess: boolean;
  unlimitedQuota: boolean;
  planStartedAt?: string | null;
  planExpiresAt?: string | null;
  nextBillingDate?: string | null;
  updatedAt: string;
}

export const PAGBANK_PLAN_CATALOG: Record<
  PaidPlanId,
  {
    id: PaidPlanId;
    name: string;
    description: string;
    amountCents: number;
    billingCycle: 'MONTHLY' | 'ONE_TIME';
  }
> = {
  essential_monthly: {
    id: 'essential_monthly',
    name: 'opensketch Plano Essencial (Mensal)',
    description: 'Desbloqueia 100% do ambiente Meu Trabalho incluindo Prospecção B2B e Biblioteca & Playbooks.',
    amountCents: 3999,
    billingCycle: 'MONTHLY',
  },
  pro_lifetime: {
    id: 'pro_lifetime',
    name: 'opensketch Plano Completo Vitalício',
    description: 'Desbloqueia Meu Trabalho + Minha Empresa + Centro de Inteligência Financeira & Margem + atualizações.',
    amountCents: 11999,
    billingCycle: 'ONE_TIME',
  },
};

export class PagBankBillingService {
  private readonly usersStore = new Map<string, UserPlanRecord>();
  private readonly paidActivationsStore = new Map<string, PaidActivationRecord>();
  private readonly emitter = new EventEmitter();
  private readonly googleAuth = createFirestoreGoogleAuth();

  private getFirestoreProjectId(): string | null {
    return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || null;
  }

  private async getFirestoreUser(uid: string): Promise<UserPlanRecord | null> {
    const projectId = this.getFirestoreProjectId();
    if (!projectId) return null;

    try {
      const client = await this.googleAuth.getClient();
      const token = (await client.getAccessToken())?.token;
      if (!token) return null;

      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;

      const doc = (await res.json()) as any;
      const f = doc?.fields || {};
      const planRaw = String(f?.plan?.stringValue || 'free');
      const plan: SubscriptionPlan =
        planRaw === 'essential_monthly' || planRaw === 'pro_lifetime' ? planRaw : 'free';
      const statusRaw = String(f?.planStatus?.stringValue || 'active');
      const planStatus: UserPlanRecord['planStatus'] =
        statusRaw === 'pending' || statusRaw === 'canceled' ? statusRaw : 'active';

      const roleRaw = String(f?.role?.stringValue || 'user');
      const role: 'owner' | 'user' = roleRaw === 'owner' ? 'owner' : 'user';
      const isOwner = Boolean(f?.isOwner?.booleanValue) || role === 'owner';
      const lifetimeAccess = Boolean(f?.lifetimeAccess?.booleanValue) || plan === 'pro_lifetime' || isOwner;
      const unlimitedQuota = Boolean(f?.unlimitedQuota?.booleanValue) || isOwner;

      return {
        uid,
        email: f?.email?.stringValue || undefined,
        name: f?.name?.stringValue || undefined,
        role,
        isOwner,
        plan: isOwner ? 'pro_lifetime' : plan,
        planStatus,
        lifetimeAccess,
        unlimitedQuota,
        planStartedAt: f?.planStartedAt?.timestampValue || f?.planStartedAt?.stringValue || null,
        planExpiresAt: f?.planExpiresAt?.timestampValue || f?.planExpiresAt?.stringValue || null,
        nextBillingDate: f?.nextBillingDate?.timestampValue || f?.nextBillingDate?.stringValue || null,
        updatedAt: f?.updatedAt?.timestampValue || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private async persistFirestoreUser(record: UserPlanRecord): Promise<void> {
    const projectId = this.getFirestoreProjectId();
    if (!projectId) return;

    try {
      const client = await this.googleAuth.getClient();
      const token = (await client.getAccessToken())?.token;
      if (!token) return;

      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/users/${encodeURIComponent(
        record.uid
      )}?updateMask.fieldPaths=plan&updateMask.fieldPaths=planStatus&updateMask.fieldPaths=subscriptionStatus&updateMask.fieldPaths=role&updateMask.fieldPaths=isOwner&updateMask.fieldPaths=lifetimeAccess&updateMask.fieldPaths=unlimitedQuota&updateMask.fieldPaths=email&updateMask.fieldPaths=name&updateMask.fieldPaths=planStartedAt&updateMask.fieldPaths=planExpiresAt&updateMask.fieldPaths=nextBillingDate&updateMask.fieldPaths=updatedAt`;

      const toNullableTimestampField = (iso?: string | null) =>
        iso ? { timestampValue: iso } : { nullValue: null };

      await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            plan: { stringValue: record.plan },
            planStatus: { stringValue: record.planStatus },
            subscriptionStatus: { stringValue: record.planStatus },
            role: { stringValue: record.role },
            isOwner: { booleanValue: record.isOwner },
            lifetimeAccess: { booleanValue: record.lifetimeAccess },
            unlimitedQuota: { booleanValue: record.unlimitedQuota },
            email: { stringValue: record.email || '' },
            name: { stringValue: record.name || '' },
            planStartedAt: toNullableTimestampField(record.planStartedAt),
            planExpiresAt: toNullableTimestampField(record.planExpiresAt),
            nextBillingDate: toNullableTimestampField(record.nextBillingDate),
            updatedAt: { timestampValue: record.updatedAt },
          },
        }),
      });
    } catch {
      // Fallback silencioso para memória local quando sem ADC
    }
  }

  public async getOrInitUserPlan(
    uid: string,
    profile?: { email?: string; name?: string; isOwner?: boolean }
  ): Promise<UserPlanRecord> {
    if (profile?.isOwner) {
      const ownerRecord: UserPlanRecord = {
        uid,
        email: profile?.email,
        name: profile?.name,
        role: 'owner',
        isOwner: true,
        plan: 'pro_lifetime',
        planStatus: 'active',
        lifetimeAccess: true,
        unlimitedQuota: true,
        updatedAt: new Date().toISOString(),
      };
      this.usersStore.set(uid, ownerRecord);
      await this.persistFirestoreUser(ownerRecord);
      return ownerRecord;
    }

    const fromFirestore = await this.getFirestoreUser(uid);
    if (fromFirestore) {
      this.usersStore.set(uid, fromFirestore);
      return fromFirestore;
    }

    const existing = this.usersStore.get(uid);
    if (existing) {
      return existing;
    }

    // Evita sobrescrever com 'free' se houver ativação paga pendente para o e-mail
    const normalizedEmail = (profile?.email || '').trim().toLowerCase();
    if (normalizedEmail) {
      for (const act of this.paidActivationsStore.values()) {
        if (act.email === normalizedEmail && act.status === 'pending_signup') {
          return this.updateUserPlan(uid, act.plan, 'active');
        }
      }
    }

    const initial: UserPlanRecord = {
      uid,
      email: profile?.email,
      name: profile?.name,
      role: 'user',
      isOwner: false,
      plan: 'free',
      planStatus: 'active',
      lifetimeAccess: false,
      unlimitedQuota: false,
      updatedAt: new Date().toISOString(),
    };
    this.usersStore.set(uid, initial);
    await this.persistFirestoreUser(initial);
    return initial;
  }

  public async updateUserPlan(uid: string, plan: SubscriptionPlan, planStatus: UserPlanRecord['planStatus'] = 'active'): Promise<UserPlanRecord> {
    const current = await this.getOrInitUserPlan(uid);
    const effectivePlan: SubscriptionPlan = current.isOwner ? 'pro_lifetime' : plan;
    const now = new Date();
    const nowIso = now.toISOString();

    let planStartedAt = current.planStartedAt ?? null;
    let planExpiresAt = current.planExpiresAt ?? null;
    let nextBillingDate = current.nextBillingDate ?? null;

    if (planStatus === 'active') {
      if (effectivePlan === 'essential_monthly') {
        const thirtyDaysAheadIso = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        planStartedAt = nowIso;
        planExpiresAt = thirtyDaysAheadIso;
        nextBillingDate = thirtyDaysAheadIso;
      } else if (effectivePlan === 'pro_lifetime') {
        planStartedAt = nowIso;
        planExpiresAt = null;
        nextBillingDate = null;
      }
    }

    const updated: UserPlanRecord = {
      ...current,
      plan: effectivePlan,
      planStatus,
      lifetimeAccess: current.isOwner || effectivePlan === 'pro_lifetime',
      planStartedAt,
      planExpiresAt,
      nextBillingDate,
      updatedAt: nowIso,
    };
    this.usersStore.set(uid, updated);
    await this.persistFirestoreUser(updated);
    this.emitter.emit(`user:${uid}`, updated);
    return updated;
  }

  public subscribeUserPlan(uid: string, listener: (record: UserPlanRecord) => void): () => void {
    const eventName = `user:${uid}`;
    this.emitter.on(eventName, listener);
    return () => {
      this.emitter.off(eventName, listener);
    };
  }

  /**
   * Cria sessão de checkout no PagBank usando valores fixos do servidor (3999 ou 11999 centavos).
   * Suporta tanto upgrade autenticado (com uid) quanto checkout anônimo da Landing Page (uid='anon').
   */
  public async createCheckout(params: {
    uid?: string;
    plan: PaidPlanId;
    customerEmail?: string;
    customerName?: string;
    customerTaxId?: string;
    originUrl?: string;
  }) {
    const planSpec = PAGBANK_PLAN_CATALOG[params.plan];
    const checkoutId = crypto.randomUUID();
    const isAnonymous = !params.uid || params.uid === 'anon' || params.uid === 'guest';
    const refOwner = isAnonymous ? 'anon' : params.uid;
    const referenceId = `${refOwner}:${planSpec.id}:${checkoutId}`;
    const rawToken = (SecretsVault.get('PAGBANK_TOKEN') || process.env.PAGBANK_TOKEN || '').trim();
    const pagbankToken = rawToken.replace(/^Bearer\s+/i, '').replace(/[\r\n]+/g, '').trim();
    const ordersEndpoint = 'https://api.pagseguro.com/orders';

    const frontendBase = (
      process.env.FRONTEND_URL ||
      params.originUrl ||
      process.env.APP_URL ||
      'https://opensketch-e7eb1.web.app'
    ).replace(/\/+$/, '');
    const publicHttpsBase = (
      frontendBase.startsWith('https://')
        ? frontendBase
        : process.env.APP_URL || 'https://opensketch-e7eb1.web.app'
    ).replace(/\/+$/, '');
    const webhookUrlEnv = (process.env.PAGBANK_WEBHOOK_URL || '').trim();
    const notificationUrl = webhookUrlEnv.startsWith('https://')
      ? webhookUrlEnv
      : `${publicHttpsBase}/api/webhooks/pagbank`;

    const safeCustomerName = (params.customerName || 'Cliente opensketch').trim().slice(0, 120);
    const safeCustomerEmail = (params.customerEmail || 'pagamentos@opensketch.app').trim().toLowerCase();
    const rawTaxDigits = String(params.customerTaxId || '').replace(/\D/g, '');
    const safeTaxId = rawTaxDigits.length === 11 || rawTaxDigits.length === 14 ? rawTaxDigits : '12345678909';
    const pixExpirationIso = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    if (pagbankToken) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(ordersEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${pagbankToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            reference_id: referenceId,
            customer: {
              name: safeCustomerName,
              email: safeCustomerEmail,
              tax_id: safeTaxId,
            },
            items: [
              {
                reference_id: planSpec.id,
                name: planSpec.name,
                quantity: 1,
                unit_amount: planSpec.amountCents,
              },
            ],
            qr_codes: [
              {
                amount: {
                  value: planSpec.amountCents,
                },
                expiration_date: pixExpirationIso,
              },
            ],
            notification_urls: [notificationUrl],
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          const qrCode = Array.isArray(data?.qr_codes) ? data.qr_codes[0] : null;
          const qrPngLink = Array.isArray(qrCode?.links)
            ? qrCode.links.find((l: any) => l?.rel === 'QRCODE.PNG')?.href || null
            : null;
          const qrBase64Link = Array.isArray(qrCode?.links)
            ? qrCode.links.find((l: any) => l?.rel === 'QRCODE.BASE64')?.href || null
            : null;
          return {
            mode: 'pagbank_pix' as const,
            checkoutId: data?.id || checkoutId,
            orderId: data?.id || checkoutId,
            referenceId,
            plan: planSpec.id,
            amountCents: planSpec.amountCents,
            checkoutUrl: null,
            pixCopyPaste: typeof qrCode?.text === 'string' ? qrCode.text : null,
            pixQrCodeUrl: qrPngLink || qrBase64Link || null,
            pixExpiresAt: qrCode?.expiration_date || pixExpirationIso,
          };
        } else {
          const errText = await res.text().catch(() => '');
          console.warn(`[PagBank] Orders API returned ${res.status}: ${errText}`);
          return {
            mode: 'pagbank_api_error' as const,
            checkoutId,
            referenceId,
            plan: planSpec.id,
            amountCents: planSpec.amountCents,
            checkoutUrl: null,
            message: `PagBank API retornou ${res.status}: ${errText || 'Verifique os dados do pedido.'}`,
          };
        }
      } catch {
        clearTimeout(timeout);
      }
    }

    return {
      mode: 'pagbank_pending_token' as const,
      checkoutId,
      referenceId,
      plan: planSpec.id,
      amountCents: planSpec.amountCents,
      checkoutUrl: null,
      message: 'Pedido preparado no servidor. Configure PAGBANK_TOKEN para gerar o PIX no PagBank.',
    };
  }

  /**
   * Valida assinatura HMAC-SHA256 enviada pelo PagBank no webhook.
   */
  public verifyWebhookSignature(rawBody: string, signatureHeader?: string | string[]): boolean {
    const rawSecret = (
      SecretsVault.get('PAGBANK_WEBHOOK_SECRET') ||
      process.env.PAGBANK_WEBHOOK_SECRET ||
      SecretsVault.get('PAGBANK_TOKEN') ||
      process.env.PAGBANK_TOKEN ||
      ''
    ).trim();
    const secret = rawSecret.replace(/^Bearer\s+/i, '').replace(/[\r\n]+/g, '').trim();

    if (!secret) {
      return process.env.NODE_ENV !== 'production';
    }

    const provided = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!provided || typeof provided !== 'string') {
      return false;
    }

    const cleanProvided = provided.replace(/^sha256=/i, '').trim().toLowerCase();
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex')
      .toLowerCase();

    if (cleanProvided.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(cleanProvided), Buffer.from(expected));
  }

  public async createPaidActivation(params: {
    referenceId: string;
    email: string;
    name?: string;
    plan: PaidPlanId;
  }): Promise<PaidActivationRecord & { alreadyExisted?: boolean }> {
    const existing = await this.getPaidActivation({ ref: params.referenceId });
    if (existing) {
      return { ...existing, alreadyExisted: true };
    }

    const activationToken = crypto.randomBytes(24).toString('hex');
    const record: PaidActivationRecord = {
      activationToken,
      referenceId: params.referenceId,
      email: params.email.trim().toLowerCase(),
      name: (params.name || '').trim(),
      plan: params.plan,
      status: 'pending_signup',
      paidAt: new Date().toISOString(),
    };
    this.paidActivationsStore.set(activationToken, record);

    const projectId = this.getFirestoreProjectId();
    if (projectId) {
      try {
        const client = await this.googleAuth.getClient();
        const token = (await client.getAccessToken())?.token;
        if (token) {
          const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
            projectId
          )}/databases/(default)/documents/paid_activations/${encodeURIComponent(activationToken)}`;
          await fetch(url, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                activationToken: { stringValue: record.activationToken },
                referenceId: { stringValue: record.referenceId },
                email: { stringValue: record.email },
                name: { stringValue: record.name },
                plan: { stringValue: record.plan },
                status: { stringValue: record.status },
                paidAt: { timestampValue: record.paidAt },
              },
            }),
          });
        }
      } catch {}
    }

    return record;
  }

  private parseFirestoreActivationDoc(doc: any): PaidActivationRecord | null {
    const f = doc?.fields;
    if (!f?.activationToken?.stringValue) return null;
    const rawPlan = f?.plan?.stringValue === 'pro_lifetime' ? 'pro_lifetime' : 'essential_monthly';
    const rawStatus = f?.status?.stringValue === 'completed' ? 'completed' : 'pending_signup';
    return {
      activationToken: String(f.activationToken.stringValue),
      referenceId: String(f?.referenceId?.stringValue || ''),
      email: String(f?.email?.stringValue || ''),
      name: String(f?.name?.stringValue || ''),
      plan: rawPlan,
      status: rawStatus,
      paidAt: String(f?.paidAt?.timestampValue || f?.paidAt?.stringValue || ''),
      completedUid: f?.completedUid?.stringValue || undefined,
      completedAt: f?.completedAt?.timestampValue || f?.completedAt?.stringValue || undefined,
    };
  }

  public async getPaidActivation(params: {
    token?: string;
    ref?: string;
  }): Promise<PaidActivationRecord | null> {
    const cleanToken = (params.token || '').trim();
    const cleanRef = (params.ref || '').trim();

    if (cleanToken && this.paidActivationsStore.has(cleanToken)) {
      return this.paidActivationsStore.get(cleanToken)!;
    }
    if (cleanRef) {
      for (const item of this.paidActivationsStore.values()) {
        if (item.referenceId === cleanRef) return item;
      }
    }

    const projectId = this.getFirestoreProjectId();
    if (!projectId) return null;

    try {
      const client = await this.googleAuth.getClient();
      const authToken = (await client.getAccessToken())?.token;
      if (!authToken) return null;

      if (cleanToken) {
        const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          projectId
        )}/databases/(default)/documents/paid_activations/${encodeURIComponent(cleanToken)}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } });
        if (res.ok) {
          const parsed = this.parseFirestoreActivationDoc(await res.json());
          if (parsed) {
            this.paidActivationsStore.set(parsed.activationToken, parsed);
            return parsed;
          }
        }
      }

      if (cleanRef) {
        const qUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          projectId
        )}/databases/(default)/documents:runQuery`;
        const qRes = await fetch(qUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: 'paid_activations' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'referenceId' },
                  op: 'EQUAL',
                  value: { stringValue: cleanRef },
                },
              },
              limit: 1,
            },
          }),
        });
        if (qRes.ok) {
          const rows = (await qRes.json()) as Array<{ document?: any }>;
          const parsed = this.parseFirestoreActivationDoc(rows?.[0]?.document);
          if (parsed) {
            this.paidActivationsStore.set(parsed.activationToken, parsed);
            return parsed;
          }
        }
      }
    } catch {}

    return null;
  }

  public async completePaidActivation(activationToken: string, completedUid: string): Promise<PaidActivationRecord | null> {
    const existing = await this.getPaidActivation({ token: activationToken });
    if (!existing) return null;

    const completedAt = new Date().toISOString();
    const updated: PaidActivationRecord = {
      ...existing,
      status: 'completed',
      completedUid,
      completedAt,
    };
    this.paidActivationsStore.set(activationToken, updated);

    const projectId = this.getFirestoreProjectId();
    if (projectId) {
      try {
        const client = await this.googleAuth.getClient();
        const token = (await client.getAccessToken())?.token;
        if (token) {
          const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
            projectId
          )}/databases/(default)/documents/paid_activations/${encodeURIComponent(
            activationToken
          )}?updateMask.fieldPaths=status&updateMask.fieldPaths=completedUid&updateMask.fieldPaths=completedAt`;
          await fetch(url, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                status: { stringValue: 'completed' },
                completedUid: { stringValue: completedUid },
                completedAt: { timestampValue: completedAt },
              },
            }),
          });
        }
      } catch {}
    }

    return updated;
  }
}
