-- ==============================================================================
-- OPENsketch Database Schema: Clientes, Anúncios, Prospecção B2B & Chat IA
-- Architecture: PostgreSQL 16 (Cloud SQL) with Strict Row-Level Security (RLS)
-- Defense: Zero IDOR, Zero Cross-Tenant Leakage, Context-Scope Invariants
-- ==============================================================================

-- 1. ENUMS ADICIONAIS
DO $$ BEGIN
    CREATE TYPE client_status_type AS ENUM ('ATIVO', 'POTENCIAL', 'INATIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ad_format_type AS ENUM ('9:16', '1:1', '16:9');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ad_status_type AS ENUM ('APROVADO', 'RASCUNHO', 'REVISAO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status_type AS ENUM ('NOVO', 'CONTATADO', 'QUALIFICADO', 'CONVERTIDO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. TABELAS DE DOMÍNIO
-- ==============================================================================

-- 2.1. CLIENTES (Separados estritamente por Context Scope: Meu Trabalho vs Minha Empresa)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    context_scope context_scope_type NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    email VARCHAR(255) NOT NULL,
    document_tax_id VARCHAR(32) NOT NULL DEFAULT 'Não informado',
    segment VARCHAR(128) NOT NULL,
    status client_status_type NOT NULL DEFAULT 'ATIVO',
    notes TEXT,
    total_invoiced NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    invoices_count INT NOT NULL DEFAULT 0,
    last_invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- INVARIANTE MULTI-TENANT: PERSONAL não tem org; CORPORATE obrigatoriamente tem org
    CONSTRAINT chk_client_context_scope CHECK (
        (context_scope = 'PERSONAL' AND organization_id IS NULL) OR
        (context_scope = 'CORPORATE' AND organization_id IS NOT NULL)
    )
);

-- 2.2. ANÚNCIOS / CRIATIVOS (Separados por Context Scope)
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    context_scope context_scope_type NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    format ad_format_type NOT NULL DEFAULT '9:16',
    caption TEXT,
    image_url TEXT,
    status ad_status_type NOT NULL DEFAULT 'APROVADO',
    aspect_ratio_label VARCHAR(64) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_ad_context_scope CHECK (
        (context_scope = 'PERSONAL' AND organization_id IS NULL) OR
        (context_scope = 'CORPORATE' AND organization_id IS NOT NULL)
    )
);

-- 2.3. PROSPECÇÃO & LEADS B2B (Exclusivo do escopo CORPORATE / Minha Empresa)
CREATE TABLE IF NOT EXISTS b2b_prospecting_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(32) NOT NULL,
    segment VARCHAR(128) NOT NULL,
    fit_score INT NOT NULL DEFAULT 80 CHECK (fit_score >= 0 AND fit_score <= 100),
    estimated_volume VARCHAR(64),
    region VARCHAR(128) NOT NULL,
    status lead_status_type NOT NULL DEFAULT 'NOVO',
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(32),
    notes JSONB DEFAULT '[]'::jsonb,
    last_interaction TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.4. MENSAGENS DO CHAT IA (Separadas por Context Scope)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    context_scope context_scope_type NOT NULL,
    sender VARCHAR(16) NOT NULL CHECK (sender IN ('user', 'assistant')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_chat_context_scope CHECK (
        (context_scope = 'PERSONAL' AND organization_id IS NULL) OR
        (context_scope = 'CORPORATE' AND organization_id IS NOT NULL)
    )
);

-- 2.5. PERFIS DE USUÁRIO / EMPRESA
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    context_scope context_scope_type NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(64) NOT NULL,
    profession VARCHAR(128) NOT NULL DEFAULT '',
    segment VARCHAR(128) NOT NULL DEFAULT '',
    phone VARCHAR(32),
    email VARCHAR(255) NOT NULL,
    cover_image TEXT,
    profile_photo TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_profile_context_scope CHECK (
        (context_scope = 'PERSONAL' AND organization_id IS NULL) OR
        (context_scope = 'CORPORATE' AND organization_id IS NOT NULL)
    ),
    CONSTRAINT uq_user_scope UNIQUE (user_id, context_scope, organization_id)
);

-- ==============================================================================
-- 3. ÍNDICES DE PERFORMANCE E SEGURANÇA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_personal ON clients(user_id, created_at DESC) WHERE context_scope = 'PERSONAL';
CREATE INDEX IF NOT EXISTS idx_clients_corporate ON clients(organization_id, created_at DESC) WHERE context_scope = 'CORPORATE';
CREATE INDEX IF NOT EXISTS idx_ads_personal ON ads(user_id, created_at DESC) WHERE context_scope = 'PERSONAL';
CREATE INDEX IF NOT EXISTS idx_ads_corporate ON ads(organization_id, created_at DESC) WHERE context_scope = 'CORPORATE';
CREATE INDEX IF NOT EXISTS idx_leads_org ON b2b_prospecting_leads(organization_id, fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_chat_personal ON chat_messages(user_id, created_at ASC) WHERE context_scope = 'PERSONAL';
CREATE INDEX IF NOT EXISTS idx_chat_corp ON chat_messages(organization_id, created_at ASC) WHERE context_scope = 'CORPORATE';

-- ==============================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_prospecting_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE clients FORCE ROW LEVEL SECURITY;
ALTER TABLE ads FORCE ROW LEVEL SECURITY;
ALTER TABLE b2b_prospecting_leads FORCE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE user_profiles FORCE ROW LEVEL SECURITY;

-- 4.1. POLICIES: CLIENTS
CREATE POLICY clients_personal_isolation ON clients
    FOR ALL
    USING (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id())
    WITH CHECK (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id());

CREATE POLICY clients_corporate_isolation ON clients
    FOR ALL
    USING (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    )
    WITH CHECK (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    );

-- 4.2. POLICIES: ADS
CREATE POLICY ads_personal_isolation ON ads
    FOR ALL
    USING (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id())
    WITH CHECK (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id());

CREATE POLICY ads_corporate_isolation ON ads
    FOR ALL
    USING (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    )
    WITH CHECK (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    );

-- 4.3. POLICIES: LEADS B2B
CREATE POLICY leads_corporate_isolation ON b2b_prospecting_leads
    FOR ALL
    USING (organization_id = current_app_org_id() AND is_member_of_org(organization_id))
    WITH CHECK (organization_id = current_app_org_id() AND is_member_of_org(organization_id));

-- 4.4. POLICIES: CHAT MESSAGES
CREATE POLICY chat_personal_isolation ON chat_messages
    FOR ALL
    USING (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id())
    WITH CHECK (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id());

CREATE POLICY chat_corporate_isolation ON chat_messages
    FOR ALL
    USING (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    )
    WITH CHECK (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    );

-- 4.5. POLICIES: USER PROFILES
CREATE POLICY profiles_personal_isolation ON user_profiles
    FOR ALL
    USING (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id())
    WITH CHECK (context_scope = 'PERSONAL' AND organization_id IS NULL AND user_id = current_app_user_id());

CREATE POLICY profiles_corporate_isolation ON user_profiles
    FOR ALL
    USING (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    )
    WITH CHECK (
        context_scope = 'CORPORATE' AND organization_id IS NOT NULL 
        AND organization_id = current_app_org_id() AND is_member_of_org(organization_id)
    );
