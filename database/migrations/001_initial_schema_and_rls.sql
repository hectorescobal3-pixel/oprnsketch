-- ==============================================================================
-- OPENsketch Database Schema & Row-Level Security (RLS) Engine
-- Architecture: PostgreSQL 16 (Cloud SQL)
-- Standards: ADR-002, 20 Security Requirements, Zero Cross-Tenant Leakage
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE context_scope_type AS ENUM ('PERSONAL', 'CORPORATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status_type AS ENUM ('UPLOADED', 'EXTRACTING', 'READY_FOR_REVIEW', 'CONFIRMED', 'REJECTED', 'QUARANTINED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. CORE TABLES
-- ==============================================================================

-- 3.1. USERS (Zero passwords, identified by Google OIDC sub / verified email)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    personal_preferences JSONB NOT NULL DEFAULT '{"currency": "BRL", "auto_validate_ocr": false}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.2. REFRESH SESSIONS (Server-side tracking for remote termination)
CREATE TABLE IF NOT EXISTS refresh_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 of session identifier
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.3. ORGANIZATIONS ("Minha Empresa" Multi-Tenant Domain)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(32) NOT NULL UNIQUE, -- CNPJ or equivalent
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    corporate_settings JSONB NOT NULL DEFAULT '{"reconciliation_tolerance": 0.02, "require_approval": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.4. ORGANIZATION MEMBERS (RBAC: Admin, Operator, Viewer)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'OPERATOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

-- 3.5. SALES DOCUMENTS (Central Aggregate for Sales & Invoices)
CREATE TABLE IF NOT EXISTS sales_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    context_scope context_scope_type NOT NULL,
    status document_status_type NOT NULL DEFAULT 'UPLOADED',
    
    -- File details in Google Cloud Storage
    storage_bucket VARCHAR(128) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_sha256 VARCHAR(64) NOT NULL,
    
    -- Extraction & Financial metadata
    invoice_number VARCHAR(128),
    issuer_name VARCHAR(255),
    issuer_tax_id VARCHAR(32),
    issued_at TIMESTAMPTZ,
    total_amount NUMERIC(14, 2),
    raw_ocr_text TEXT,
    sanitized_extraction JSONB,
    quarantine_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- STRICT DATA ISOLATION INVARIANTS:
    -- Invariant 1: PERSONAL documents MUST NOT belong to any organization.
    -- Invariant 2: CORPORATE documents MUST belong to a valid organization.
    CONSTRAINT chk_context_scope_rules CHECK (
        (context_scope = 'PERSONAL' AND organization_id IS NULL) OR
        (context_scope = 'CORPORATE' AND organization_id IS NOT NULL)
    )
);

-- 3.6. DOCUMENT ITEMS (Line Items extracted from invoices)
CREATE TABLE IF NOT EXISTS document_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sales_documents(id) ON DELETE CASCADE,
    item_index INT NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
    unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    matched_sku VARCHAR(128),
    confidence_score NUMERIC(5, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3.7. IMMUTABLE AUDIT LOGS (Compliance & Security Auditing)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- NULL if personal context action
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(64) NOT NULL,
    resource_id UUID NOT NULL,
    payload JSONB,
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. PERFORMANCE INDEXES (Optimized for 30,000+ Concurrent Users)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON refresh_sessions(user_id) WHERE is_revoked = FALSE;
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_docs_personal ON sales_documents(user_id, created_at DESC) WHERE context_scope = 'PERSONAL';
CREATE INDEX IF NOT EXISTS idx_docs_corporate ON sales_documents(organization_id, created_at DESC) WHERE context_scope = 'CORPORATE';
CREATE INDEX IF NOT EXISTS idx_docs_status ON sales_documents(status);
CREATE INDEX IF NOT EXISTS idx_doc_items_doc_id ON document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);

