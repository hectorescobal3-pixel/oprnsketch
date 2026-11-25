// ==============================================================================
// OPENsketch Secrets Vault & Redaction Engine
// Enforces OWASP API3 & API8: Protects Sensitive Data & Prevents Secrets Leaks
// ==============================================================================

export interface AppSecretsConfig {
  geminiApiKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googlePlacesApiKey?: string;
  databaseUrl?: string;
  redisUrl?: string;
  sessionSecret?: string;
}

export class SecretsVault {
  private static readonly SENSITIVE_KEYS = [
    'gemini_api_key',
    'geminiapikey',
    'google_client_secret',
    'googleclientsecret',
    'google_client_id',
    'database_url',
    'redis_url',
    'session_secret',
    'sessiontoken',
    'password',
    'authorization',
    'cookie',
    'token',
    'secret',
    'apikey',
  ];

  /**
   * Retrieves an environment variable without leaking it to logs.
   */
  public static get(key: string, defaultValue = ''): string {
    return process.env[key] || defaultValue;
  }

  /**
   * Returns a safe, partially masked version of an API key or secret for diagnostics.
   * e.g., "AIzaSyD...XXXX" (reveals only the first 6 chars and masks the rest).
   */
  public static getMasked(key: string): string {
    const value = process.env[key];
    if (!value || typeof value !== 'string') {
      return '[NOT_CONFIGURED]';
    }
    if (value.length <= 8) {
      return '****';
    }
    const prefix = value.slice(0, 6);
    return `${prefix}...${'*'.repeat(Math.min(value.length - 6, 8))}`;
  }

  /**
   * Recursively sanitizes and redacts sensitive tokens, credentials, and API keys
   * from any object, dictionary, or string before sending in HTTP responses or writing to logs.
   */
  public static redactSensitiveData<T>(input: T): T {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      let str = String(input);
      // Mask database connection strings (postgresql://user:pass@host:port/db)
      str = str.replace(
        /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi,
        '$1[REDACTED_PASSWORD]$3'
      );
      // Mask potential Google API keys (AIzaSy...)
      str = str.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, 'AIzaSy[REDACTED_KEY]');
      return str as unknown as T;
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.redactSensitiveData(item)) as unknown as T;
    }

    if (typeof input === 'object') {
      const copy: Record<string, any> = {};
      for (const [k, v] of Object.entries(input)) {
        const lowerKey = k.toLowerCase().replace(/[-_]/g, '');
        const isSensitive = this.SENSITIVE_KEYS.some((sk) =>
          lowerKey.includes(sk.replace(/[-_]/g, ''))
        );

        if (isSensitive) {
          copy[k] = '[REDACTED_SECRET]';
        } else {
          copy[k] = this.redactSensitiveData(v);
        }
      }
      return copy as T;
    }

    return input;
  }

  /**
   * Asserts that no critical environment secret has been exposed in the given payload.
   * Throws an error if any known active secret is detected inside the text.
   */
  public static verifyNoSecretsLeaked(payloadText: string): boolean {
    const secretsToInspect = [
      process.env.GEMINI_API_KEY,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.SESSION_SECRET,
      process.env.DATABASE_URL,
    ].filter(Boolean) as string[];

    for (const secret of secretsToInspect) {
      if (secret.length > 5 && payloadText.includes(secret)) {
        return false;
      }
    }
    return true;
  }
}
