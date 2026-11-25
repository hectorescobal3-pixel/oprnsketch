import { FastifyReply } from 'fastify';

export const SESSION_COOKIE_NAME = '__Host-opensketch_sid';

export interface CookieConfigOptions {
  isProduction?: boolean;
  maxAgeSeconds?: number;
}

export class CookieSecurityManager {
  private static readonly DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

  /**
   * Generates hardened security cookie options strictly compliant with:
   * - REQ-SEC-02: __Host- prefix, HttpOnly, Secure, SameSite=Strict, Path=/
   */
  public static getSecureCookieOptions(options?: CookieConfigOptions) {
    const isProd = options?.isProduction ?? process.env.NODE_ENV === 'production';
    const maxAge = options?.maxAgeSeconds ?? this.DEFAULT_MAX_AGE;

    return {
      path: '/',
      httpOnly: true,
      secure: isProd, // Required true in production; required by __Host- spec in browsers
      sameSite: 'strict' as const,
      maxAge: maxAge,
      signed: true,
    };
  }

  /**
   * Sets the authenticated session cookie on the outgoing Fastify response.
   */
  public static setSessionCookie(reply: FastifyReply, sessionId: string, options?: CookieConfigOptions): void {
    const cookieOptions = this.getSecureCookieOptions(options);
    reply.setCookie(SESSION_COOKIE_NAME, sessionId, cookieOptions);
  }

  /**
   * Clears the session cookie during logout with matching security attributes.
   */
  public static clearSessionCookie(reply: FastifyReply): void {
    reply.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
}
