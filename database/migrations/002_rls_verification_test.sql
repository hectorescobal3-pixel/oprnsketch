-- ==============================================================================
-- OPENsketch RLS Automated Verification Test Suite (SQL Simulation)
-- Purpose: Validates that RLS strictly prevents any cross-context data leaks.
-- ==============================================================================

BEGIN;

-- 1. Setup Mock Users
INSERT INTO users (id, google_sub, email, full_name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'sub_alice', 'alice@personal.com', 'Alice Personal'),
    ('22222222-2222-2222-2222-222222222222', 'sub_bob', 'bob@personal.com', 'Bob Personal'),
    ('33333333-3333-3333-3333-333333333333', 'sub_corp_user', 'corp@empresa.com', 'Carlos Corp')
ON CONFLICT DO NOTHING;

-- 2. Setup Mock Organizations
INSERT INTO organizations (id, name, tax_id, owner_id) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Empresa Alfa Ltda', '11.111.111/0001-11', '33333333-3333-3333-3333-333333333333'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Empresa Beta S/A', '22.222.222/0001-22', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- 3. Setup Memberships
INSERT INTO organization_members (organization_id, user_id, role) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'ADMIN'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'ADMIN')
ON CONFLICT DO NOTHING;

-- 4. Setup Mock Documents
-- Doc 1: Alice's personal document ("Meu Trabalho")
INSERT INTO sales_documents (
    id, user_id, organization_id, context_scope, status, 
    storage_bucket, storage_path, mime_type, file_size_bytes, file_sha256, total_amount
) VALUES (
    'd0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', NULL, 'PERSONAL', 'CONFIRMED',
    'opensketch-docs', 'users/alice/doc1.pdf', 'application/pdf', 1024, 'dummy_sha', 150.00
);

-- Doc 2: Empresa Alfa's corporate document ("Minha Empresa")
INSERT INTO sales_documents (
    id, user_id, organization_id, context_scope, status, 
    storage_bucket, storage_path, mime_type, file_size_bytes, file_sha256, total_amount
) VALUES (
    'd0000002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CORPORATE', 'CONFIRMED',
    'opensketch-docs', 'orgs/alfa/doc2.pdf', 'application/pdf', 2048, 'dummy_sha2', 9800.50
);

-- ==============================================================================
-- TEST ASSERTIONS
-- ==============================================================================

-- TEST CASE 1: Alice queries documents with her session active ("Meu Trabalho")
SET LOCAL app.current_user_id = '11111111-1111-1111-1111-111111111111';
SET LOCAL app.current_org_id = '';

DO $$
DECLARE
    found_count INT;
BEGIN
    SELECT count(*) INTO found_count FROM sales_documents;
    IF found_count <> 1 THEN
        RAISE EXCEPTION 'TEST 1 FAILED: Alice should see exactly 1 document, found %', found_count;
    END IF;
    
    -- Alice attempts to query Doc 2 (Empresa Alfa) directly by ID
    SELECT count(*) INTO found_count FROM sales_documents WHERE id = 'd0000002-0000-0000-0000-000000000002';
    IF found_count <> 0 THEN
        RAISE EXCEPTION 'TEST 1.1 FAILED (SECURITY BREACH): Alice saw Empresa Alfa document!';
    END IF;
    RAISE NOTICE '>> TEST 1 PASSED: Personal Workspace Isolation verified.';
END $$;

-- TEST CASE 2: Unauthenticated query (no session set)
SET LOCAL app.current_user_id = '';
SET LOCAL app.current_org_id = '';

DO $$
DECLARE
    found_count INT;
BEGIN
    SELECT count(*) INTO found_count FROM sales_documents;
    IF found_count <> 0 THEN
        RAISE EXCEPTION 'TEST 2 FAILED (SECURITY BREACH): Unauthenticated session retrieved % documents!', found_count;
    END IF;
    RAISE NOTICE '>> TEST 2 PASSED: Zero-session returns 0 documents.';
END $$;

-- TEST CASE 3: Carlos queries under Empresa Alfa context ("Minha Empresa")
SET LOCAL app.current_user_id = '33333333-3333-3333-3333-333333333333';
SET LOCAL app.current_org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DO $$
DECLARE
    found_count INT;
BEGIN
    SELECT count(*) INTO found_count FROM sales_documents;
    IF found_count <> 1 THEN
        RAISE EXCEPTION 'TEST 3 FAILED: Carlos in Empresa Alfa should see 1 doc, found %', found_count;
    END IF;

    -- Carlos attempts to view Alice's personal document
    SELECT count(*) INTO found_count FROM sales_documents WHERE id = 'd0000001-0000-0000-0000-000000000001';
    IF found_count <> 0 THEN
        RAISE EXCEPTION 'TEST 3.1 FAILED (SECURITY BREACH): Corporate session leaked Personal document!';
    END IF;
    RAISE NOTICE '>> TEST 3 PASSED: Corporate Workspace Isolation verified.';
END $$;

-- TEST CASE 4: Invariant Check Violation (Personal doc with org_id)
DO $$
BEGIN
    BEGIN
        INSERT INTO sales_documents (
            user_id, organization_id, context_scope, status, 
            storage_bucket, storage_path, mime_type, file_size_bytes, file_sha256
        ) VALUES (
            '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PERSONAL', 'UPLOADED',
            'b', 'p', 'image/png', 100, 'h'
        );
        RAISE EXCEPTION 'TEST 4 FAILED: Invariant check allowed PERSONAL doc with organization_id!';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE '>> TEST 4 PASSED: Constraint prevented illegal hybrid context.';
    END;
END $$;

ROLLBACK; -- Clean rollback of test data
