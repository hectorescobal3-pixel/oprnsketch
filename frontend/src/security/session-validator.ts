// ==============================================================================
// OPENsketch Session Validator & LocalStorage Armor
// Prevents Session Tampering, Prototype Pollution, and Corrupt JSON State Attacks
// ==============================================================================

import { sanitizePlainText, sanitizeEmail } from './sanitizer';

export interface ValidatedUser {
  email: string;
  name: string;
}

export interface ValidatedWorkspaceContext {
  type: 'PERSONAL' | 'CORPORATE';
  organizationId?: string;
}

/**
 * Validates and safely parses current user session from raw storage string.
 * Rejects corrupt structures, non-objects, prototype pollution, or missing fields.
 */
export function validateAndParseUserSession(rawJson: string | null): ValidatedUser | null {
  if (!rawJson || typeof rawJson !== 'string') return null;

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    // Check prototype pollution attempts
    if (
      Object.prototype.hasOwnProperty.call(parsed, '__proto__') ||
      Object.prototype.hasOwnProperty.call(parsed, 'constructor') ||
      Object.prototype.hasOwnProperty.call(parsed, 'prototype')
    ) {
      console.warn('SECURITY_ALERT: Prototype pollution attempt detected in storage session.');
      return null;
    }

    const email = parsed.email;
    const name = parsed.name;

    if (typeof email !== 'string' || typeof name !== 'string') {
      return null;
    }

    const cleanEmail = sanitizeEmail(email);
    const cleanName = sanitizePlainText(name);

    if (!cleanEmail || !cleanName) {
      return null;
    }

    return {
      email: cleanEmail,
      name: cleanName,
    };
  } catch {
    return null;
  }
}

/**
 * Validates workspace context state to strictly allow only 'PERSONAL' or 'CORPORATE'.
 */
export function validateAndParseWorkspaceContext(
  rawJson: string | null
): ValidatedWorkspaceContext {
  if (!rawJson || typeof rawJson !== 'string') {
    return { type: 'PERSONAL' };
  }

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      return { type: 'PERSONAL' };
    }

    const type = parsed.type === 'CORPORATE' ? 'CORPORATE' : 'PERSONAL';
    const orgId =
      typeof parsed.organizationId === 'string'
        ? sanitizePlainText(parsed.organizationId)
        : undefined;

    return {
      type,
      organizationId: type === 'CORPORATE' ? orgId : undefined,
    };
  } catch {
    return { type: 'PERSONAL' };
  }
}
