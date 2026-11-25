import { createFirestoreGoogleAuth } from './google-auth-helper';
import {
  sendOverdue7DaysEmail,
  sendRenewalReminder3DaysEmail,
} from './email-service';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const googleAuth = createFirestoreGoogleAuth();

let jobStarted = false;

function getProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || null;
}

function getAppBaseUrl(): string {
  const origins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '').split(',')[0]?.trim();
  return origins || 'https://opensketch-e7eb1.web.app';
}

async function patchUserReminderFlag(
  projectId: string,
  token: string,
  uid: string,
  field: 'reminder3DaysSentFor' | 'overdue7DaysSentFor',
  value: string
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/users/${encodeURIComponent(uid)}?updateMask.fieldPaths=${field}`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        [field]: { stringValue: value },
      },
    }),
  });
}

export async function runBillingReminderCheck(): Promise<void> {
  const projectId = getProjectId();
  if (!projectId) return;

  try {
    const client = await googleAuth.getClient();
    const token = (await client.getAccessToken())?.token;
    if (!token) return;

    const queryUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents:runQuery`;

    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'plan' },
              op: 'EQUAL',
              value: { stringValue: 'essential_monthly' },
            },
          },
        },
      }),
    });

    if (!res.ok) return;
    const rows = (await res.json()) as Array<{ document?: { name?: string; fields?: Record<string, any> } }>;
    if (!Array.isArray(rows)) return;

    const nowMs = Date.now();
    const checkoutUrl = `${getAppBaseUrl().replace(/\/$/, '')}/planos`;

    for (const row of rows) {
      const doc = row?.document;
      if (!doc?.name || !doc.fields) continue;

      const f = doc.fields;
      const plan = String(f?.plan?.stringValue || '');
      const planStatus = String(f?.planStatus?.stringValue || '');
      const lifetimeAccess = Boolean(f?.lifetimeAccess?.booleanValue);
      const nextBillingDate = String(
        f?.nextBillingDate?.timestampValue || f?.nextBillingDate?.stringValue || ''
      ).trim();

      if (plan === 'pro_lifetime' || lifetimeAccess === true) continue;
      if (plan !== 'essential_monthly' || planStatus !== 'active' || !nextBillingDate) continue;

      const email = String(f?.email?.stringValue || '').trim();
      if (!email) continue;

      const dueMs = new Date(nextBillingDate).getTime();
      if (Number.isNaN(dueMs)) continue;

      const uid = doc.name.split('/').pop() || '';
      if (!uid) continue;

      const name = String(f?.name?.stringValue || '').trim() || undefined;
      const reminder3DaysSentFor = String(f?.reminder3DaysSentFor?.stringValue || '');
      const overdue7DaysSentFor = String(f?.overdue7DaysSentFor?.stringValue || '');

      const msUntilDue = dueMs - nowMs;
      const daysUntilDue = msUntilDue / DAY_MS;
      const daysOverdue = (nowMs - dueMs) / DAY_MS;

      if (msUntilDue >= 0 && daysUntilDue <= 3 && reminder3DaysSentFor !== nextBillingDate) {
        await sendRenewalReminder3DaysEmail({
          to: email,
          name,
          dueDate: nextBillingDate,
          checkoutUrl,
        });
        await patchUserReminderFlag(projectId, token, uid, 'reminder3DaysSentFor', nextBillingDate);
      } else if (daysOverdue >= 7 && overdue7DaysSentFor !== nextBillingDate) {
        await sendOverdue7DaysEmail({
          to: email,
          name,
          dueDate: nextBillingDate,
          checkoutUrl,
        });
        await patchUserReminderFlag(projectId, token, uid, 'overdue7DaysSentFor', nextBillingDate);
      }
    }
  } catch (err) {
    console.warn('[BillingReminderJob] Erro na verificação periódica:', (err as Error)?.message || err);
  }
}

export function startBillingReminderJob(): void {
  if (jobStarted || process.env.VITEST) return;
  jobStarted = true;

  void runBillingReminderCheck();
  const timer = setInterval(() => {
    void runBillingReminderCheck();
  }, SIX_HOURS_MS);
  timer.unref();
}
