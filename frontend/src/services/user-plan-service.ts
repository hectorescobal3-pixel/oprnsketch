import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { getCurrentFirebaseIdToken, getFirebaseAuthClient, getFirebaseFirestoreDb } from './firebase-client';

export type SubscriptionPlan = 'free' | 'essential_monthly' | 'pro_lifetime';
export type PlanStatus = 'active' | 'pending' | 'canceled';

export interface UserPlanDocument {
  uid: string;
  email?: string;
  name?: string;
  role?: 'owner' | 'user';
  isOwner?: boolean;
  plan: SubscriptionPlan;
  planStatus: PlanStatus;
  lifetimeAccess?: boolean;
  unlimitedQuota?: boolean;
  updatedAt?: string;
}

function getFirestoreDb() {
  return getFirebaseFirestoreDb();
}

const OWNER_STATE_STORAGE_KEY = 'opensketch_owner_state';
const USER_PLAN_CACHE_PREFIX = 'opensketch_user_plan_';
export const MASTER_OWNER_EMAIL = 'escorpsystems@gmail.com';

export function isMasterOwnerEmail(email?: string | null): boolean {
  return String(email || '').trim().toLowerCase() === MASTER_OWNER_EMAIL;
}

function getApiBaseUrl(): string {
  try {
    const raw = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '';
    return String(raw).trim().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function getCachedPlanForUid(uid?: string | null): SubscriptionPlan | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(`${USER_PLAN_CACHE_PREFIX}${uid}`);
    if (raw === 'essential_monthly' || raw === 'pro_lifetime' || raw === 'free') {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCachedPlanForUid(uid: string | undefined, plan: SubscriptionPlan): void {
  if (!uid || uid === 'owner') return;
  try {
    localStorage.setItem(`${USER_PLAN_CACHE_PREFIX}${uid}`, plan);
  } catch {}
}

export function clearCachedPlanForUid(uid?: string | null): void {
  if (!uid) return;
  try {
    localStorage.removeItem(`${USER_PLAN_CACHE_PREFIX}${uid}`);
  } catch {}
}

let activeRuntimePlan: SubscriptionPlan = 'free';
let activeIsOwner = false;
const runtimeListeners = new Set<(doc: UserPlanDocument) => void>();

export function getActiveRuntimePlan(): SubscriptionPlan {
  return activeRuntimePlan;
}

export function setActiveRuntimePlan(plan: SubscriptionPlan): void {
  activeRuntimePlan = plan;
}

export function isActiveOwner(): boolean {
  return activeIsOwner;
}

export function getCachedOwnerUnlockState(): boolean {
  try {
    const raw = localStorage.getItem(OWNER_STATE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(
      (parsed?.isOwner === true || parsed?.role === 'owner') &&
        parsed?.lifetimeAccess === true &&
        parsed?.plan === 'pro_lifetime'
    );
  } catch {
    return false;
  }
}

export function clearCachedOwnerState(): void {
  activeIsOwner = false;
  activeRuntimePlan = 'free';
  try {
    localStorage.removeItem(OWNER_STATE_STORAGE_KEY);
  } catch {}
}

/**
 * Aplica imediatamente o estado de permissão retornado por qualquer endpoint autenticado do backend
 * (ex: /api/users/me/init, /api/users/me, /api/ai/quota, /api/ai/chat) no estado em memória e localStorage.
 */
export function applyAuthenticatedPlanState(data: Partial<UserPlanDocument> & { uid?: string }): UserPlanDocument {
  const authEmail = getFirebaseAuthClient()?.currentUser?.email;
  const isOwner =
    Boolean(data?.isOwner === true || data?.role === 'owner') ||
    isMasterOwnerEmail(data?.email) ||
    isMasterOwnerEmail(authEmail);
  const rawPlan = normalizeSubscriptionPlan(data?.plan);
  const lifetimeAccess = isOwner || Boolean(data?.lifetimeAccess) || rawPlan === 'pro_lifetime';
  const isActiveStatus = (data?.planStatus || 'active') === 'active';
  const resolvedPlan: SubscriptionPlan =
    isOwner || (lifetimeAccess && isActiveStatus) ? 'pro_lifetime' : rawPlan;
  const unlimitedQuota = isOwner || Boolean(data?.unlimitedQuota);

  activeIsOwner = isOwner;
  activeRuntimePlan = resolvedPlan;

  const normalizedDoc: UserPlanDocument = {
    uid: String(data?.uid || 'owner'),
    email: data?.email,
    name: data?.name,
    role: isOwner ? 'owner' : (data?.role || 'user'),
    isOwner,
    plan: resolvedPlan,
    planStatus: data?.planStatus || 'active',
    lifetimeAccess,
    unlimitedQuota,
    updatedAt: data?.updatedAt || new Date().toISOString(),
  };

  try {
    if (isOwner) {
      localStorage.setItem(
        OWNER_STATE_STORAGE_KEY,
        JSON.stringify({
          plan: 'pro_lifetime',
          isOwner: true,
          role: 'owner',
          lifetimeAccess: true,
          unlimitedQuota: true,
        })
      );
    } else {
      localStorage.removeItem(OWNER_STATE_STORAGE_KEY);
    }
    if (normalizedDoc.uid && normalizedDoc.uid !== 'owner') {
      saveCachedPlanForUid(normalizedDoc.uid, resolvedPlan);
    }
  } catch {}

  runtimeListeners.forEach((cb) => {
    try {
      cb(normalizedDoc);
    } catch {}
  });

  return normalizedDoc;
}

export function normalizeSubscriptionPlan(raw?: string | null): SubscriptionPlan {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'essential_monthly' || v === 'essencial') return 'essential_monthly';
  if (v === 'pro_lifetime' || v === 'vitalicio') return 'pro_lifetime';
  return 'free';
}

export async function initDefaultFreeUserPlan(user: {
  uid?: string;
  email: string;
  name: string;
}): Promise<UserPlanDocument> {
  const uid = getFirebaseAuthClient()?.currentUser?.uid || user.uid || user.email.toLowerCase();

  // 1. Consulta sempre o backend autenticado primeiro (valida JWT do Firebase e OWNER_MASTER_EMAIL no servidor)
  try {
    const idToken = await getCurrentFirebaseIdToken();
    const res = await fetch('/api/users/me/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ email: user.email, name: user.name }),
    });
    if (res.ok) {
      const data = (await res.json()) as UserPlanDocument;
      const applied = applyAuthenticatedPlanState({ ...data, uid: data.uid || uid });
      if (applied.plan !== 'free' || applied.isOwner) {
        return applied;
      }
    }
  } catch {
    // Fallback para Firestore client SDK se backend estiver indisponível
  }

  const db = getFirestoreDb();
  if (db) {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const normalizedEmail = user.email.trim().toLowerCase();
        let pendingPlanData: any = null;
        try {
          const pendingRef = doc(db, 'pending_subscriptions', normalizedEmail);
          const pendingSnap = await getDoc(pendingRef);
          if (pendingSnap.exists()) {
            pendingPlanData = pendingSnap.data();
          }
        } catch {
          // ignore if no pending subscription
        }

        const resolvedPendingPlan = normalizeSubscriptionPlan(pendingPlanData?.plan);
        const initial: UserPlanDocument = {
          uid,
          email: user.email,
          name: user.name,
          role: 'user',
          isOwner: false,
          plan: pendingPlanData ? resolvedPendingPlan : 'free',
          planStatus: 'active',
          lifetimeAccess: pendingPlanData ? Boolean(pendingPlanData?.lifetimeAccess) || resolvedPendingPlan === 'pro_lifetime' : false,
          unlimitedQuota: false,
          updatedAt: new Date().toISOString(),
        };
        await setDoc(ref, initial);
        return applyAuthenticatedPlanState(initial);
      } else {
        const data = snap.data() as any;
        const isOwner = Boolean(data?.isOwner || data?.role === 'owner');
        const rawPlan = normalizeSubscriptionPlan(data?.plan);
        const lifetimeAccess = isOwner || Boolean(data?.lifetimeAccess) || rawPlan === 'pro_lifetime';
        const isActiveStatus = (data?.planStatus || 'active') === 'active';
        const resolvedPlan: SubscriptionPlan =
          isOwner || (lifetimeAccess && isActiveStatus) ? 'pro_lifetime' : rawPlan;
        return applyAuthenticatedPlanState({
          uid,
          email: data?.email || user.email,
          name: data?.name || user.name,
          role: data?.role || 'user',
          isOwner,
          plan: resolvedPlan,
          planStatus: data?.planStatus || 'active',
          lifetimeAccess,
          unlimitedQuota: Boolean(data?.unlimitedQuota),
          updatedAt: data?.updatedAt,
        });
      }
    } catch {
      // Fallback seguro para cache local do UID caso offline
    }
  }

  const cachedPlan = getCachedPlanForUid(uid);
  if (cachedPlan && cachedPlan !== 'free') {
    activeIsOwner = false;
    setActiveRuntimePlan(cachedPlan);
    return {
      uid,
      email: user.email,
      name: user.name,
      role: 'user',
      isOwner: false,
      plan: cachedPlan,
      planStatus: 'active',
      lifetimeAccess: cachedPlan === 'pro_lifetime',
      unlimitedQuota: false,
      updatedAt: new Date().toISOString(),
    };
  }

  activeIsOwner = false;
  setActiveRuntimePlan('free');
  return {
    uid,
    email: user.email,
    name: user.name,
    role: 'user',
    isOwner: false,
    plan: 'free',
    planStatus: 'active',
    lifetimeAccess: false,
    unlimitedQuota: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Conecta listener em tempo real (`onSnapshot` no Firestore quando configurado + SSE `/api/users/me/stream`)
 * para destravar módulos automaticamente assim que o webhook do PagBank ou o backend confirmar.
 */
export function subscribeUserPlanRealtime(
  uid: string,
  onUpdate: (docData: UserPlanDocument) => void,
  emailHint?: string
): () => void {
  const cleanups: Array<() => void> = [];
  runtimeListeners.add(onUpdate);
  cleanups.push(() => runtimeListeners.delete(onUpdate));

  const resolvedUid = getFirebaseAuthClient()?.currentUser?.uid || uid;
  const resolvedEmail = (
    getFirebaseAuthClient()?.currentUser?.email ||
    emailHint ||
    (uid.includes('@') ? uid : '')
  )
    .trim()
    .toLowerCase();

  // Consulta imediata autenticada com Bearer token (/api/users/me/plan)
  getCurrentFirebaseIdToken()
    .then((idToken) =>
      fetch('/api/users/me/plan', {
        method: 'GET',
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
        credentials: 'include',
      })
    )
    .then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as UserPlanDocument;
        applyAuthenticatedPlanState({ ...data, uid: data.uid || resolvedUid });
      }
    })
    .catch(() => {});

  const db = getFirestoreDb();

  const migratePendingToUserDoc = async (pendingData: any, pendingEmail: string) => {
    if (!db || !resolvedUid || !pendingData?.plan || pendingData.plan === 'free') return;
    const plan = normalizeSubscriptionPlan(pendingData.plan);
    const nowIso = new Date().toISOString();
    const migratedDoc: UserPlanDocument & {
      planStartedAt?: string | null;
      planExpiresAt?: string | null;
      nextBillingDate?: string | null;
    } = {
      uid: resolvedUid,
      email: pendingEmail,
      name: pendingData.name || getFirebaseAuthClient()?.currentUser?.displayName || '',
      role: 'user',
      isOwner: false,
      plan,
      planStatus: 'active',
      lifetimeAccess: Boolean(pendingData.lifetimeAccess) || plan === 'pro_lifetime',
      unlimitedQuota: false,
      planStartedAt: pendingData.planStartedAt || nowIso,
      planExpiresAt: pendingData.planExpiresAt ?? null,
      nextBillingDate: pendingData.nextBillingDate ?? null,
      updatedAt: nowIso,
    };

    applyAuthenticatedPlanState(migratedDoc);
    try {
      await setDoc(doc(db, 'users', resolvedUid), migratedDoc, { merge: true });
      await deleteDoc(doc(db, 'pending_subscriptions', pendingEmail));
    } catch {
      // Caso já tenha sido migrado ou sem permissão, mantém estado aplicado
    }
  };

  if (db && resolvedUid) {
    try {
      const ref = doc(db, 'users', resolvedUid);
      const unsubUser = onSnapshot(ref, async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          if (normalizeSubscriptionPlan(data?.plan) === 'free' && (data?.email || resolvedEmail)) {
            const targetEmail = String(data?.email || resolvedEmail).trim().toLowerCase();
            try {
              const pendingSnap = await getDoc(doc(db, 'pending_subscriptions', targetEmail));
              if (pendingSnap.exists()) {
                await migratePendingToUserDoc(pendingSnap.data(), targetEmail);
                return;
              }
            } catch {}
          }
          applyAuthenticatedPlanState({ ...data, uid: resolvedUid });
        }
      });
      cleanups.push(unsubUser);
    } catch {
      // fallback SSE abaixo
    }
  }

  // Listener paralelo em tempo real para pending_subscriptions/{emailNormalizado}
  if (db && resolvedEmail) {
    try {
      const pendingRef = doc(db, 'pending_subscriptions', resolvedEmail);
      const unsubPending = onSnapshot(pendingRef, async (pendingSnap) => {
        if (pendingSnap.exists()) {
          await migratePendingToUserDoc(pendingSnap.data(), resolvedEmail);
        }
      });
      cleanups.push(unsubPending);
    } catch {
      // ignore pending listener errors
    }
  }

  if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource('/api/users/me/stream', { withCredentials: true });
      es.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data) as UserPlanDocument;
          if (parsed && parsed.plan) {
            applyAuthenticatedPlanState({ ...parsed, uid: parsed.uid || uid });
          }
        } catch {
          // ignore malformed event
        }
      };
      cleanups.push(() => es.close());
    } catch {
      // ignore SSE init errors
    }
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

