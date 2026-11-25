# 23 Critérios Mínimos de Engenharia de Segurança & Auditoria Pré-Deploy
**Produto**: OPENsketch (ESCORP Solutions Systems)  
**Conformidade**: Escala 30.000+ Usuários Simultâneos  
**Auditor**: Software Architect & Alya (Gestão de Engenharia)

---

## I. Os 20 Requisitos Mínimos de Segurança

### A. Autenticação, Sessão e Identidade (OIDC Zero Password)
1. **REQ-SEC-01 (Zero Password Storage)**: Nenhuma credencial de senha ou hash de senha é armazenado ou gerenciado pelo sistema. Autenticação delegada ao Google Identity Services / Firebase Authentication via OIDC com fluxo PKCE.
2. **REQ-SEC-02 (Cookie de Sessão `__Host-` de Alta Segurança)**: O cookie de sessão principal deve usar o prefixo `__Host-opensketch_sid`, com atributos obrigatórios: `HttpOnly = true`, `Secure = true`, `SameSite = Strict`, `Path = /`, e escopo sem subdomínios.
3. **REQ-SEC-03 (Revogação Instantânea de Sessão)**: Sessões ativas mantidas no Redis Memorystore com chave de expiração. O logout invalida a sessão no Redis imediatamente em $O(1)$ e marca a revogação no banco relacional.
4. **REQ-SEC-04 (Encerramento Remoto Multidispositivo)**: Capacidade de revogar todas as sessões ativas de um usuário em caso de suspeita de comprometimento.
5. **REQ-SEC-05 (Rotação e Curto Tempo de Vida de Tokens)**: Tokens de acesso de curta duração (máximo 15 minutos), com refresh tokens associados a uma única sessão e device fingerprint.

### B. Isolamento Estrito de Dados e Multi-Tenancy (ADR-002)
6. **REQ-SEC-06 (Isolamento via Row-Level Security no Kernel do DB)**: As regras de separação entre "Meu Trabalho" (individual) e "Minha Empresa" (corporativo) são impostas via políticas PostgreSQL RLS. Uma query sem cláusula `WHERE` explícita da aplicação jamais pode retornar dados de outro usuário ou organização.
7. **REQ-SEC-07 (Injeção de Sessão em Nível de Transação)**: Toda requisição executa `SET LOCAL app.current_user_id` e `SET LOCAL app.current_org_id` dentro de uma transação explícita, impossibilitando vazamento de contexto no pool de conexões (PgBouncer/Cloud SQL Proxy).
8. **REQ-SEC-08 (Validação de Pertencimento a Tenant / Membership)**: Proibição de acesso a recursos de organização por usuários que não possuam registro ativo na tabela `organization_members`.
9. **REQ-SEC-09 (Zero Intersecção de Contexto)**: Documentos com escopo `PERSONAL` têm `organization_id` estritamente `NULL`. Documentos `CORPORATE` exigem `organization_id` válido e preenchido.
10. **REQ-SEC-10 (Trilhas de Auditoria Imutáveis - Audit Logging)**: Registro append-only de todas as mutações de dados críticos, contendo `actor_id`, `tenant_id`, `action`, `resource`, `ip_address` e `timestamp`.

### C. Proteção da Camada de Rede, Borda e API
11. **REQ-SEC-11 (Rate Limiting de Múltiplos Níveis)**: Rate limiting na borda (Cloudflare Pro) e na aplicação (Redis Sliding Window). Limite restrito de 5 req/min para autenticação e 15 req/min para processamento OCR.
12. **REQ-SEC-12 (Cabeçalhos HTTP de Segurança - Strict Security Headers)**:
    - `Content-Security-Policy (CSP)` estrita sem `unsafe-inline` para scripts executáveis.
    - `Strict-Transport-Security (HSTS)`: `max-age=63072000; includeSubDomains; preload`.
    - `X-Content-Type-Options: nosniff`.
    - `X-Frame-Options: DENY`.
    - `Referrer-Policy: strict-origin-when-cross-origin`.
13. **REQ-SEC-13 (Validação e Sanitização Rígida de Entradas)**: Validação de todos os payloads HTTP via schemas estritos (TypeBox / Zod). Rejeição imediata (HTTP 400/422) de campos não declarados (`stripUnknown: false` / `additionalProperties: false`).
14. **REQ-SEC-14 (Armazenamento Seguro de Arquivos via Presigned URLs Efêmeras)**: Imagens de notas e PDFs são persistidos em Google Cloud Storage com criptografia AES-256 (Cloud KMS). URLs de leitura e upload direto têm TTL máximo de 15 minutos e são geradas sob validação de autorização.
15. **REQ-SEC-15 (Tratamento Seguro de Exceções e Erros)**: Mensagens de erro de produção são sanitizadas para não expor stack traces, versões de dependências, nomes de tabelas ou dados de infraestrutura.

