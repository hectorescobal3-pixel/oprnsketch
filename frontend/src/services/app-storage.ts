// ==============================================================================
// OPENsketch Application Storage Service
// Implements complete local persistence for Etapa 2 interactive functionality
// Partitioned by Context Scope: 'PERSONAL' vs. 'CORPORATE'
// ==============================================================================

export type ActiveWorkspace = 'individual' | 'empresa';
export type ScopeType = 'PERSONAL' | 'CORPORATE' | 'individual' | 'empresa';

export function normalizeWorkspaceEnv(scope?: ScopeType): ActiveWorkspace {
  if (scope === 'CORPORATE' || scope === 'empresa') return 'empresa';
  return 'individual';
}

export interface UserProfileData {
  fullName: string;
  username: string;
  profession: string;
  segment?: string;
  phone?: string;
  email: string;
  coverImage?: string | null;
  profilePhoto?: string | null;
  onboardingCompleted?: boolean;
}

export interface ClientRecord {
  id: string;
  name: string;
  documentTaxId: string;
  email: string;
  totalInvoiced: number;
  invoicesCount: number;
  status: 'ATIVO' | 'POTENCIAL' | 'INATIVO';
  lastInvoiceDate: string;
  phone?: string;
  segment?: string;
  notes?: string;
  origin?: 'MANUAL' | 'DOCUMENTO_IA' | 'PROSPECCAO_B2B';
}

export interface AdItem {
  id: string;
  title: string;
  format: '9:16' | '1:1' | '16:9';
  version?: string;
  status?: 'APROVADO' | 'RASCUNHO' | 'REVISAO';
  impressions?: number;
  ctr?: string;
  lastUpdated: string;
  aspectRatioLabel: string;
  caption?: string;
  imageUrl?: string;
}

export interface DistributionItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
  description?: string;
}

export interface MetasData {
  metaTotal: number;
  realizadoTotal: number;
  deadline: string;
  cycleName: string;
  distribution: DistributionItem[];
  goalTitle?: string;
}

export type LibraryCategory = 'IMAGE' | 'VIDEO' | 'PDF';

export interface LibraryDocument {
  id: string;
  fileName: string;
  category: LibraryCategory;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  description?: string;
  contentDataUrl?: string;
  aiAccessible?: boolean;
}

export interface B2BLead {
  id: string;
  companyName: string;
  cnpj: string;
  segment: string;
  fitScore: number;
  estimatedVolume: string;
  region: string;
  status: 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'CONVERTIDO';
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string[];
  lastInteraction?: string;
}

// Default Seed Data
const DEFAULT_CLIENTS_PERSONAL: ClientRecord[] = [
  {
    id: 'CLI-001',
    name: 'Consultoria Alpha Projetos',
    documentTaxId: '28.192.401/0001-29',
    email: 'financeiro@alphaprojetos.com.br',
    totalInvoiced: 12450.0,
    invoicesCount: 6,
    status: 'ATIVO',
    lastInvoiceDate: '2026-11-14',
    phone: '(11) 98765-4321',
    segment: 'Consultoria',
  },
  {
    id: 'CLI-002',
    name: 'Estúdio Design & Code',
    documentTaxId: '14.892.102/0001-83',
    email: 'contato@designcode.studio',
    totalInvoiced: 8900.0,
    invoicesCount: 4,
    status: 'ATIVO',
    lastInvoiceDate: '2026-11-10',
    phone: '(21) 99887-1122',
    segment: 'Design & Tecnologia',
  },
  {
    id: 'CLI-003',
    name: 'Laboratório Inovação Tech',
    documentTaxId: '45.102.394/0001-11',
    email: 'compras@labinovacao.tech',
    totalInvoiced: 4200.0,
    invoicesCount: 2,
    status: 'POTENCIAL',
    lastInvoiceDate: '2026-10-28',
    phone: '(31) 97123-4567',
    segment: 'Pesquisa',
  },
];