export async function createPagBankCheckout(
  plan: 'essential_monthly' | 'pro_lifetime',
  name?: string
): Promise<{
  mode: string;
  checkoutId: string;
  referenceId: string;
  plan: 'essential_monthly' | 'pro_lifetime';
  amountCents: number;
  checkoutUrl: string | null;
  message?: string;
}> {
  const authUser = getFirebaseAuthClient()?.currentUser;
  const idToken = await getCurrentFirebaseIdToken();
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/payments/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      plan,
      name: name || authUser?.displayName || undefined,
      uid: authUser?.uid || undefined,
      email: authUser?.email || undefined,
    }),
  });

  if (!res.ok) {
    let errMsg = 'Não foi possível iniciar o checkout PagBank.';
    try {
      const errJson = await res.json();
      if (errJson?.message) errMsg = String(errJson.message);
    } catch {}
    throw new Error(errMsg);
  }

  return res.json();
}

export async function createAnonymousPagBankCheckout(
  plan: 'essential_monthly' | 'pro_lifetime'
): Promise<{
  mode: string;
  checkoutId: string;
  referenceId: string;
  plan: 'essential_monthly' | 'pro_lifetime';
  amountCents: number;
  checkoutUrl: string | null;
  message?: string;
}> {
  const apiBase = getApiBaseUrl();
  const res = await fetch(`${apiBase}/api/payments/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    let errMsg = 'Não foi possível iniciar o checkout PagBank.';
    try {
      const errJson = await res.json();
      if (errJson?.message) errMsg = String(errJson.message);
    } catch {}
    throw new Error(errMsg);
  }

  return res.json();
}

export async function validatePaidActivation(params: {
  token?: string | null;
  ref?: string | null;
}): Promise<{
  valid: boolean;
  status?: 'pending_signup' | 'completed' | 'not_found';
  activationToken?: string;
  referenceId?: string;
  email?: string;
  name?: string;
  plan?: 'essential_monthly' | 'pro_lifetime';
  message?: string;
}> {
  const apiBase = getApiBaseUrl();
  const qs = new URLSearchParams();
  if (params.token) qs.set('token', params.token);
  if (params.ref) qs.set('ref', params.ref);
  const res = await fetch(`${apiBase}/api/payments/activation-status?${qs.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      valid: false,
      status: data?.status,
      message: data?.message || 'Link de ativação inválido ou expirado.',
    };
  }
  return data;
}

export async function completePaidActivation(params: {
  token?: string | null;
  ref?: string | null;
  uid?: string | null;
  email?: string | null;
}): Promise<UserPlanDocument> {
  const apiBase = getApiBaseUrl();
  const idToken = await getCurrentFirebaseIdToken();
  const res = await fetch(`${apiBase}/api/payments/complete-activation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      token: params.token || undefined,
      ref: params.ref || undefined,
      uid: params.uid || undefined,
      email: params.email || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.userPlan) {
    throw new Error(data?.message || 'Não foi possível vincular seu plano pago à nova conta.');
  }
  return applyAuthenticatedPlanState(data.userPlan);
}
