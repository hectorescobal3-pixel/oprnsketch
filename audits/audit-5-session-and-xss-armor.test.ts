import { describe, it, expect } from 'vitest';
import {
  validateAndParseUserSession,
  validateAndParseWorkspaceContext,
} from '../frontend/src/security/session-validator';
import {
  sanitizePlainText,
  escapeHtml,
  sanitizeEmail,
  sanitizePhone,
} from '../frontend/src/security/sanitizer';

describe('Auditoria 5: Blindagem de Sessão, Anti-Tampering & XSS Shield', () => {
  it('CRITÉRIO 5.1: Neutraliza injeções XSS em campos de formulário (<script>, <img> onerror, javascript:)', () => {
    // 1. Script tag injection
    const scriptPayload = '<script>alert("xss")</script>João Silva';
    expect(sanitizePlainText(scriptPayload)).toBe('João Silva');

    // 2. Img onerror event handler
    const eventHandlerPayload = '<img src="x" onerror="alert(1)">Observação confidencial';
    const cleanedText = sanitizePlainText(eventHandlerPayload);
    expect(cleanedText).not.toContain('onerror=');
    expect(cleanedText).toContain('Observação confidencial');

    // 3. Javascript: URI scheme
    const jsUriPayload = 'javascript:alert(document.cookie)';
    expect(sanitizePlainText(jsUriPayload)).toBe('blocked-scheme:alert(document.cookie)');

    // 4. HTML entity escaping
    const specialChars = '<div class="test">João & Maria</div>';
    expect(escapeHtml(specialChars)).toBe('&lt;div class=&quot;test&quot;&gt;João &amp; Maria&lt;/div&gt;');
  });

  it('CRITÉRIO 5.2: Sanitiza telefone e e-mail contra injeções de comando e cabeçalhos', () => {
    const maliciousEmail = 'user@exemplo.com<script>alert(1)</script>';
    expect(sanitizeEmail(maliciousEmail)).toBe('user@exemplo.com');

    const maliciousPhone = '(11) 98765-4321; DROP TABLE users; --';
    expect(sanitizePhone(maliciousPhone)).toBe('(11) 98765-4321 -');
  });

  it('CRITÉRIO 5.3: Session Validator rejeita sessões corrompidas ou forjadas no localStorage', () => {
    // 1. Non-string / null / undefined
    expect(validateAndParseUserSession(null)).toBeNull();
    expect(validateAndParseUserSession('')).toBeNull();
    expect(validateAndParseUserSession('123')).toBeNull();
    expect(validateAndParseUserSession('true')).toBeNull();

    // 2. Corrupted JSON syntax
    expect(validateAndParseUserSession('{ broken json')).toBeNull();

    // 3. Objeto sem propriedades obrigatórias (name / email)
    expect(validateAndParseUserSession('{"other": "data"}')).toBeNull();
    expect(validateAndParseUserSession('{"name": 123, "email": "valid@email.com"}')).toBeNull();

    // 4. Sessão válida é parseada e sanitizada com sucesso
    const validSession = JSON.stringify({
      email: 'joao.silva@exemplo.com.br',
      name: 'João Silva',
    });
    const parsed = validateAndParseUserSession(validSession);
    expect(parsed).toEqual({
      email: 'joao.silva@exemplo.com.br',
      name: 'João Silva',
    });
  });

  it('CRITÉRIO 5.4: Workspace Context Validator bloqueia tipos inválidos e restringe escopo estritamente', () => {
    // 1. Escopos não permitidos (ex: ADMIN, ROOT, SYSTEM) caem de volta para PERSONAL
    expect(validateAndParseWorkspaceContext('{"type": "ADMIN"}')).toEqual({ type: 'PERSONAL' });
    expect(validateAndParseWorkspaceContext('{"type": "ROOT"}')).toEqual({ type: 'PERSONAL' });
    expect(validateAndParseWorkspaceContext(null)).toEqual({ type: 'PERSONAL' });

    // 2. CORPORATE é validado com organizationId sanitizado
    const corporateContext = JSON.stringify({
      type: 'CORPORATE',
      organizationId: 'org-123<script>',
    });
    const parsedCorp = validateAndParseWorkspaceContext(corporateContext);
    expect(parsedCorp.type).toBe('CORPORATE');
    expect(parsedCorp.organizationId).toBe('org-123');

    // 3. PERSONAL nunca deve carregar organizationId
    const personalContaminated = JSON.stringify({
      type: 'PERSONAL',
      organizationId: 'leaked-org',
    });
    expect(validateAndParseWorkspaceContext(personalContaminated)).toEqual({
      type: 'PERSONAL',
      organizationId: undefined,
    });
  });
});
