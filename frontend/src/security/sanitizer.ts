// ==============================================================================
// OPENsketch Input Sanitizer & XSS Shield
// Neutralizes script tags, javascript: pseudo-protocols, and unsafe HTML entities
// ==============================================================================

/**
 * Escapes HTML special characters into their safe entity equivalents.
 */
export function escapeHtml(unsafeText: string): string {
  if (typeof unsafeText !== 'string') return '';
  return unsafeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips high-risk elements, script tags, event handlers and dangerous URI schemes.
 */
export function sanitizePlainText(input: string): string {
  if (typeof input !== 'string') return '';
  let sanitized = input;

  // 1. Remove script tags and embedded JavaScript (including unclosed tags)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, '');

  // 2. Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // 3. Remove event handlers like onerror=, onclick=, onload=, etc.
  sanitized = sanitized.replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '');

  // 4. Neutralize javascript:, data:text/html, vbscript: URI schemes
  sanitized = sanitized.replace(/javascript\s*:/gi, 'blocked-scheme:');
  sanitized = sanitized.replace(/vbscript\s*:/gi, 'blocked-scheme:');
  sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, 'blocked-scheme:');

  // 5. Strip dangerous active tags
  sanitized = sanitized.replace(/<\/?(iframe|object|embed|applet|meta|base|link)\b[^>]*>/gi, '');

  return sanitized.trim();
}

/**
 * Validates and sanitizes email strings.
 */
export function sanitizeEmail(email: string): string {
  const cleaned = sanitizePlainText(email).trim().toLowerCase();
  // Basic structural check for email safety
  if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleaned)) {
    return cleaned;
  }
  // Mobile dummy email format
  if (/^[0-9]+@celular\.opensketch\.app$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned.replace(/[<>"'`;()]/g, '');
}

/**
 * Validates and sanitizes phone numbers.
 */
export function sanitizePhone(phone: string): string {
  return phone
    .replace(/[^\d\s()+ -]/g, '')
    .replace(/-+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

/**
 * Validates media URLs for safe rendering in React <img>, <video> and <iframe>.
 */
export function isSafeMediaUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed)) return true;
  if (/^data:(image\/(png|jpeg|jpg|webp|gif)|video\/(mp4|webm|quicktime|ogg)|application\/pdf);base64,/i.test(trimmed)) {
    return true;
  }
  return false;
}
