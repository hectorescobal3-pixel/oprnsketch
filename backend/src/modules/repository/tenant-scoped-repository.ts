// ==============================================================================
// OPENsketch Tenant-Scoped Repository (Anti-IDOR & Multi-Tenant Defense)
// Enforces OWASP API1: Broken Object Level Authorization (BOLA/IDOR) Protection
// All operations are bound strictly by the validated session's user and org context
// ==============================================================================

import { PoolClient } from 'pg';
import { TenantContextRunner, RequestTenantContext } from '../../security/tenant-context';

export class IdorViolationError extends Error {
  constructor(message: string) {
    super(`IDOR_SECURITY_VIOLATION: ${message}`);
    this.name = 'IdorViolationError';
  }
}

export interface ClientEntity {
  id: string;
  userId: string;
  organizationId?: string | null;
  contextScope: 'PERSONAL' | 'CORPORATE';
  name: string;
  phone?: string;
  email: string;
  documentTaxId: string;
  segment: string;
  status: 'ATIVO' | 'POTENCIAL' | 'INATIVO';
  notes?: string;
  totalInvoiced: number;
  invoicesCount: number;
  lastInvoiceDate: string;
  createdAt: string;
}

export interface AdEntity {
  id: string;
  userId: string;
  organizationId?: string | null;
  contextScope: 'PERSONAL' | 'CORPORATE';
  title: string;
  format: '9:16' | '1:1' | '16:9';
  caption?: string;
  imageUrl?: string;
  status: 'APROVADO' | 'RASCUNHO' | 'REVISAO';
  aspectRatioLabel: string;
  createdAt: string;
}

export class TenantScopedRepository {
  constructor(private readonly runner: TenantContextRunner) {}

  // ============================================================================
  // CLIENTS REPOSITORY
  // ============================================================================

  /**
   * Lists clients strictly bounded by the active session context.
   */
  public async listClients(context: RequestTenantContext): Promise<ClientEntity[]> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      let query = '';
      let values: any[] = [];

      if (context.contextScope === 'PERSONAL') {
        query = `
          SELECT * FROM clients 
          WHERE user_id = $1 AND context_scope = 'PERSONAL' AND organization_id IS NULL 
          ORDER BY created_at DESC
        `;
        values = [context.userId];
      } else {
        query = `
          SELECT * FROM clients 
          WHERE organization_id = $1 AND context_scope = 'CORPORATE' 
          ORDER BY created_at DESC
        `;
        values = [context.organizationId];
      }

