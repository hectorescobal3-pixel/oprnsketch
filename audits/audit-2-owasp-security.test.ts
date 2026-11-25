import { describe, it, expect } from 'vitest';
import { CookieSecurityManager, SESSION_COOKIE_NAME } from '../backend/src/security/cookie-manager';

describe('Auditoria 2: Segurança OWASP, Cookies de Sessão & Rate Limiting', () => {
  it('CRITÉRIO 2.1: Cookie de sessão deve ter conformidade com REQ-SEC-02', () => {
    expect(SESSION_COOKIE_NAME).toBe('__Host-opensketch_sid');

    const options = CookieSecurityManager.getSecureCookieOptions({ isProduction: true });
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('strict');
    expect(options.path).toBe('/');
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it('CRITÉRIO 2.2: Cookie de sessão não pode omitir HttpOnly mesmo em desenvolvimento', () => {
    const devOptions = CookieSecurityManager.getSecureCookieOptions({ isProduction: false });
    expect(devOptions.httpOnly).toBe(true);
    expect(devOptions.sameSite).toBe('strict');
  });
});