const DEFAULT_CLIENTS_CORPORATE: ClientRecord[] = [
  {
    id: 'CORP-CLI-101',
    name: 'Indústria Metalúrgica Paulista S.A.',
    documentTaxId: '04.291.849/0001-44',
    email: 'fiscal@metalurgicapaulista.com.br',
    totalInvoiced: 84320.0,
    invoicesCount: 24,
    status: 'ATIVO',
    lastInvoiceDate: '2026-11-17',
    phone: '(11) 3210-9800',
    segment: 'Indústria Pesada',
  },
  {
    id: 'CORP-CLI-102',
    name: 'Logística & Transportes Horizonte',
    documentTaxId: '19.482.019/0001-72',
    email: 'contabilidade@horizonte.log.br',
    totalInvoiced: 46190.0,
    invoicesCount: 15,
    status: 'ATIVO',
    lastInvoiceDate: '2026-11-16',
    phone: '(19) 3450-1122',
    segment: 'Transporte & Cargas',
  },
  {
    id: 'CORP-CLI-103',
    name: 'Varejo Supermercados União',
    documentTaxId: '33.910.284/0001-50',
    email: 'recebimento@varejouniao.com.br',
    totalInvoiced: 31800.0,
    invoicesCount: 9,
    status: 'POTENCIAL',
    lastInvoiceDate: '2026-11-05',
    phone: '(31) 3890-4400',
    segment: 'Supermercados',
  },
  {
    id: 'CORP-CLI-104',
    name: 'Distribuidora Global Peças',
    documentTaxId: '52.190.482/0001-99',
    email: 'sac@globalpecas.com.br',
    totalInvoiced: 18950.0,
    invoicesCount: 7,
    status: 'ATIVO',
    lastInvoiceDate: '2026-10-31',
    phone: '(41) 3322-7711',
    segment: 'Autopeças',
  },
];

const DEFAULT_ADS: AdItem[] = [
  {
    id: 'AD-201',
    title: 'Promoção Especial de Fim de Ano',
    format: '9:16',
    status: 'APROVADO',
    lastUpdated: '18/11/2026',
    aspectRatioLabel: 'Stories / Reels (Vídeo em pé)',
    caption: 'Vídeo rápido mostrando nossos principais produtos com desconto de 15% para clientes fiéis. Adicionar link direto para o nosso WhatsApp!',
  },
  {
    id: 'AD-202',
    title: 'Dicas Práticas do Nosso Atendimento',
    format: '1:1',
    status: 'APROVADO',
    lastUpdated: '16/11/2026',
    aspectRatioLabel: 'Feed do Instagram / Facebook (Quadrado)',
    caption: 'Foto de boa qualidade com 3 dicas úteis para ajudar os clientes no dia a dia. Legenda explicativa com convite para tirar dúvidas nos comentários.',
  },
  {
    id: 'AD-203',
    title: 'Bastidores: Como Preparamos Cada Pedido',
    format: '9:16',
    status: 'RASCUNHO',
    lastUpdated: '15/11/2026',
    aspectRatioLabel: 'Stories / Reels (Vídeo em pé)',
    caption: 'Gravar um vídeo curto mostrando o cuidado e a dedicação da nossa equipe organizando os pedidos e atendendo com carinho.',
  },
  {
    id: 'AD-204',
    title: 'Apresentação dos Nossos Serviços',
    format: '16:9',
    status: 'APROVADO',
    lastUpdated: '12/11/2026',
    aspectRatioLabel: 'Vídeo / YouTube (Deitado)',
    caption: 'Vídeo explicativo e simples para apresentar o que fazemos para novos clientes que entrarem em contato pelo WhatsApp.',
  },
];

