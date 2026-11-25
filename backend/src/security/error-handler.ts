// ==============================================================================
// OPENsketch Safe Error Handler & Shield
// Enforces OWASP API7 (Security Misconfiguration) & OWASP API8: Prevents Secrets & Path Leaks
// ==============================================================================

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { SecretsVault } from './secrets-vault';

export interface SafeErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
}

export function handleServerError(
  error: FastifyError | Error | any,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = error.statusCode || error.status || 500;

  // Log internal details securely on the server
  const errorName = error.name || 'InternalServerError';
  const rawMessage = error.message || 'An unexpected error occurred.';

  // Determine safe user-facing message
  let safeTitle = 'INTERNAL_SERVER_ERROR';
  let safeMessage = 'Ocorreu um erro interno ao processar a sua requisição. Tente novamente mais tarde.';

  if (statusCode === 400 || errorName === 'InputSanitizationError' || errorName === 'ZodError') {
    safeTitle = 'BAD_REQUEST';
    safeMessage = isProduction ? 'Requisição inválida ou parâmetros incorretos.' : rawMessage;
  } else if (statusCode === 401 || errorName === 'UnauthorizedError') {
    safeTitle = 'UNAUTHORIZED';
    safeMessage = 'Acesso não autorizado. Sessão inválida ou expirada.';
  } else if (statusCode === 403 || errorName === 'IdorViolationError') {
    safeTitle = 'FORBIDDEN_ACCESS';
    safeMessage = 'Acesso negado ao recurso solicitado por diretriz de segurança de escopo.';
  } else if (errorName === 'PromptInjectionViolationError') {
    safeTitle = 'PROMPT_INJECTION_BLOCKED';
    safeMessage = 'A solicitação foi bloqueada e colocada em quarentena por suspeita de injeção de prompt.';
  } else if (statusCode === 429) {
    safeTitle = 'RATE_LIMIT_EXCEEDED';
    safeMessage = 'Limite de requisições excedido. Por favor, aguarde antes de tentar novamente.';
  } else if (statusCode === 404) {
    safeTitle = 'RESOURCE_NOT_FOUND';
    safeMessage = 'O recurso solicitado não foi encontrado.';
  }

  // Redact any potential internal paths or tokens from the output
  const safeResponse: SafeErrorResponse = {
    error: safeTitle,
    message: SecretsVault.redactSensitiveData(safeMessage),
    statusCode,
    timestamp: new Date().toISOString(),
    requestId: request.id,
  };

  reply.status(statusCode).send(safeResponse);
}
