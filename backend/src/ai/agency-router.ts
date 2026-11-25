import fs from 'node:fs';
import path from 'node:path';

export type AgencyCategory = 'sales' | 'marketing' | 'paid-media' | 'finance' | 'strategy';

export interface AgencyAgentDefinition {
  id: string;
  category: AgencyCategory;
  categoryLabel: string;
  displayName: string;
  badge: string;
  name: string;
  description: string;
  emoji: string;
  instructions: string;
  filePath: string;
}

export const CATEGORY_PERSONA_MAP: Record<
  AgencyCategory,
  { displayName: string; badge: string; label: string; emoji: string }
> = {
  sales: { displayName: 'Lana', badge: 'Lana • Vendas', label: 'Vendas', emoji: '💼' },
  marketing: { displayName: 'Clowe', badge: 'Clowe • Marketing', label: 'Marketing', emoji: '📣' },
  'paid-media': { displayName: 'Lois', badge: 'Lois • Anúncios', label: 'Anúncios', emoji: '🎯' },
  finance: { displayName: 'Mike', badge: 'Mike • Finanças', label: 'Finanças', emoji: '💰' },
  strategy: { displayName: 'Lex', badge: 'Lex • Estratégia', label: 'Estratégia', emoji: '♟️' },
};

const ALLOWED_CATEGORIES: Array<{ dir: AgencyCategory; label: string }> = [
  { dir: 'sales', label: 'Vendas' },
  { dir: 'marketing', label: 'Marketing' },
  { dir: 'paid-media', label: 'Anúncios' },
  { dir: 'finance', label: 'Finanças' },
  { dir: 'strategy', label: 'Estratégia' },
];

const CATEGORY_KEYWORDS: Record<AgencyCategory, string[]> = {
  'paid-media': [
    'publicar um anuncio', 'publicar anuncio', 'fazer anuncio', 'fazer um anuncio',
    'criar anuncio', 'criar um anuncio', 'melhorar anuncio', 'avaliar anuncio',
    'campanha patrocinada', 'campanhas patrocinadas', 'trafego pago',
    'anuncio', 'anuncios', 'trafego', 'meta ads', 'facebook ads', 'instagram ads',
    'google ads', 'ppc', 'campanha paga', 'roas', 'cpa', 'cpc', 'ctr', 'midia paga',
    'criativo', 'criativos', 'pixel', 'rastreamento', 'remarketing', 'patrocinado', 'patrocinada',
  ],
  finance: [
    'quanto preciso de margem', 'quanto preciso vender', 'quanto vender', 'ganhar r$', 'tirar r$',
    'por venda', 'lucro liquido', 'preco minimo', 'meta financeira', 'metas financeiras',
    'queimar minha margem', 'queimar margem', 'ate quanto consigo ceder', 'ate quanto posso ceder',
    'limite de desconto', 'sem perder margem', 'sem queimar',
    'financa', 'financas', 'financeiro', 'fluxo de caixa', 'dre', 'lucro', 'margem',
    'imposto', 'impostos', 'tributo', 'fiscal', 'preco', 'precificacao', 'orcamento',
    'custo', 'custos', 'despesa', 'faturamento', 'investimento', 'roi', 'payback', 'contabil',
  ],
  sales: [
    'venda', 'vendas', 'vender', 'proposta', 'funil', 'pipeline',
    'objecao', 'objecoes', 'fechamento', 'fechar', 'prospeccao', 'prospectar', 'abordagem',
    'follow-up', 'followup', 'whatsapp', 'cold', 'outbound', 'b2b',
    'negociacao', 'negociar', 'desconto', 'vai pensar', 'comissao', 'meta comercial',
  ],
  marketing: [
    'atrair clientes', 'atrair mais clientes', 'conseguir clientes', 'conseguir mais clientes',
    'gerar leads', 'mais clientes', 'aumentar movimento', 'movimento da loja',
    'divulgar', 'divulgacao', 'atrair', 'organico', 'organica', 'captacao',
    'marketing', 'conteudo', 'instagram', 'linkedin', 'tiktok', 'seo', 'copy', 'copywriting',
    'email marketing', 'e-mail marketing', 'newsletter', 'carrossel', 'video', 'reels',
    'engajamento', 'marca', 'posicionamento', 'crescimento', 'growth', 'redes sociais',
  ],
  strategy: [
    'estrategia', 'estrategico', 'plano', 'planejamento', 'expansao', 'escala', 'escalar',
    'lancamento', 'roadmap', 'diagnostico', 'swot', 'competitivo', 'diferencial', 'visao',
  ],
};