      const result = await client.query(query, values);
      return result.rows.map(this.mapClientRow);
    });
  }

  /**
   * Retrieves a client by ID. Prevents IDOR by asserting context ownership.
   */
  public async getClientById(
    context: RequestTenantContext,
    clientId: string
  ): Promise<ClientEntity | null> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      // Direct query with ownership filter
      const query =
        context.contextScope === 'PERSONAL'
          ? `SELECT * FROM clients WHERE id = $1 AND user_id = $2 AND context_scope = 'PERSONAL' AND organization_id IS NULL`
          : `SELECT * FROM clients WHERE id = $1 AND organization_id = $2 AND context_scope = 'CORPORATE'`;
      const values = [clientId, context.contextScope === 'PERSONAL' ? context.userId : context.organizationId];

      const result = await client.query(query, values);
      if (result.rows.length === 0) {
        // Check if the record actually exists in another scope/tenant (indicative of IDOR probe)
        const probeCheck = await client.query(`SELECT id, context_scope, user_id, organization_id FROM clients WHERE id = $1`, [clientId]);
        if (probeCheck.rows.length > 0) {
          throw new IdorViolationError(
            `Attempted unauthorized access to client "${clientId}" belonging to another context/tenant.`
          );
        }
        return null;
      }
      return this.mapClientRow(result.rows[0]);
    });
  }

  /**
   * Creates a client record enforcing context invariance.
   */
  public async createClient(
    context: RequestTenantContext,
    data: Omit<ClientEntity, 'id' | 'userId' | 'contextScope' | 'organizationId' | 'createdAt'>
  ): Promise<ClientEntity> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      const orgId = context.contextScope === 'CORPORATE' ? context.organizationId : null;

      const query = `
        INSERT INTO clients (
          user_id, organization_id, context_scope, name, phone, email, 
          document_tax_id, segment, status, notes, total_invoiced, invoices_count, last_invoice_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const values = [
        context.userId,
        orgId,
        context.contextScope,
        data.name,
        data.phone || null,
        data.email,
        data.documentTaxId || 'Não informado',
        data.segment,
        data.status || 'ATIVO',
        data.notes || null,
        data.totalInvoiced || 0.0,
        data.invoicesCount || 0,
        data.lastInvoiceDate || new Date().toISOString().slice(0, 10),
      ];

      const result = await client.query(query, values);
      return this.mapClientRow(result.rows[0]);
    });
  }

  /**
   * Updates a client. Prohibits altering context scope or crossing tenant boundaries.
   */
  public async updateClient(
    context: RequestTenantContext,
    clientId: string,
    updates: Partial<Pick<ClientEntity, 'name' | 'phone' | 'email' | 'segment' | 'status' | 'notes'>>
  ): Promise<ClientEntity> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      // IDOR Verification
      await this.getClientById(context, clientId);

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${idx++}`);
        values.push(updates.name);
      }
      if (updates.phone !== undefined) {
        fields.push(`phone = $${idx++}`);
        values.push(updates.phone);
      }
      if (updates.email !== undefined) {
        fields.push(`email = $${idx++}`);
        values.push(updates.email);
      }
      if (updates.segment !== undefined) {
        fields.push(`segment = $${idx++}`);
        values.push(updates.segment);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${idx++}`);
        values.push(updates.status);
      }
      if (updates.notes !== undefined) {
        fields.push(`notes = $${idx++}`);
        values.push(updates.notes);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(clientId);

      const query = `UPDATE clients SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await client.query(query, values);
      return this.mapClientRow(result.rows[0]);
    });
  }

  /**
   * Deletes a client with strict IDOR prevention.
   */
  public async deleteClient(context: RequestTenantContext, clientId: string): Promise<boolean> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      // Must verify ownership first
      await this.getClientById(context, clientId);

      const query =
        context.contextScope === 'PERSONAL'
          ? `DELETE FROM clients WHERE id = $1 AND user_id = $2 AND context_scope = 'PERSONAL' AND organization_id IS NULL`
          : `DELETE FROM clients WHERE id = $1 AND organization_id = $2 AND context_scope = 'CORPORATE'`;
      const values = [clientId, context.contextScope === 'PERSONAL' ? context.userId : context.organizationId];

      const result = await client.query(query, values);
      return (result.rowCount ?? 0) > 0;
    });
  }

  // ============================================================================
  // ADS REPOSITORY
  // ============================================================================

  public async listAds(context: RequestTenantContext): Promise<AdEntity[]> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      const query =
        context.contextScope === 'PERSONAL'
          ? `SELECT * FROM ads WHERE user_id = $1 AND context_scope = 'PERSONAL' AND organization_id IS NULL ORDER BY created_at DESC`
          : `SELECT * FROM ads WHERE organization_id = $1 AND context_scope = 'CORPORATE' ORDER BY created_at DESC`;
      const values = [context.contextScope === 'PERSONAL' ? context.userId : context.organizationId];

      const result = await client.query(query, values);
      return result.rows.map(this.mapAdRow);
    });
  }

  public async createAd(
    context: RequestTenantContext,
    data: Omit<AdEntity, 'id' | 'userId' | 'contextScope' | 'organizationId' | 'createdAt'>
  ): Promise<AdEntity> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      const orgId = context.contextScope === 'CORPORATE' ? context.organizationId : null;
      const query = `
        INSERT INTO ads (
          user_id, organization_id, context_scope, title, format, caption, image_url, status, aspect_ratio_label
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        context.userId,
        orgId,
        context.contextScope,
        data.title,
        data.format,
        data.caption || null,
        data.imageUrl || null,
        data.status || 'APROVADO',
        data.aspectRatioLabel,
      ];
      const result = await client.query(query, values);
      return this.mapAdRow(result.rows[0]);
    });
  }

  public async deleteAd(context: RequestTenantContext, adId: string): Promise<boolean> {
    return this.runner.runInIsolatedContext(context, async (client: PoolClient) => {
      const query =
        context.contextScope === 'PERSONAL'
          ? `DELETE FROM ads WHERE id = $1 AND user_id = $2 AND context_scope = 'PERSONAL' AND organization_id IS NULL`
          : `DELETE FROM ads WHERE id = $1 AND organization_id = $2 AND context_scope = 'CORPORATE'`;
      const values = [adId, context.contextScope === 'PERSONAL' ? context.userId : context.organizationId];

      const result = await client.query(query, values);
      if ((result.rowCount ?? 0) === 0) {
        // Probe check for IDOR
        const probe = await client.query(`SELECT id FROM ads WHERE id = $1`, [adId]);
        if (probe.rows.length > 0) {
          throw new IdorViolationError(`Attempted unauthorized deletion of ad "${adId}".`);
        }
        return false;
      }
      return true;
    });
  }

  // ============================================================================
  // MAPPERS
  // ============================================================================

  private mapClientRow(row: any): ClientEntity {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      contextScope: row.context_scope,
      name: row.name,
      phone: row.phone,
      email: row.email,
      documentTaxId: row.document_tax_id,
      segment: row.segment,
      status: row.status,
      notes: row.notes,
      totalInvoiced: parseFloat(row.total_invoiced || '0'),
      invoicesCount: parseInt(row.invoices_count || '0', 10),
      lastInvoiceDate: row.last_invoice_date ? String(row.last_invoice_date) : '',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    };
  }

  private mapAdRow(row: any): AdEntity {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      contextScope: row.context_scope,
      title: row.title,
      format: row.format,
      caption: row.caption,
      imageUrl: row.image_url,
      status: row.status,
      aspectRatioLabel: row.aspect_ratio_label,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    };
  }
}
