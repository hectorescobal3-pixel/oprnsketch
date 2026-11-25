# 🎨 OPENsketch — UI Design System & Guia de Estilo
**Empresa**: ESCORP Solutions Systems  
**Especialista**: **Kael** (Product Design & UI/UX)  
**Coordenação**: **Alya** (Gestão de Engenharia) & **Software Architect**  
**Conformidade**: Dark Mode Técnico de Alto Contraste • Escala 30.000+ Usuários

---

## 1. Identidade Visual da Marca & Filosofia de Design

A identidade do **OPENsketch** expressa precisão de engenharia, sobriedade técnica e robustez de infraestrutura.
- **Monograma Circular (O + S)**: Representa a convergência entre circuitos e órbitas técnicas (a letra **O** em trilhas concêntricas de azul-ardósia) e o fluxo fluído de dados fiscais (a letra **S** central em prata de alto contraste).
- **Tipografia Wordmark**: `opensketch` em caixa baixa (lowercase) geométrica, transmitindo modernidade, clareza e acessibilidade.

Os arquivos oficiais da marca estão localizados em:
- Arquivo de Referência Original: [`public/assets/opensketch-brand-reference.jpg`](file:///C:/Users/Hector%20Julian/.gemini/antigravity/scratch/opensketch/public/assets/opensketch-brand-reference.jpg)
- Logotipo Completo Vetorial (SVG): [`public/assets/opensketch-logo.svg`](file:///C:/Users/Hector%20Julian/.gemini/antigravity/scratch/opensketch/public/assets/opensketch-logo.svg)
- Monograma Circular Vetorial (SVG): [`public/assets/opensketch-monogram.svg`](file:///C:/Users/Hector%20Julian/.gemini/antigravity/scratch/opensketch/public/assets/opensketch-monogram.svg)

---

## 2. Design Tokens (Paleta de Cores & Superfícies)

```
+--------------------------------------------------------------------------+
|  BACKGROUND PRINCIPAL: #121417 (Preto Técnico Profundo)                   |
|  +--------------------------------------------------------------------+  |
|  |  SUPERFÍCIE / CARDS / SPLIT-VIEW: #1C1E22 (Cinza Grafite)          |  |
|  |  +--------------------------------------------------------------+  |  |
|  |  |  BORDA ESTRUTURAL: #272C34                                   |  |  |
|  |  |  PRIMÁRIA DESTAQUE: #3D5A73 (Azul-Ardósia Técnico)           |  |  |
|  |  |  SECUNDÁRIA / ACENTO: #2C4257 (Azul Profundo)                |  |  |
|  |  |  TEXTO PRINCIPAL & ÍCONES: #D9DEE4 (Prata Claro)             |  |  |
|  |  +--------------------------------------------------------------+  |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

### 2.1. Tokens Principais (CSS / Tailwind Variables)

| Token Name | Valor Hex | Uso no Sistema | Nível de Contraste (WCAG AAA) |
| :--- | :--- | :--- | :--- |
| `color-bg-base` | `#121417` | Fundo principal da aplicação e backdrop de visualização de documentos | N/A (Plano de Fundo) |
| `color-surface-card` | `#1C1E22` | Cards de vendas, painel direito do Split-View, caixas modais e inputs | Elevado sobre base |
| `color-surface-elevated` | `#24282E` | Menus dropdown, popovers, tooltips e estados hover de botões | Superfície flutuante |
| `color-border-subtle` | `#272C34` | Divisórias de split-view, bordas de tabela e separadores de seção | Delimitação técnica nítida |
| `color-primary-slate` | `#3D5A73` | Botões primários, anel de foco (focus-ring), progresso ativo e realce | Acento ativo da marca |
| `color-secondary-deep` | `#2C4257` | Bordas inativas da zona de drop, fundos de badges corporativos | Acento secundário |
| `color-text-primary` | `#D9DEE4` | Tipografia de títulos, valores monetários principais e ícones ativos | **14.2:1** (Supera WCAG AAA) |
| `color-text-secondary` | `#8A96A3` | Labels secundárias, metadados, timestamps e placeholders | **5.8:1** (WCAG AA) |
| `color-text-muted` | `#5C6670` | Textos desabilitados e notas de rodapé técnicas | Suporte |

### 2.2. Tokens Semânticos & Status de Validação

| Estado | Token Hex | Uso |
| :--- | :--- | :--- |
| **Success (Aprovado)** | `#10B981` (Esmeralda Técnico) | Documento extraído com alta confiança, conciliação 100% batida |
| **Warning (Atenção)** | `#F59E0B` (Âmbar) | Divergência em centavos, item não catalogado, revisão humana necessária |
| **Quarantine (Segurança)** | `#E11D48` (Rubi / Rose) | Documento bloqueado por suspeita de injeção ou violação de integridade |
| **Info / Personal** | `#64748B` (Ardósia Suave) | Indicador neutro de contexto pessoal ("Meu Trabalho") |

---

## 3. Regras de Comportamento Visual da Fase 1

### 3.1. Posicionamento e Respiro da Marca
1. **Cabeçalho Principal (Top Navigation Bar)**:
   - **Posição**: Canto superior esquerdo (`top: 0`, `left: 0`).
   - **Componente**: SVG [`opensketch-logo.svg`](file:///C:/Users/Hector%20Julian/.gemini/antigravity/scratch/opensketch/public/assets/opensketch-logo.svg) com altura fixa de **32px** (proporcional, largura ~138px).
   - **Área de Respiro**: Margem de segurança de `16px` vertical e `24px` horizontal. Em telas mobile (< 640px), colapsa automaticamente para o monograma isolado [`opensketch-monogram.svg`](file:///C:/Users/Hector%20Julian/.gemini/antigravity/scratch/opensketch/public/assets/opensketch-monogram.svg) com `32x32px`.
2. **Tela de Autenticação / Onboarding**:
   - Centralizado no topo do card de autenticação com altura de **48px**, margem inferior mínima de `40px` antes do botão de login com Google OIDC.

---

### 3.2. Indicador Visual de Contexto: "Meu Trabalho" vs. "Minha Empresa"

Para impedir confusão operacional entre dados pessoais e dados corporativos, a interface utiliza **identificadores de contexto persistentes no topo e nas bordas ativas**:

```
[ CONTEXTO PESSOAL: "Meu Trabalho" ]
+----------------------------------------------------------------------+
| [👤 Meu Trabalho] (Badge Neutro Prata/Slate: bg #1C1E22, border #3D5A73)
| Borda lateral esquerda do cabeçalho: 3px sólida em #64748B
+----------------------------------------------------------------------+

[ CONTEXTO CORPORATIVO: "Minha Empresa" ]
+----------------------------------------------------------------------+
| [🏢 Empresa Alfa Ltda  •  ADMIN] (Badge Acento Azul: bg #2C4257, border #4A6D8C)
| Borda lateral esquerda do cabeçalho: 3px sólida em #3D5A73
+----------------------------------------------------------------------+
```

- **Seletor de Contexto (Context Switcher)**:
  - Localizado imediatamente ao lado da logo no topo.
  - Alternância imediata recarrega o estado e envia o cabeçalho `X-Workspace-Context: personal | <orgId>`.
  - Transição visual suave (150ms ease) com feedback tátil no indicador de status.

---

### 3.3. Estados Visuais da Área de Drag-and-Drop & Clipboard (Colar Nota)

A zona de captura aceita arrastar arquivos ou pressionar `Ctrl+V` em qualquer lugar da tela.

| Estado | Visual / Estilo | Feedback ao Usuário |
| :--- | :--- | :--- |
| **1. Idle (Repouso)** | Fundo `#1C1E22`, borda tracejada de 2px em `#2C4257`, raio de 12px. Ícone de captura em `#8A96A3`. | Texto: *"Arraste a nota fiscal ou pressione Ctrl+V para colar direto da área de transferência"* |
| **2. DragOver (Arrastando arquivo sobre)** | Fundo `#24282E`, borda sólida de 2px em `#3D5A73`, glow externo `box-shadow: 0 0 16px rgba(61,90,115,0.4)`. Escala sutil `scale(1.008)`. | Ícone acende em `#D9DEE4`. Texto: *"Solte o documento para processar"* |
| **3. Pasting / Uploading (Progresso)** | Fundo `#1C1E22`, barra de progresso linear técnica no topo (altura 3px) com gradiente `#3D5A73` -> `#D9DEE4`. | Animação de pulso técnico suave. Mensagem: *"Enviando imagem criptografada e acionando IA..."* |
| **4. Processado com Sucesso** | Borda de 1.5px em `#10B981` (Esmeralda), transição suave de 200ms para a tela de **Split-View**. | Ícone de check técnico. Exibição imediata da nota lado a lado com os campos extraídos. |
| **5. Quarentena / Erro de Validação** | Borda sólida de 2px em `#E11D48`, fundo `#1F1417`. Badge de quarentena visível com ícone de escudo. | Alerta: *"Documento retido para análise de segurança (Quarentena). Motivo registrado na auditoria."* |

---

### 3.4. Interface Split-View (Conferência de Vendas Lado a Lado)

A tela de validação de documentos fiscais adota uma divisão bilateral de alta densidade de informação:

```
+-----------------------------------------------------------------------------------+
|  [Logo opensketch]  [🏢 Minha Empresa]                 [Status: Extraído 98%] [Salvar] |
+------------------------------------------+----------------------------------------+
| PAINEL ESQUERDO (50%): VISUALIZADOR      | PAINEL DIREITO (50%): FORMULÁRIO       |
| Fundo: #121417                           | Fundo: #1C1E22                         |
|                                          |                                        |
|  [+] [-] [100%] [Girar]                  |  Numero da Nota: [ 000.129.458       ] |
|  +------------------------------------+  |  Emissor:        [ Supermercado Alfa ] |
|  |                                    |  |  CNPJ:           [ 12.345.678/0001-90] |
|  |   Imagem Original do Documento     |  |  Data Emissão:   [ 2026-11-17        ] |
|  |   (com zoom suave, pan e highlight |  |                                        |
|  |    dos campos reconhecidos)        |  |  ITENS IDENTIFICADOS (3 itens):        |
|  |                                    |  |  [1] Café Especial 500g   x2  R$ 38,00 |
|  |                                    |  |  [2] Filtro de Papel 102  x1  R$  6,50 |
|  |                                    |  |                                        |
|  +------------------------------------+  |  TOTAL GERAL:             R$ 44,50     |
+------------------------------------------+----------------------------------------+
```

1. **Painel Esquerdo (Document Viewer)**:
   - Fundo escuro puro `#121417` para máximo contraste da imagem do cupom/recibo.
   - Controles de zoom, rotação e pan ancorados no topo direito do visualizador.
   - Borda divisória técnica vertical de 1px em `#272C34`.
2. **Painel Direito (Data Extraction & Verification Form)**:
   - Superfície em `#1C1E22`.
   - Cards de campos com labels em `#8A96A3` e valores editáveis em `#D9DEE4`.
   - Cada campo exibe um indicador sutil de confiança da extração da IA:
     - Confiança ≥ 90%: Indicador neutro discreto.
     - Confiança < 90%: Borda em tom âmbar `#F59E0B` solicitando conferência visual do operador.
   - Tabela de itens com rolagem independente e atalhos de teclado (Tab navega entre preços e quantidades, Enter confirma a venda).