let cachedAgents: AgencyAgentDefinition[] | null = null;

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw };
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = val;
    }
  }
  return { meta, body: match[2].trim() };
}

function resolveAgentsRootDir(): string {
  const candidates = [
    path.resolve(__dirname, 'agency-agents'),
    path.resolve(process.cwd(), 'src', 'ai', 'agency-agents'),
    path.resolve(process.cwd(), 'backend', 'src', 'ai', 'agency-agents'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

export function loadAgencyAgents(): AgencyAgentDefinition[] {
  if (cachedAgents) return cachedAgents;

  const rootDir = resolveAgentsRootDir();
  const loaded: AgencyAgentDefinition[] = [];

  for (const cat of ALLOWED_CATEGORIES) {
    const catDir = path.join(rootDir, cat.dir);
    if (!fs.existsSync(catDir)) continue;

    const entries = fs.readdirSync(catDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      if (entry.name === 'QUICKSTART.md') continue;

      const fullPath = path.join(catDir, entry.name);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { meta, body } = parseFrontmatter(raw);
      const id = `${cat.dir}/${entry.name.replace(/\.md$/i, '')}`;
      const fallbackName = entry.name
        .replace(/\.md$/i, '')
        .replace(/^(sales|marketing|paid-media|finance|strategy)-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const persona = CATEGORY_PERSONA_MAP[cat.dir];

      loaded.push({
        id,
        category: cat.dir,
        categoryLabel: persona.label,
        displayName: persona.displayName,
        badge: persona.badge,
        name: meta.name || fallbackName,
        description: meta.description || `Especialista em ${persona.label} da suíte opensketch.`,
        emoji: persona.emoji,
        instructions: body.slice(0, 3200),
        filePath: fullPath,
      });
    }
  }

  cachedAgents = loaded;
  return loaded;
}

export function listAgencyAgentsSummary() {
  return loadAgencyAgents().map(({ id, category, categoryLabel, displayName, badge, name, description, emoji }) => ({
    id,
    category,
    categoryLabel,
    displayName,
    badge,
    name: displayName,
    technicalRole: name,
    description,
    emoji,
  }));
}

function normalizeText(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export type ChatOperationMode = 'CONSULTATION_PLANNING' | 'LIVE_NEGOTIATION';

export interface ChatModeDetection {
  mode: ChatOperationMode;
  hasExplicitObjection: boolean;
}

const LIVE_NEGOTIATION_TRIGGERS = [
  'estou com ',
  'to com ',
  'falando com ',
  'conversando com ',
  'atendendo ',
  'na frente do cliente',
  'aqui comigo',
  'fechar agora',
  'fechar com ele',
  'fechar com ela',
  'preciso fechar',
  'vai pensar',
  'vou pensar',
  'disse que',
  'falou que',
  'respondeu que',
  'pediu desconto',
  'quer desconto',
  'dar desconto',
  'so fecha se',
  'achou caro',
  'ta caro',
  'esta caro',
  'muito caro',
  'contraproposta',
  'contra-proposta',
  'objecao',
  'nao quer fechar',
  'travou no preco',
];

const OBJECTION_DETAIL_TRIGGERS = [
  'vai pensar',
  'vou pensar',
  'desconto',
  'so fecha se',
  'caro',
  'preco',
  'parcela',
  'entrada',
  'agio',
  'condicao',
  'condicoes',
  'prazo',
  'concorrente',
  'disse que',
  'falou que',
  'respondeu',
  'objecao',
  'contraproposta',
  'contra-proposta',
  'sem dinheiro',
  'orcamento',
];

export function detectChatMode(prompt: string): ChatModeDetection {
  const norm = normalizeText(prompt);
  const isLive = LIVE_NEGOTIATION_TRIGGERS.some((t) => norm.includes(t));
  if (!isLive) {
    return { mode: 'CONSULTATION_PLANNING', hasExplicitObjection: false };
  }
  const hasExplicitObjection = OBJECTION_DETAIL_TRIGGERS.some((t) => norm.includes(t));
  return { mode: 'LIVE_NEGOTIATION', hasExplicitObjection };
}

function pickBestAgentInCategory(
  agents: AgencyAgentDefinition[],
  category: AgencyCategory,
  normPrompt: string
): AgencyAgentDefinition | null {
  const pool = agents.filter((a) => a.category === category);
  if (pool.length === 0) return null;

  let bestAgent = pool[0];
  let bestAgentScore = -1;

  for (const agent of pool) {
    const haystack = normalizeText(`${agent.name} ${agent.description}`);
    let score = 0;
    for (const word of normPrompt.split(/\s+/)) {
      if (word.length >= 4 && haystack.includes(word)) {
        score += 2;
      }
    }
    if (category === 'sales' && (normPrompt.includes('captac') || normPrompt.includes('prospect')) && agent.id.includes('outbound')) score += 4;
    if (category === 'sales' && normPrompt.includes('proposta') && agent.id.includes('proposal')) score += 5;
    if (category === 'sales' && normPrompt.includes('objec') && agent.id.includes('coach')) score += 4;
    if (category === 'paid-media' && (normPrompt.includes('meta') || normPrompt.includes('instagram') || normPrompt.includes('facebook')) && agent.id.includes('paid-social')) score += 5;
    if (category === 'paid-media' && normPrompt.includes('google') && agent.id.includes('ppc')) score += 5;
    if (category === 'paid-media' && (normPrompt.includes('criativo') || normPrompt.includes('publicar') || normPrompt.includes('fazer')) && agent.id.includes('creative')) score += 6;
    if (category === 'paid-media' && (normPrompt.includes('melhorar') || normPrompt.includes('avaliar') || normPrompt.includes('auditar')) && agent.id.includes('auditor')) score += 6;
    if (category === 'finance' && (normPrompt.includes('imposto') || normPrompt.includes('tribut')) && agent.id.includes('tax')) score += 5;
    if (category === 'finance' && (normPrompt.includes('fluxo') || normPrompt.includes('dre') || normPrompt.includes('margem')) && agent.id.includes('fpa')) score += 4;
    if (category === 'marketing' && (normPrompt.includes('atrair') || normPrompt.includes('conseguir') || normPrompt.includes('leads') || normPrompt.includes('movimento') || normPrompt.includes('divulgar')) && agent.id.includes('growth-hacker')) score += 8;
    if (category === 'marketing' && (normPrompt.includes('conteudo') || normPrompt.includes('post') || normPrompt.includes('copy')) && agent.id.includes('content-creator')) score += 6;
    if (category === 'marketing' && normPrompt.includes('instagram') && agent.id.includes('instagram')) score += 5;
    if (category === 'marketing' && normPrompt.includes('seo') && agent.id.includes('seo-specialist')) score += 5;
    if (category === 'marketing' && normPrompt.includes('email') && agent.id.includes('email')) score += 5;

    if (score > bestAgentScore) {
      bestAgentScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent;
}

const NAME_MENTION_PATTERNS: Array<{ pattern: RegExp; category: AgencyCategory }> = [
  { pattern: /\blana\b/i, category: 'sales' },
  { pattern: /\b(?:clowe|chloe)\b/i, category: 'marketing' },
  { pattern: /\blois\b/i, category: 'paid-media' },
  { pattern: /\bmike\b/i, category: 'finance' },
  { pattern: /\blex\b/i, category: 'strategy' },
];

export function selectAgentsForPrompt(
  prompt: string,
  explicitAgentId?: string,
  mode: ChatOperationMode = 'CONSULTATION_PLANNING'
): AgencyAgentDefinition[] {
  const agents = loadAgencyAgents();
  if (agents.length === 0) return [];

  if (explicitAgentId) {
    const exact = agents.find((a) => a.id === explicitAgentId || a.category === explicitAgentId);
    if (exact) return [exact];
  }

  const normPrompt = normalizeText(prompt);

  // 1. Detectar menções explícitas por nome próprio (ex: "Clowe e Lois", "Chloe", "Lois")
  const mentionedCategories: Array<{ category: AgencyCategory; index: number }> = [];
  for (const item of NAME_MENTION_PATTERNS) {
    const match = item.pattern.exec(normPrompt);
    if (match) {
      mentionedCategories.push({ category: item.category, index: match.index });
    }
  }

  if (mentionedCategories.length > 0) {
    mentionedCategories.sort((a, b) => a.index - b.index);
    const chosen: AgencyAgentDefinition[] = [];
    for (const m of mentionedCategories) {
      if (chosen.some((c) => c.category === m.category)) continue;
      const picked = pickBestAgentInCategory(agents, m.category, normPrompt);
      if (picked) chosen.push(picked);
    }
    if (chosen.length > 0) return chosen.slice(0, 3);
  }

  // 2. Perguntas sobre limite de desconto e margem -> acionar Mike • Finanças + Lana • Vendas
  const asksDiscountMargin =
    (normPrompt.includes('desconto') || normPrompt.includes('ceder')) &&
    (normPrompt.includes('margem') || normPrompt.includes('lucro') || normPrompt.includes('custo') || normPrompt.includes('queimar'));

  if (asksDiscountMargin) {
    const mike = pickBestAgentInCategory(agents, 'finance', normPrompt);
    const lana = pickBestAgentInCategory(agents, 'sales', normPrompt);
    const combo = [mike, lana].filter(Boolean) as AgencyAgentDefinition[];
    if (combo.length > 0) return combo;
  }

  // 3. Modo Negociação ao Vivo sem menção explícita a outros especialistas
  if (mode === 'LIVE_NEGOTIATION') {
    const isDiscountOrMargin =
      normPrompt.includes('desconto') ||
      normPrompt.includes('margem') ||
      normPrompt.includes('agio') ||
      normPrompt.includes('parcela') ||
      normPrompt.includes('caro');
    const preferredIds = isDiscountOrMargin
      ? ['sales/sales-deal-strategist', 'sales/sales-coach']
      : ['sales/sales-coach', 'sales/sales-deal-strategist'];
    for (const pid of preferredIds) {
      const found = agents.find((a) => a.id === pid);
      if (found) return [found];
    }
  }

  // 3. Pontuar todas as categorias para detectar ação única ou ação híbrida multiagente
  const categoryScores: Array<{ category: AgencyCategory; score: number }> = [];
  for (const cat of Object.keys(CATEGORY_KEYWORDS) as AgencyCategory[]) {
    let score = 0;
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (normPrompt.includes(kw)) {
        score += kw.includes(' ') ? 3 : 2;
      }
    }
    categoryScores.push({ category: cat, score });
  }

  categoryScores.sort((a, b) => b.score - a.score);
  const top = categoryScores[0];

  if (!top || top.score === 0) {
    const fallback = pickBestAgentInCategory(agents, 'sales', normPrompt);
    return fallback ? [fallback] : [agents[0]];
  }

  const selectedCategories: AgencyCategory[] = [top.category];
  // Se houver intenções híbridas fortes (>= 4 pontos ou >= 2 com termos combinados de venda/oferta + marketing + anúncio)
  for (const candidate of categoryScores.slice(1)) {
    if (candidate.score >= 4 || (top.score >= 3 && candidate.score >= 3)) {
      selectedCategories.push(candidate.category);
    }
    if (selectedCategories.length >= 3) break;
  }

  const result: AgencyAgentDefinition[] = [];
  for (const cat of selectedCategories) {
    const picked = pickBestAgentInCategory(agents, cat, normPrompt);
    if (picked) result.push(picked);
  }

  return result.length > 0 ? result : [agents[0]];
}

export function selectBestAgentForPrompt(
  prompt: string,
  explicitAgentId?: string,
  mode: ChatOperationMode = 'CONSULTATION_PLANNING'
): AgencyAgentDefinition | null {
  return selectAgentsForPrompt(prompt, explicitAgentId, mode)[0] ?? null;
}
