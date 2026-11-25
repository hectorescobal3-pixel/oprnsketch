import { FastifyRequest, FastifyReply } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import Redis from 'ioredis';
import { SESSION_COOKIE_NAME } from './cookie-manager';

export interface AuthenticatedUserSession {
  userId: string;
  email: string;
  emailVerified?: boolean;
  isOwner?: boolean;
  ownerRole?: 'owner' | 'user';
  googleSub: string;
  sessionId: string;
  activeOrgId?: string | null;
  allowedOrgIds?: string[];
  scope: 'PERSONAL' | 'CORPORATE';
}

export class AuthGuard {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly redis: Redis,
    clientId: string
  ) {
    this.googleClient = new OAuth2Client(clientId);
  }

  /**
   * Validates Google ID Token received during OIDC callback.
   * Model: Zero Password Storage.
   */
  public async verifyGoogleIdToken(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('INVALID_OIDC_PAYLOAD: Missing sub or email from Google ID token.');
    }
    return {
      googleSub: payload.sub,
      email: payload.email,
      name: payload.name || '',
      avatar: payload.picture || '',
    };
  }

  /**
   * Validates Firebase Auth ID Token against Google Secure Token public x509 certs.
   */
  public async verifyFirebaseIdToken(idToken: string) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID_NOT_CONFIGURED');
    }
    const certsRes = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!certsRes.ok) {
      throw new Error('FIREBASE_CERTS_UNAVAILABLE');
    }
    const certs = (await certsRes.json()) as Record<string, string>;
    const loginTicket = await this.googleClient.verifySignedJwtWithCertsAsync(
      idToken,
      certs,
      projectId,
      [`https://securetoken.google.com/${projectId}`]
    );
    const payload = loginTicket.getPayload();
    if (!payload || !payload.sub) {
      throw new Error('INVALID_FIREBASE_TOKEN');
    }
    const email = String(payload.email || `${payload.sub}@firebase.opensketch.app`);
    const emailVerified = payload.email_verified === true;
    const masterEmail = String(process.env.OWNER_MASTER_EMAIL || 'escorpsystems@gmail.com').trim().toLowerCase();
    const isOwner = Boolean(masterEmail && emailVerified && email.trim().toLowerCase() === masterEmail);
    return {
      uid: payload.sub,
      email,
      emailVerified,
      isOwner,
      name: String(payload.name || ''),
    };
  }

  /**
   * Fastify PreHandler Hook: Validates active session from secure cookie & Redis.
   */
  public async authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing session cookie.' });
      return;
    }

    // Check Redis session state
    const sessionKey = `sess:${sessionId}`;
    const sessionRaw = await this.redis.get(sessionKey);

    if (!sessionRaw) {
      reply.status(401).send({ error: 'SESSION_EXPIRED', message: 'Session does not exist or expired.' });
      return;
    }

    const sessionData: AuthenticatedUserSession = JSON.parse(sessionRaw);

    // Context resolution from request headers (client passes X-Workspace-Context: "personal" | orgUuid)
    const clientScopeHeader = request.headers['x-workspace-context'] as string | undefined;
    if (clientScopeHeader && clientScopeHeader !== 'personal') {
      const normalizedHeader = String(clientScopeHeader).trim();
      const allowedList = Array.isArray(sessionData.allowedOrgIds)
        ? sessionData.allowedOrgIds
        : sessionData.activeOrgId
        ? [sessionData.activeOrgId]
        : [];
      const isAuthorizedOrg = allowedList.includes(normalizedHeader);
      if (!isAuthorizedOrg) {
        reply.status(403).send({
          error: 'FORBIDDEN_TENANT_ACCESS',
          message: 'Acesso negado: organização não vinculada ao usuário autenticado.',
        });
        return;
      }
      sessionData.scope = 'CORPORATE';
      sessionData.activeOrgId = normalizedHeader;
    } else {
      sessionData.scope = 'PERSONAL';
      sessionData.activeOrgId = null;
    }

    // Attach verified session to request context
    (request as any).userSession = sessionData;
  }

  /**
   * Revokes session immediately in Redis (O(1)).
   */
  public async revokeSession(sessionId: string): Promise<void> {
    await this.redis.del(`sess:${sessionId}`);
  }
}