-- ==============================================================================
-- 5. ROW-LEVEL SECURITY (RLS) ENGINE (Strict Context Isolation)
-- ==============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners to avoid accidental superuser bypass in tenant contexts
ALTER TABLE sales_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE document_items FORCE ROW LEVEL SECURITY;

-- Helper function to read the current authenticated user context safely
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to read the current organization context safely
CREATE OR REPLACE FUNCTION current_app_org_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_org_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to verify if current user is an active member of the current org
CREATE OR REPLACE FUNCTION is_member_of_org(check_org_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    IF check_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = check_org_id
          AND user_id = current_app_user_id()
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5.1. POLICIES: USERS
-- ------------------------------------------------------------------------------
CREATE POLICY users_view_own_or_colleagues ON users
    FOR SELECT
    USING (
        id = current_app_user_id() OR
        EXISTS (
            SELECT 1 FROM organization_members om1
            JOIN organization_members om2 ON om1.organization_id = om2.organization_id
            WHERE om1.user_id = current_app_user_id() AND om2.user_id = users.id
        )
    );

CREATE POLICY users_update_self ON users
    FOR UPDATE
    USING (id = current_app_user_id());

-- ------------------------------------------------------------------------------
-- 5.2. POLICIES: ORGANIZATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY orgs_select_members_only ON organizations
    FOR SELECT
    USING (is_member_of_org(id));

CREATE POLICY orgs_update_admin_only ON organizations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organizations.id
              AND user_id = current_app_user_id()
              AND role = 'ADMIN'
        )
    );

-- ------------------------------------------------------------------------------
-- 5.3. POLICIES: SALES DOCUMENTS ("Meu Trabalho" vs. "Minha Empresa")
-- ------------------------------------------------------------------------------

-- POLICY A: Contexto 'Meu Trabalho' (Personal Workspace)
-- Exclusivo do próprio usuário, estritamente desvinculado de qualquer organização.
CREATE POLICY docs_personal_isolation ON sales_documents
    FOR ALL
    USING (
        context_scope = 'PERSONAL'
        AND organization_id IS NULL
        AND user_id = current_app_user_id()
    )
    WITH CHECK (
        context_scope = 'PERSONAL'
        AND organization_id IS NULL
        AND user_id = current_app_user_id()
    );

-- POLICY B: Contexto 'Minha Empresa' (Corporate Multi-Tenant Workspace)
-- Acessível apenas se o usuário for membro da organização definida no cabeçalho de sessão.
CREATE POLICY docs_corporate_isolation ON sales_documents
    FOR ALL
    USING (
        context_scope = 'CORPORATE'
        AND organization_id IS NOT NULL
        AND organization_id = current_app_org_id()
        AND is_member_of_org(organization_id)
    )
    WITH CHECK (
        context_scope = 'CORPORATE'
        AND organization_id IS NOT NULL
        AND organization_id = current_app_org_id()
        AND is_member_of_org(organization_id)
    );

-- ------------------------------------------------------------------------------
-- 5.4. POLICIES: DOCUMENT ITEMS (Inherited Isolation from Parent Document)
-- ------------------------------------------------------------------------------
CREATE POLICY doc_items_isolation ON document_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM sales_documents d
            WHERE d.id = document_items.document_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales_documents d
            WHERE d.id = document_items.document_id
        )
    );

-- ------------------------------------------------------------------------------
-- 5.5. POLICIES: AUDIT LOGS (Append-only by system, viewable by admins/owners)
-- ------------------------------------------------------------------------------
CREATE POLICY audit_view_scoped ON audit_logs
    FOR SELECT
    USING (
        (tenant_id IS NULL AND actor_id = current_app_user_id()) OR
        (tenant_id IS NOT NULL AND tenant_id = current_app_org_id() AND is_member_of_org(tenant_id))
    );

CREATE POLICY audit_insert_system ON audit_logs
    FOR INSERT
    WITH CHECK (actor_id = current_app_user_id());
