import { PoolClient } from 'pg';
import { TenantContextRunner, RequestTenantContext } from '../../security/tenant-context';

export interface RegisterDocumentInput {
  storageBucket: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSha256: string;
}

export class DocumentService {
  constructor(
    private readonly tenantRunner: TenantContextRunner
  ) {}

  /**
   * Registers an uploaded receipt/invoice in the database under strict RLS isolation.
   */
  public async registerDocument(
    context: RequestTenantContext,
    input: RegisterDocumentInput
  ) {
    return this.tenantRunner.runInIsolatedContext(context, async (client: PoolClient) => {
      // 1. Insert document row (RLS policy docs_personal_isolation or docs_corporate_isolation applies)
      const insertQuery = `
        INSERT INTO sales_documents (
          user_id,
          organization_id,
          context_scope,
          status,
          storage_bucket,
          storage_path,
          mime_type,
          file_size_bytes,
          file_sha256
        ) VALUES ($1, $2, $3, 'UPLOADED', $4, $5, $6, $7, $8)
        RETURNING id, status, context_scope, created_at;
      `;

      const values = [
        context.userId,
        context.contextScope === 'CORPORATE' ? context.organizationId : null,
        context.contextScope,
        input.storageBucket,
        input.storagePath,
        input.mimeType,
        input.fileSizeBytes,
        input.fileSha256,
      ];

      const result = await client.query(insertQuery, values);
      const document = result.rows[0];

      // 2. Audit log entry (Immutable Audit Log - REQ-SEC-10)
      await client.query(
        `INSERT INTO audit_logs (tenant_id, actor_id, action, resource, resource_id, ip_address, payload)
         VALUES ($1, $2, 'DOCUMENT_REGISTERED', 'sales_documents', $3, '127.0.0.1'::inet, $4)`,
        [
          context.organizationId || null,
          context.userId,
          document.id,
          JSON.stringify({ path: input.storagePath, mimeType: input.mimeType }),
        ]
      );

      return document;
    });
  }
}
