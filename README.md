# 🏛️ OPENsketch — Plataforma de Gestão de Vendas com Ingestão Inteligente
**Empresa**: ESCORP Solutions Systems  
**Escala Planejada**: 30.000+ Usuários Simultâneos  
**Arquitetura & Governança**: Software Architect & Alya

---

## 📌 Topologia de Provedores Aprovada

| Componente | Provedor Selecionado | Função & Isolamento |
| :--- | :--- | :--- |
| **Nuvem Primária** | **Google Cloud Platform (GCP)** | Cloud Run (API stateless), Cloud SQL (PostgreSQL 16 com RLS), Memorystore (Redis 7), Cloud Storage (KMS AES-256). |
| **Identidade / Auth** | **Google Identity Services / Firebase Auth** | OpenID Connect com fluxo PKCE. Modelo **Zero Password Storage**. |
| **Inteligência Artificial** | **Google Gemini (Vertex AI)** | Extração OCR e JSON estruturado com delimitação criptográfica de dados e constrained decoding. |
| **Borda / Edge & WAF** | **Cloudflare Pro** | Rate limiting na borda, mitigação DDoS, terminação TLS 1.3 e cabeçalhos de segurança. |

---

## 🔒 Os 3 Quality Gates Pré-Deploy (Auditorias Bloqueadoras)

O pipeline rejeita qualquer deploy caso qualquer uma das auditorias abaixo falhe:

1. **Auditoria 1: Isolamento Estrito de Dados (Multi-Tenant & "Meu Trabalho")**
   - Arquivo: `audits/audit-1-data-isolation.test.ts`
   - Valida que as políticas RLS impedem categoricamente que usuários individuais acessem dados corporativos ou de outros usuários, mesmo em caso de omissão de cláusulas `WHERE`.
2. **Auditoria 2: Segurança OWASP, Cookies de Sessão & Rate Limiting**
   - Arquivo: `audits/audit-2-owasp-security.test.ts`
   - Valida conformidade com os atributos de cookies (`__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Strict`), mitigação de CSRF e rate limiting.
3. **Auditoria 3: Blindagem de Prompt Injection & Sanitização de IA**
   - Arquivo: `audits/audit-3-prompt-injection.test.ts`
   - Valida o isolamento do System Prompt em relação a dados extraídos de notas e envio para quarentena de payloads de injeção indireta.

---

## 📂 Estrutura do Projeto

```
opensketch/
├── docker-compose.yml                     # PostgreSQL 16 com RLS e Redis 7 local
├── database/
│   └── migrations/
│       ├── 001_initial_schema_and_rls.sql # Schema mestre, tabelas, RLS e constraints
│       └── 002_rls_verification_test.sql  # Teste automatizado de penetração SQL RLS
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── security/
│       │   ├── auth-guard.ts              # OIDC Google token verification & Redis session check
│       │   ├── cookie-manager.ts          # __Host- cookie spec com HttpOnly e SameSite=Strict
│       │   ├── rate-limiter.ts            # Redis Sliding Window Rate Limiter
│       │   └── tenant-context.ts          # Transaction-scoped RLS context setter
│       └── ai/
│           ├── prompt-sanitizer.ts        # Sanitizador e encapsulador de nonces contra injeção
│           ├── gemini-client.ts           # Cliente Vertex AI Gemini com JSON Schema rígido
│           └── schemas/
│               └── invoice-extraction.schema.ts # Contrato estrito de saída de notas fiscais
├── audits/                                # As 3 Auditorias Bloqueadoras Pré-Deploy
│   ├── audit-1-data-isolation.test.ts
│   ├── audit-2-owasp-security.test.ts
│   └── audit-3-prompt-injection.test.ts
└── docs/
    └── SECURITY-CHECKLIST-23-CRITERIA.md  # 20 Requisitos de Segurança + 3 Auditorias
```

---

## 🚀 Como Executar o Ambiente Local (Fase 0)

1. **Subir Banco de Dados e Cache**:
   ```bash
   docker compose up -d
   ```
2. **Executar Auditoria de Isolamento de Dados SQL**:
   ```bash
   docker exec -i opensketch-postgres psql -U postgres -d opensketch -f /docker-entrypoint-initdb.d/001_init.sql
   ```
3. **Executar Suíte de Testes e Auditorias**:
   ```bash
   cd backend && npm test:audits
   ```