const DEFAULT_METAS: MetasData = {
  goalTitle: 'Meta Geral de Atividades',
  metaTotal: 100,
  realizadoTotal: 0,
  deadline: '31/12/2026',
  cycleName: 'Ciclo Q4 2026',
  distribution: [
    {
      label: 'Projetos e Atendimentos Concluídos',
      value: 0,
      percentage: 40,
      color: '#3D5A73',
      description: 'Entregas finais validadas e aprovadas pelos clientes ou contratantes.',
    },
    {
      label: 'Tarefas e Execuções em Andamento',
      value: 0,
      percentage: 25,
      color: '#4A6D8C',
      description: 'Etapas de desenvolvimento, produção técnica e reuniões ativas.',
    },
    {
      label: 'Alinhamentos e Comunicação',
      value: 0,
      percentage: 20,
      color: '#10B981',
      description: 'Feedbacks recebidos, revisões e mensagens respondidas com sucesso.',
    },
    {
      label: 'Planejamento e Próximos Passos',
      value: 0,
      percentage: 15,
      color: '#F59E0B',
      description: 'Organização de agenda, novos contatos e preparação de entregas futuras.',
    },
  ],
};

const LEGACY_DEMO_DOC_IDS = new Set([
  'ARQ-101',
  'ARQ-102',
  'ARQ-201',
  'ARQ-202',
  'ARQ-301',
  'ARQ-302',
]);

const LEGACY_DEMO_DOC_NAMES = new Set([
  'Identidade_Visual_OpenSketch_Banner.png',
  'Foto_Equipe_Atendimento.jpg',
  'Apresentacao_Institucional_Servicos.mp4',
  'Demonstracao_Fluxo_Trabalho.mp4',
  'Manual_Operacional_e_Diretrizes.pdf',
  'Proposta_Comercial_e_Escopo.pdf',
]);

const DEFAULT_LEADS: B2BLead[] = [];

export class AppStorage {
  private static memoryStore: Map<string, string> = new Map();

  public static isQuotaExceededError(err: any): boolean {
    return (
      (err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.code === 22 ||
          err.code === 1014 ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) ||
      (err && typeof err === 'object' && (err.name === 'QuotaExceededError' || err.code === 22))
    );
  }