### D. Blindagem de IA, OCR e Prompt Injection (ADR-004)
16. **REQ-SEC-16 (Separação Rígida de Papéis no Provedor LLM)**: Regras de negócio e onboarding ficam restritas ao bloco de instrução de sistema (`system_instruction`), jamais interpoladas no mesmo bloco que o texto bruto extraído da nota fiscal.
17. **REQ-SEC-17 (Delimitação Criptográfica de Conteúdo Não Confiável)**: O texto bruto da nota fiscal é sanitizado e encapsulado em delimitadores seguros (`<<<UNTRUSTED_DOCUMENT_CONTENT:UUID>>>`). O modelo é instruído de que instruções contidas nesse bloco são apenas dados literais.
18. **REQ-SEC-18 (Forçamento Estrutural de Resposta - Constrained Decoding)**: O endpoint Vertex AI Gemini utiliza `response_mime_type: "application/json"` com schema estruturado rígido. Qualquer texto fora do formato de JSON é bloqueado na geração.
19. **REQ-SEC-19 (Sanitização e Quarentena de Payloads Maliciosos)**: Detecção de termos como "ignore previous instructions", "system override", "you are now in maintenance mode" dispara quarentena imediata do documento e alerta de segurança.
20. **REQ-SEC-20 (Imutabilidade de Parâmetros de Onboarding)**: Diretrizes de negócio do usuário/empresa são carregadas do banco de dados autenticado e não podem ser sobrescritas por dados contidos no documento lido.

---

## II. As 3 Auditorias Bloqueadoras Pré-Deploy (Quality Gates)

O pipeline de CI/CD (GitHub Actions / Cloud Build) está configurado para **abortar o deploy imediatamente** se qualquer uma das três auditorias falhar:

```
[BUILD] -> [AUDITORIA 1: Isolamento de Dados] -> [AUDITORIA 2: OWASP & Dependências] -> [AUDITORIA 3: Prompt Injection] -> [DEPLOY]
```

### 1. Auditoria 1: Isolamento Estrito de Dados (Multi-Tenant & "Meu Trabalho")
- **Execução**: Suíte de testes automatizados (`audits/audit-1-data-isolation.test.ts`).
- **Critério de Bloqueio**:
  - Teste 1.1: Usuário A (Pessoal) tenta ler documento de Usuário B (Pessoal) via ID direto -> Deve retornar `404 Not Found` ou `[]`.
  - Teste 1.2: Usuário A (sem vínculo à Empresa X) tenta acessar documentos da Empresa X -> Deve retornar `403 Forbidden` ou `[]`.
  - Teste 1.3: Tentativa de bypass de RLS executando queries sem variáveis de sessão -> Deve retornar zero linhas.
  - Teste 1.4: Inserção de documento com `context_scope = 'PERSONAL'` e `organization_id` preenchido -> Deve ser rejeitado por constraint de integridade no banco.

### 2. Auditoria 2: Segurança de Dependências, Borda e OWASP
- **Execução**: Scan estático SAST/DAST e auditoria de cabeçalhos (`audits/audit-2-owasp-security.test.ts`).
- **Critério de Bloqueio**:
  - `npm audit --audit-level=high`: Zero vulnerabilidades altas ou críticas permitidas.
  - Verificação de headers obrigatórios (CSP sem unsafe-inline, HSTS, X-Content-Type-Options).
  - Validação dos atributos de cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, prefixo `__Host-`).
  - Verificação do Rate Limiting ativo para endpoints críticos.

### 3. Auditoria 3: Blindagem de Prompt Injection & Sanitização de IA
- **Execução**: Execução da suíte de pentest de IA (`audits/audit-3-prompt-injection.test.ts`) contendo dataset de 50+ notas fiscais simuladas com ataques de injeção indireta.
- **Critério de Bloqueio**:
  - Nenhuma injeção de comando deve alterar a saída estruturada do schema ou vazar o prompt do sistema.
  - Payloads maliciosos devem ser capturados pelo validador e enviados para quarentena sem execução de comportamento imprevisto.
