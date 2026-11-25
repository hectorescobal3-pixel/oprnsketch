import { describe, it, expect, vi } from 'vitest';
import { TenantContextRunner, RequestTenantContext } from '../backend/src/security/tenant-context';
import { AppStorage, normalizeWorkspaceEnv } from '../frontend/src/services/app-storage';

describe('Auditoria 1: Isolamento Estrito de Dados (Multi-Tenant & "Meu Trabalho")', () => {
  const USER_A_ID = '11111111-1111-1111-1111-111111111111';
  const ORG_ALFA_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const createMockPool = () => {
    const executedQueries: Array<{ text: string; values?: any[] }> = [];
    const mockClient = {
      query: vi.fn(async (text: string, values?: any[]) => {
        executedQueries.push({ text, values });
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const mockPool = {
      connect: vi.fn(async () => mockClient),
    };
    return { mockPool: mockPool as any, mockClient, executedQueries };
  };

  it('CRITÉRIO 1.1: Contexto CORPORATE sem organizationId deve ser rejeitado imediatamente por violação de segurança', async () => {
    const { mockPool } = createMockPool();
    const runner = new TenantContextRunner(mockPool);

    const invalidCorporateContext: RequestTenantContext = {
      userId: USER_A_ID,
      contextScope: 'CORPORATE',
      organizationId: undefined,
    };

    await expect(
      runner.runInIsolatedContext(invalidCorporateContext, async () => {})
    ).rejects.toThrowError(/SECURITY_VIOLATION: CORPORATE context requires organizationId/);
  });

  it('CRITÉRIO 1.2: Contexto PERSONAL vinculado a organizationId deve ser rejeitado por violar isolamento do "Meu Trabalho"', async () => {
    const { mockPool } = createMockPool();
    const runner = new TenantContextRunner(mockPool);

    const contaminatedPersonalContext: RequestTenantContext = {
      userId: USER_A_ID,
      contextScope: 'PERSONAL',
      organizationId: ORG_ALFA_ID,
    };

    await expect(
      runner.runInIsolatedContext(contaminatedPersonalContext, async () => {})
    ).rejects.toThrowError(/SECURITY_VIOLATION: PERSONAL context must not have organizationId/);
  });

  it('CRITÉRIO 1.3: Transação injeta estritamente variáveis de sessão PostgreSQL (SET LOCAL) para RLS', async () => {
    const { mockPool, executedQueries, mockClient } = createMockPool();
    const runner = new TenantContextRunner(mockPool);

    const validCorporateContext: RequestTenantContext = {
      userId: USER_A_ID,
      organizationId: ORG_ALFA_ID,
      contextScope: 'CORPORATE',
    };

    await runner.runInIsolatedContext(validCorporateContext, async () => 'ok');

    expect(mockClient.release).toHaveBeenCalledTimes(1);
    expect(executedQueries).toEqual(
      expect.arrayContaining([
        { text: 'BEGIN', values: undefined },
        { text: 'SELECT set_config($1, $2, true)', values: ['app.current_user_id', USER_A_ID] },
        { text: 'SELECT set_config($1, $2, true)', values: ['app.current_org_id', ORG_ALFA_ID] },
        { text: 'COMMIT', values: undefined },
      ])
    );
  });

  it('CRITÉRIO 1.4: No Frontend, normalização e chaves de storage isolam estritamente "individual" e "empresa"', () => {
    expect(normalizeWorkspaceEnv('PERSONAL')).toBe('individual');
    expect(normalizeWorkspaceEnv('individual')).toBe('individual');
    expect(normalizeWorkspaceEnv('CORPORATE')).toBe('empresa');
    expect(normalizeWorkspaceEnv('empresa')).toBe('empresa');

    expect(AppStorage.getKey('clientes', 'PERSONAL')).toBe('opensketch_individual_clientes');
    expect(AppStorage.getKey('clientes', 'CORPORATE')).toBe('opensketch_empresa_clientes');
    expect(AppStorage.getKey('anuncios', 'PERSONAL')).toBe('opensketch_individual_anuncios');
    expect(AppStorage.getKey('anuncios', 'CORPORATE')).toBe('opensketch_empresa_anuncios');
  });
});