  public static safeSetItem(key: string, value: string): void {
    // Keep in-memory store updated for session resilience
    this.memoryStore.set(key, value);

    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (err: any) {
      if (this.isQuotaExceededError(err)) {
        console.warn(`[OPENsketch Storage] Cota de armazenamento excedida ao gravar chave "${key}". Ativando resiliência.`);
        
        const friendlyMsg =
          'Atenção: O espaço de armazenamento do seu navegador está cheio. Recomendamos exportar seus dados em Configurações ou excluir itens antigos para liberar espaço. Seus registros permanecem salvos durante esta sessão.';

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('opensketch:storage-warning', {
              detail: { type: 'QUOTA_EXCEEDED', message: friendlyMsg, key },
            })
          );
        }

        throw new Error(friendlyMsg);
      }
      throw err;
    }
  }

  public static safeGetItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch (err) {
        console.warn(`[OPENsketch Storage] Falha ao ler localStorage para chave "${key}"`, err);
      }
    }
    return this.memoryStore.get(key) || null;
  }

  private static activeUserUid = 'anon';

  public static setActiveUserUid(uid?: string | null): void {
    const clean = (uid || '').trim();
    this.activeUserUid = clean || 'anon';
    this.clearLegacySharedKeys();
  }

  public static clearLegacySharedKeys(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const toDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.startsWith('opensketch_individual_') ||
          k.startsWith('opensketch_empresa_') ||
          k.startsWith('opensketch_profile_') ||
          k.startsWith('opensketch_free_ai_daily_') ||
          k === 'opensketch_user_plan'
        ) {
          toDelete.push(k);
        }
      }
      toDelete.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  public static clearAllLocalSessionData(): void {
    this.memoryStore.clear();
    this.clearLegacySharedKeys();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
      if (typeof localStorage !== 'undefined') {
        const sessionKeys = [
          'opensketch_current_user',
          'opensketch_environment_selected',
          'opensketch_active_context',
          'opensketch_owner_state',
          'opensketch_user_plan',
          'opensketch_ai_quota_snapshot',
          'opensketch_pending_checkout_plan',
          'opensketch_profile_email',
        ];
        sessionKeys.forEach((k) => localStorage.removeItem(k));
      }
    } catch {}
  }

  public static getKey(prefix: string, scope?: ScopeType): string {
    const env = normalizeWorkspaceEnv(scope);
    const uidScope = this.activeUserUid || 'anon';
    return `opensketch_${uidScope}_${env}_${prefix}`;
  }

  // ================= PERFIL =================
  public static getProfile(scope?: ScopeType): UserProfileData {
    const env = normalizeWorkspaceEnv(scope);
    const key = this.getKey('perfil', env);
    const data = this.safeGetItem(key);
    if (!data) {
      const initial: UserProfileData =
        env === 'empresa'
          ? {
              fullName: 'Minha Empresa Ltda',
              username: '@minhaempresa',
              profession: '',
              segment: '',
              email: '',
              coverImage: null,
              profilePhoto: null,
              onboardingCompleted: false,
            }
          : {
              fullName: '',
              username: '',
              profession: '',
              segment: '',
              email: '',
              coverImage: null,
              profilePhoto: null,
              onboardingCompleted: false,
            };
      this.safeSetItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      const parsed = JSON.parse(data);
      // Ensure onboardingCompleted flag exists
      if (typeof parsed.onboardingCompleted !== 'boolean') {
        parsed.onboardingCompleted = Boolean(parsed.profession && parsed.profession.trim().length > 0);
      }
      return parsed;
    } catch {
      return {
        fullName: env === 'empresa' ? 'Minha Empresa' : 'Hector Julian',
        username: env === 'empresa' ? '@minhaempresa' : '@hectorjulian',
        profession: '',
        segment: '',
        email: 'usuario@opensketch.app',
        onboardingCompleted: false,
      };
    }
  }

  public static saveProfile(scope: ScopeType, profile: UserProfileData): UserProfileData {
    const env = normalizeWorkspaceEnv(scope);
    const key = this.getKey('perfil', env);
    this.safeSetItem(key, JSON.stringify(profile));
    return profile;
  }

  public static completeOnboarding(
    scope: ScopeType,
    profession: string,
    segment?: string
  ): UserProfileData {
    const current = this.getProfile(scope);
    const cleanProfession = (profession || '').trim();
    const cleanSegment = (segment && segment.trim()) ? segment.trim() : cleanProfession;
    const updated: UserProfileData = {
      ...current,
      profession: cleanProfession,
      segment: cleanSegment,
      onboardingCompleted: Boolean(cleanProfession.length > 0),
    };
    return this.saveProfile(scope, updated);
  }

  public static isOnboardingCompleted(scope?: ScopeType): boolean {
    const profile = this.getProfile(scope);
    return Boolean(profile.onboardingCompleted && profile.profession && profile.profession.trim().length > 0);
  }

  public static clearEnvironmentData(scope: ScopeType): void {
    const env = normalizeWorkspaceEnv(scope);
    const prefix = `opensketch_${env}_`;
    try {
      // Clear from in-memory fallback store
      for (const memKey of Array.from(this.memoryStore.keys())) {
        if (memKey.startsWith(prefix) || memKey.startsWith(`opensketch_onboarding_completed_`)) {
          this.memoryStore.delete(memKey);
        }
      }
      // Clear from localStorage
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem(`opensketch_onboarding_completed_${scope}`);
        localStorage.removeItem(`opensketch_onboarding_completed_${env === 'empresa' ? 'CORPORATE' : 'PERSONAL'}`);
      }
    } catch (e) {
      console.warn('Error clearing environment data', e);
    }
  }

  public static clearAllUserData(): void {
    try {
      // Clear from in-memory fallback store
      for (const memKey of Array.from(this.memoryStore.keys())) {
        if (memKey.startsWith('opensketch_')) {
          this.memoryStore.delete(memKey);
        }
      }
      // Clear from localStorage
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('opensketch_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (e) {
      console.warn('Error clearing all user data', e);
    }
  }

  // ================= CHAT INÍCIO (SESSÃO EFÊMERA - ZERO PERSISTÊNCIA) =================
  public static getChatMessages(scope?: ScopeType): any[] {
    const key = this.getKey('chat_inicio', scope);
    try {
      this.memoryStore.delete(key);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
    return [];
  }

  public static saveChatMessages(scope: ScopeType, _messages: any[]): void {
    // Sessão efêmera: não persiste histórico no navegador e garante limpeza de legado
    const key = this.getKey('chat_inicio', scope);
    try {
      this.memoryStore.delete(key);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  }

  // ================= CLIENTS =================
  public static getClients(scope?: ScopeType): ClientRecord[] {
    const env = normalizeWorkspaceEnv(scope);
    const key = this.getKey('clientes', env);
    const data = this.safeGetItem(key);
    if (!data) {
      this.safeSetItem(key, JSON.stringify([]));
      return [];
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveClient(scope: ScopeType, client: ClientRecord): ClientRecord[] {
    const clients = this.getClients(scope);
    const index = clients.findIndex((c) => c.id === client.id);
    if (index >= 0) {
      clients[index] = client;
    } else {
      clients.unshift(client);
    }
    this.safeSetItem(this.getKey('clientes', scope), JSON.stringify(clients));
    return clients;
  }

  public static deleteClient(scope: ScopeType, clientId: string): ClientRecord[] {
    const clients = this.getClients(scope).filter((c) => c.id !== clientId);
    this.safeSetItem(this.getKey('clientes', scope), JSON.stringify(clients));
    return clients;
  }

  // ================= ADS / ANÚNCIOS =================
  public static getAds(scope?: ScopeType): AdItem[] {
    const env = normalizeWorkspaceEnv(scope);
    const key = this.getKey('anuncios', env);
    const data = this.safeGetItem(key);
    if (!data) {
      this.safeSetItem(key, JSON.stringify([]));
      return [];
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveAd(scope: ScopeType, ad: AdItem): AdItem[] {
    const ads = this.getAds(scope);
    const index = ads.findIndex((a) => a.id === ad.id);
    if (index >= 0) {
      ads[index] = ad;
    } else {
      ads.unshift(ad);
    }
    try {
      this.safeSetItem(this.getKey('anuncios', scope), JSON.stringify(ads));
    } catch (e: any) {
      if (this.isQuotaExceededError(e) || e?.message?.includes('armazenamento')) {
        console.warn('Storage quota exceeded, storing with fallback lightweight items', e);
        try {
          const lightweight = ads.map((item, idx) =>
            idx === 0 ? item : { ...item, imageUrl: undefined }
          );
          this.safeSetItem(this.getKey('anuncios', scope), JSON.stringify(lightweight));
          return lightweight;
        } catch (err: any) {
          console.error('Failed to store in localStorage:', err);
          throw new Error(
            'Atenção: O espaço de armazenamento do seu navegador está cheio. Exporte um backup dos seus dados em "Configurações" ou remova anúncios antigos para liberar espaço.'
          );
        }
      }
      throw e;
    }
    return ads;
  }

  public static deleteAd(scope: ScopeType, adId: string): AdItem[] {
    const ads = this.getAds(scope).filter((a) => a.id !== adId);
    this.safeSetItem(this.getKey('anuncios', scope), JSON.stringify(ads));
    return ads;
  }

  // ================= METAS & OBJETIVOS =================
  public static getMetas(scope?: ScopeType): MetasData {
    const env = normalizeWorkspaceEnv(scope);
    const key = this.getKey('metas', env);
    const data = this.safeGetItem(key);
    if (!data) {
      // Empresa starts 100% clean with 0% progress
      const initial: MetasData =
        env === 'empresa'
          ? {
              goalTitle: 'Meta Corporativa da Empresa',
              metaTotal: 100,
              realizadoTotal: 0,
              deadline: '31/12/2026',
              cycleName: 'Ciclo Q4 2026',
              distribution: [
                {
                  label: 'Projetos e Contratos Corporativos',
                  value: 40,
                  percentage: 40,
                  color: '#3D5A73',
                  description: 'Entregas validadas de projetos corporativos.',
                },
                {
                  label: 'Prospecções e Vendas Concluídas',
                  value: 30,
                  percentage: 30,
                  color: '#4A6D8C',
                  description: 'Novas contas ativadas no período.',
                },
                {
                  label: 'Operações e Logística',
                  value: 30,
                  percentage: 30,
                  color: '#10B981',
                  description: 'Suporte, entregas e operações diárias.',
                },
              ],
            }
          : DEFAULT_METAS;
      this.safeSetItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_METAS;
    }
  }

  public static saveMetas(scope: ScopeType, metas: MetasData): MetasData {
    this.safeSetItem(this.getKey('metas', scope), JSON.stringify(metas));
    return metas;
  }

  public static updateProgress(
    scope: ScopeType,
    newProgressPercent: number,
    goalTitle?: string,
    cycleName?: string,
    deadline?: string
  ): MetasData {
    const current = this.getMetas(scope);
    const clamped = Math.max(0, Math.min(100, Math.round(newProgressPercent)));
    const updated: MetasData = {
      ...current,
      realizadoTotal: clamped,
      metaTotal: 100,
      goalTitle: goalTitle || current.goalTitle || 'Meta Geral de Atividades',
      cycleName: cycleName || current.cycleName,
      deadline: deadline || current.deadline,
    };
    return this.saveMetas(scope, updated);
  }

  public static resetProgress(scope: ScopeType): MetasData {
    const current = this.getMetas(scope);
    const updated: MetasData = {
      ...current,
      realizadoTotal: 0,
    };
    return this.saveMetas(scope, updated);
  }

  public static addRealizedRevenue(
    scope: ScopeType,
    amount: number,
    categoryName = 'Projetos e Atendimentos Concluídos'
  ): MetasData {
    const current = this.getMetas(scope);
    const newRealizado = Math.min(100, current.realizadoTotal + amount);

    const dist = [...current.distribution];
    const catIndex = dist.findIndex((d) => d.label === categoryName);
    if (catIndex >= 0) {
      dist[catIndex].value += amount;
    } else if (dist.length > 0) {
      dist[0].value += amount;
    }

    const totalDist = dist.reduce((acc, d) => acc + d.value, 0);
    dist.forEach((d) => {
      d.percentage = Math.round((d.value / (totalDist || 1)) * 100);
    });

    const updated: MetasData = {
      ...current,
      realizadoTotal: Math.round(newRealizado),
      distribution: dist,
    };

    return this.saveMetas(scope, updated);
  }

  // ================= BIBLIOTECA / DOCUMENTS =================
  public static getDocuments(scope?: ScopeType): LibraryDocument[] {
    const env = normalizeWorkspaceEnv(scope);
    const key = this.getKey('biblioteca', env);
    const data = this.safeGetItem(key);
    if (!data) {
      this.safeSetItem(key, JSON.stringify([]));
      return [];
    }
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || (parsed.length > 0 && !parsed[0].category)) {
        this.safeSetItem(key, JSON.stringify([]));
        return [];
      }
      const cleaned = parsed.filter(
        (d: any) => !LEGACY_DEMO_DOC_IDS.has(d?.id) && !LEGACY_DEMO_DOC_NAMES.has(d?.fileName)
      );
      if (cleaned.length !== parsed.length) {
        this.safeSetItem(key, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  }

  public static addDocument(scope: ScopeType, doc: LibraryDocument): LibraryDocument[] {
    const docs = this.getDocuments(scope);
    docs.unshift(doc);
    const key = this.getKey('biblioteca', scope);
    this.memoryStore.set(key, JSON.stringify(docs));
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(docs));
      } catch (err) {
        console.warn('[OPENsketch Storage] Limite do localStorage atingido; mantendo mídia em memória nesta sessão.', err);
        try {
          const safeDoc = {
            ...doc,
            contentDataUrl: undefined,
            description: `${doc.description ? doc.description + ' • ' : ''}(Arquivo mantido apenas nesta sessão por limite do armazenamento local)`,
          };
          const safeDocs = [safeDoc, ...docs.slice(1)];
          localStorage.setItem(key, JSON.stringify(safeDocs));
        } catch {
          // Mantém íntegro em memoryStore sem corromper o registro
        }
      }
    }
    return docs;
  }

  public static updateDocument(
    scope: ScopeType,
    docId: string,
    updates: Partial<LibraryDocument>
  ): LibraryDocument[] {
    const docs = this.getDocuments(scope);
    const index = docs.findIndex((d) => d.id === docId);
    if (index >= 0) {
      docs[index] = { ...docs[index], ...updates };
      this.safeSetItem(this.getKey('biblioteca', scope), JSON.stringify(docs));
    }
    return docs;
  }

  public static deleteDocument(scope: ScopeType, docId: string): LibraryDocument[] {
    const docs = this.getDocuments(scope).filter((d) => d.id !== docId);
    this.safeSetItem(this.getKey('biblioteca', scope), JSON.stringify(docs));
    return docs;
  }

  // ================= B2B LEADS & PROSPECÇÃO (CORPORATE ONLY) =================
  public static getLeads(): B2BLead[] {
    const key = 'opensketch_empresa_prospeccao';
    const legacyKey = this.getKey('leads', 'CORPORATE');
    const data = this.safeGetItem(key) || this.safeGetItem(legacyKey);
    if (!data) {
      this.safeSetItem(key, JSON.stringify(DEFAULT_LEADS));
      this.safeSetItem(legacyKey, JSON.stringify(DEFAULT_LEADS));
      return DEFAULT_LEADS;
    }
    try {
      const parsed = JSON.parse(data);
      if (!this.safeGetItem(key)) {
        this.safeSetItem(key, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return DEFAULT_LEADS;
    }
  }

  public static saveLead(lead: B2BLead): B2BLead[] {
    const leads = this.getLeads();
    const index = leads.findIndex((l) => l.id === lead.id);
    if (index >= 0) {
      leads[index] = lead;
    } else {
      leads.unshift(lead);
    }
    this.safeSetItem('opensketch_empresa_prospeccao', JSON.stringify(leads));
    this.safeSetItem(this.getKey('leads', 'CORPORATE'), JSON.stringify(leads));
    return leads;
  }

  public static updateLeadStatus(
    leadId: string,
    newStatus: B2BLead['status'],
    note?: string
  ): B2BLead[] {
    const leads = this.getLeads();
    const index = leads.findIndex((l) => l.id === leadId);
    if (index >= 0) {
      leads[index].status = newStatus;
      leads[index].lastInteraction = new Date().toLocaleString('pt-BR');
      if (note) {
        leads[index].notes = leads[index].notes || [];
        leads[index].notes!.unshift(note);
      }
      this.safeSetItem('opensketch_empresa_prospeccao', JSON.stringify(leads));
      this.safeSetItem(this.getKey('leads', 'CORPORATE'), JSON.stringify(leads));
    }
    return leads;
  }

  public static convertLeadToClient(leadId: string): { leads: B2BLead[]; newClient: ClientRecord } {
    const leads = this.getLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('Lead não encontrado.');

    lead.status = 'CONVERTIDO';
    lead.lastInteraction = new Date().toLocaleString('pt-BR');
    lead.notes = lead.notes || [];
    lead.notes.unshift('Lead convertido em Cliente Ativo na Carteira Corporativa.');
    this.safeSetItem('opensketch_empresa_prospeccao', JSON.stringify(leads));
    this.safeSetItem(this.getKey('leads', 'CORPORATE'), JSON.stringify(leads));

    const newClient: ClientRecord = {
      id: `CLI-CONV-${Date.now().toString().slice(-4)}`,
      name: lead.companyName,
      documentTaxId: lead.cnpj,
      email: lead.contactEmail || `financeiro@${lead.companyName.toLowerCase().replace(/[^a-z]/g, '')}.com.br`,
      totalInvoiced: 0.0,
      invoicesCount: 0,
      status: 'ATIVO',
      lastInvoiceDate: new Date().toISOString().split('T')[0],
      phone: lead.contactPhone || '(11) 3000-0000',
      segment: lead.segment,
    };

    this.saveClient('CORPORATE', newClient);
    return { leads, newClient };
  }

  public static runAiScan(): B2BLead[] {
    const leads = this.getLeads();
    const newSamples: B2BLead[] = [
      {
        id: `LEAD-SCAN-${Date.now().toString().slice(-3)}`,
        companyName: 'AgroSul Cooperativa & Grãos',
        cnpj: '18.902.411/0001-30',
        segment: 'Agronegócio & Grãos',
        fitScore: 94,
        estimatedVolume: 'R$ 210.000 / mês',
        region: 'Londrina - PR',
        status: 'NOVO',
        contactPerson: 'Geraldo Antunes',
        contactEmail: 'compras@agrosulcoop.com.br',
        contactPhone: '(43) 3344-5500',
        notes: ['Mapeamento preditivo: Alto volume de notas de transporte agrícola detectado.'],
        lastInteraction: new Date().toLocaleString('pt-BR'),
      },
      {
        id: `LEAD-SCAN-${(Date.now() + 1).toString().slice(-3)}`,
        companyName: 'NextGen Soluções em Nuvem Ltda',
        cnpj: '44.192.019/0001-08',
        segment: 'Tecnologia / Software',
        fitScore: 92,
        estimatedVolume: 'R$ 95.000 / mês',
        region: 'Florianópolis - SC',
        status: 'NOVO',
        contactPerson: 'Larissa Becker',
        contactEmail: 'larissa@nextgencloud.com.br',
        contactPhone: '(48) 99812-4433',
        notes: ['Empresa de SaaS com necessidade de conciliação de pagamentos recorrentes.'],
        lastInteraction: new Date().toLocaleString('pt-BR'),
      },
    ];

    const updated = [...newSamples, ...leads];
    this.safeSetItem(this.getKey('leads', 'CORPORATE'), JSON.stringify(updated));
    return updated;
  }

  // ================= DATA EXPORT (REAL CSV / JSON DOWNLOADS) =================
  public static exportAllData(scope: ScopeType, format: 'json' | 'csv' | 'html'): void {
    const env = normalizeWorkspaceEnv(scope);
    const clients = this.getClients(scope);
    const documents = this.getDocuments(scope);
    const metas = this.getMetas(scope);
    const ads = this.getAds(scope);
    const leads = env === 'empresa' ? this.getLeads() : [];
    const profile = this.getProfile(scope);

    const exportPayload = {
      platform: 'opensketch (ESCORP IDS)',
      environment: env,
      profile,
      timestamp: new Date().toISOString(),
      summary: {
        totalClients: clients.length,
        totalDocuments: documents.length,
        totalAds: ads.length,
        metaTotal: metas.metaTotal,
        realizadoTotal: metas.realizadoTotal,
      },
      clients,
      documents,
      metas,
      ads,
      leads,
    };

    if (format === 'json') {
      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      this.triggerDownload(blob, `opensketch-${env}-export-${Date.now()}.json`);
    } else {
      // CSV format of clients and archives
      let csvContent = 'tipo,id,nome_documento,cnpj_tax_id,valor,status,data\n';
      clients.forEach((c) => {
        csvContent += `CLIENTE,${c.id},"${c.name}",${c.documentTaxId},${c.totalInvoiced},${c.status},${c.lastInvoiceDate}\n`;
      });
      documents.forEach((d) => {
        csvContent += `ARQUIVO,${d.id},"${d.fileName}",${d.category},${d.mimeType},${d.fileSizeBytes},${d.uploadedAt}\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.triggerDownload(blob, `opensketch-${env}-relatorio-${Date.now()}.csv`);
    }
  }

  private static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
