import { Pool, PoolClient } from 'pg';

export interface RequestTenantContext {
  userId: string;
  organizationId?: string | null;
  contextScope: 'PERSONAL' | 'CORPORATE';
}

/**
 * TenantContextRunner executes database operations within an isolated transaction,
 * strictly injecting PostgreSQL session variables:
 * - app.current_user_id
 * - app.current_org_id
 * 
 * Using `SET LOCAL` guarantees that when the connection returns to the connection pool
 * (PgBouncer or Node pg Pool), no session state leaks to subsequent queries (ADR-002).
 */
export class TenantContextRunner {
  constructor(private readonly pool: Pool) {}

  public async runInIsolatedContext<T>(
    context: RequestTenantContext,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Strict validation of context scope invariants
      if (context.contextScope === 'CORPORATE' && !context.organizationId) {
        throw new Error('SECURITY_VIOLATION: CORPORATE context requires organizationId.');
      }
      if (context.contextScope === 'PERSONAL' && context.organizationId) {
        throw new Error('SECURITY_VIOLATION: PERSONAL context must not have organizationId.');
      }

      // Inject transaction-scoped settings for RLS
      await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', context.userId]);
      await client.query('SELECT set_config($1, $2, true)', [
        'app.current_org_id',
        context.organizationId || '',
      ]);

      const result = await callback(client);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
