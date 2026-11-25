// ==============================================================================
// opensketch — Validador & Formatador Dual CPF / CNPJ (Padrão RFB 2026)
// Suporta CPF (11 dígitos), CNPJ numérico e CNPJ alfanumérico (14 caracteres)
// ==============================================================================

export interface CpfCnpjValidationResult {
  status: 'empty' | 'incomplete' | 'valid' | 'invalid';
  type: 'CPF' | 'CNPJ' | null;
  message: string;
}

/**
 * Remove pontos, traços, barras, espaços e símbolos, mantendo apenas [A-Z0-9]
 * limitado a 14 caracteres.
 */
export function sanitizeCpfCnpj(raw: string): string {
  if (!raw) return '';
  return String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 14);
}

/**
 * Formata progressivamente como CPF (000.000.000-00) até 11 dígitos numéricos
 * ou alterna automaticamente para CNPJ (00.000.000/0000-00) entre 12 e 14 caracteres
 * (ou imediatamente se contiver letras do padrão CNPJ alfanumérico 2026).
 */
export function formatCpfCnpj(raw: string): string {
  const clean = sanitizeCpfCnpj(raw);
  if (!clean) return '';

  const hasLetters = /[A-Z]/.test(clean);

  if (!hasLetters && clean.length <= 11) {
    // Máscara CPF: 000.000.000-00
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
    if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
  }

  // Máscara CNPJ (numérico ou alfanumérico): 00.000.000/0000-00
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

function isValidCpfDigits(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === Number(digits[10]);
}

/**
 * Validação oficial do CNPJ numérico e alfanumérico (Receita Federal 2026):
 * - 12 primeiros caracteres: [0-9A-Z] (valor = charCodeAt(0) - 48)
 * - 2 dígitos verificadores finais: [0-9]
 */
function isValidCnpjChars(chars: string): boolean {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(chars)) return false;
  if (/^([A-Z0-9])\1{13}$/.test(chars)) return false;

  const values = Array.from(chars).map((ch) => ch.charCodeAt(0) - 48);

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += values[i] * weights1[i];
  }
  const rem1 = sum1 % 11;
  const dv1 = rem1 < 2 ? 0 : 11 - rem1;
  if (dv1 !== values[12]) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += values[i] * weights2[i];
  }
  const rem2 = sum2 % 11;
  const dv2 = rem2 < 2 ? 0 : 11 - rem2;
  return dv2 === values[13];
}

/**
 * Valida CPF ou CNPJ (numérico e alfanumérico) após sanitização completa.
 */
export function validateCpfCnpj(raw: string): CpfCnpjValidationResult {
  const clean = sanitizeCpfCnpj(raw);
  if (!clean) {
    return { status: 'empty', type: null, message: '' };
  }

  const hasLetters = /[A-Z]/.test(clean);

  if (!hasLetters && clean.length === 11) {
    return isValidCpfDigits(clean)
      ? { status: 'valid', type: 'CPF', message: 'CPF válido' }
      : { status: 'invalid', type: 'CPF', message: 'CPF/CNPJ incorreto — confira os dígitos' };
  }

  if (clean.length === 14) {
    return isValidCnpjChars(clean)
      ? { status: 'valid', type: 'CNPJ', message: 'CNPJ válido' }
      : { status: 'invalid', type: 'CNPJ', message: 'CPF/CNPJ incorreto — confira os dígitos' };
  }

  return { status: 'incomplete', type: null, message: '' };
}
