import { GoogleAuth } from 'google-auth-library';

const DATASTORE_SCOPES = ['https://www.googleapis.com/auth/datastore'];

/**
 * Cria cliente GoogleAuth para Firestore REST API com suporte a:
 * - Render / PaaS externos via variável `GOOGLE_SERVICE_ACCOUNT_JSON` (ou `FIREBASE_SERVICE_ACCOUNT_JSON`)
 * - Arquivo local via `GOOGLE_APPLICATION_CREDENTIALS` ou ADC do GCP
 */
export function createFirestoreGoogleAuth(): GoogleAuth {
  const rawJson = (
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    ''
  ).trim();

  if (rawJson) {
    try {
      const credentials = JSON.parse(rawJson);
      return new GoogleAuth({
        credentials,
        scopes: DATASTORE_SCOPES,
      });
    } catch (err) {
      console.warn(
        '[GoogleAuth] Falha ao interpretar GOOGLE_SERVICE_ACCOUNT_JSON; usando ADC padrão:',
        (err as Error)?.message || err
      );
    }
  }

  return new GoogleAuth({
    scopes: DATASTORE_SCOPES,
  });
}
