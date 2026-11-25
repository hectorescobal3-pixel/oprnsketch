import React, { useState, useEffect, useRef } from 'react';
import { AppStorage, B2BLead } from '../services/app-storage';
import { AiConversationalService } from '../services/ai-conversational-service';
import { PlacesProspectingService, PlaceOpportunity } from '../services/places-prospecting-service';
import { getMunicipalitiesByState, filterMunicipalities } from '../services/ibge-municipios-service';
import { InteractiveFlatWorldMap } from '../components/InteractiveFlatWorldMap';
import { getCurrentFirebaseIdToken } from '../services/firebase-client';

const PROFESSIONS_LIST = [
  'Todas as Profissões',
  'Corretor de Imóveis',
  'Clínica Odontológica',
  'Tecnologia & Software',
  'Comércio & Varejo',
  'Consultoria & Gestão',
  'Engenharia & Construção',
  'Saúde & Clínicas',
  'Indústria & Fabricação',
  'Advocacia & Jurídico',
  'Alimentação & Gastronomia',
];

const STATES_LIST = [
  { uf: 'TODOS', name: 'Todos os Estados (Brasil)' },
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

interface TargetAudiencePill {
  label: string;
  segmentCategory: string;
}

function getIdealTargetAudienceForProfile(profession: string, specialty: string): TargetAudiencePill[] {
  const norm = `${profession} ${specialty}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('imove') || norm.includes('imobil') || norm.includes('corretor')) {
    return [
      { label: 'Médicos & Clínicas', segmentCategory: 'Saúde & Clínicas' },
      { label: 'Advogados & Escritórios', segmentCategory: 'Advocacia & Jurídico' },
      { label: 'Clínicas Odontológicas', segmentCategory: 'Clínica Odontológica' },
      { label: 'Empresários & Consultorias', segmentCategory: 'Consultoria & Gestão' },
      { label: 'Executivos de Tech', segmentCategory: 'Tecnologia & Software' },
    ];
  }
  if (norm.includes('marketing') || norm.includes('trafego') || norm.includes('design') || norm.includes('fotograf') || norm.includes('audiovisual')) {
    return [
      { label: 'Clínicas Odontológicas', segmentCategory: 'Clínica Odontológica' },
      { label: 'Saúde & Clínicas', segmentCategory: 'Saúde & Clínicas' },
      { label: 'Imobiliárias & Corretores', segmentCategory: 'Corretor de Imóveis' },
      { label: 'Restaurantes & Delivery', segmentCategory: 'Alimentação & Gastronomia' },
      { label: 'Comércio & E-commerce', segmentCategory: 'Comércio & Varejo' },
    ];
  }
  if (norm.includes('seguro') || norm.includes('consorcio')) {
    return [
      { label: 'Construtoras & Engenharia', segmentCategory: 'Engenharia & Construção' },
      { label: 'Indústrias & Frotas', segmentCategory: 'Indústria & Fabricação' },
      { label: 'Clínicas & Médicos', segmentCategory: 'Saúde & Clínicas' },
      { label: 'Comércio & Varejo', segmentCategory: 'Comércio & Varejo' },
      { label: 'Empresas & Consultorias', segmentCategory: 'Consultoria & Gestão' },
    ];
  }
  if (norm.includes('contabil') || norm.includes('direito') || norm.includes('advocacia') || norm.includes('consultor')) {
    return [
      { label: 'Comércio & Varejo', segmentCategory: 'Comércio & Varejo' },
      { label: 'Empresas de Software', segmentCategory: 'Tecnologia & Software' },
      { label: 'Indústria & Fabricação', segmentCategory: 'Indústria & Fabricação' },
      { label: 'Engenharia & Obras', segmentCategory: 'Engenharia & Construção' },
      { label: 'Clínicas Odontológicas', segmentCategory: 'Clínica Odontológica' },
    ];
  }
  if (norm.includes('tecnolog') || norm.includes('software')) {
    return [
      { label: 'Comércio & Varejo', segmentCategory: 'Comércio & Varejo' },
      { label: 'Consultoria & Gestão', segmentCategory: 'Consultoria & Gestão' },
      { label: 'Saúde & Clínicas', segmentCategory: 'Saúde & Clínicas' },
      { label: 'Indústria & Fabricação', segmentCategory: 'Indústria & Fabricação' },
      { label: 'Advocacia & Jurídico', segmentCategory: 'Advocacia & Jurídico' },
    ];
  }
  if (norm.includes('engenharia') || norm.includes('arquitet')) {
    return [
      { label: 'Imobiliárias & Lançamentos', segmentCategory: 'Corretor de Imóveis' },
      { label: 'Clínicas & Consultórios', segmentCategory: 'Saúde & Clínicas' },
      { label: 'Restaurantes & Lojas', segmentCategory: 'Alimentação & Gastronomia' },
      { label: 'Indústrias & Galpões', segmentCategory: 'Indústria & Fabricação' },
      { label: 'Comércio & Varejo', segmentCategory: 'Comércio & Varejo' },
    ];
  }

  return [
    { label: 'Comércio & Varejo', segmentCategory: 'Comércio & Varejo' },
    { label: 'Consultoria & Gestão', segmentCategory: 'Consultoria & Gestão' },
    { label: 'Tecnologia & Software', segmentCategory: 'Tecnologia & Software' },
    { label: 'Saúde & Clínicas', segmentCategory: 'Saúde & Clínicas' },
    { label: 'Alimentação & Gastronomia', segmentCategory: 'Alimentação & Gastronomia' },
  ];
}

export const ProspeccaoView: React.FC = () => {
  const activeProfile = (() => {
    try {
      const rawCtx = localStorage.getItem('opensketch_active_context');
      const parsedCtx = rawCtx ? JSON.parse(rawCtx) : null;
      const ctxType: 'PERSONAL' | 'CORPORATE' = parsedCtx?.type === 'CORPORATE' ? 'CORPORATE' : 'PERSONAL';
      return AppStorage.getProfile(ctxType);
    } catch {
      return AppStorage.getProfile('PERSONAL');
    }
  })();
  const userProfession = (activeProfile.profession || '').trim();
  const userSpecialty = (activeProfile.segment || '').trim();
  const idealTargetPills = getIdealTargetAudienceForProfile(userProfession, userSpecialty);
  // 1. Filtros de Busca Geográfica e Profissional
  const [selectedProfession, setSelectedProfession] = useState<string>('Todas as Profissões');
  const [isProfDropdownOpen, setIsProfDropdownOpen] = useState(false);

  const [selectedState, setSelectedState] = useState<string>('TODOS');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [cityOrSearchInput, setCityOrSearchInput] = useState<string>('');
  const [stateMunicipalities, setStateMunicipalities] = useState<string[]>([]);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isSearchingB2B, setIsSearchingB2B] = useState(false);

  // 2. Resultados da Busca (Mapa + Base Dinâmica)
  const [opportunities, setOpportunities] = useState<PlaceOpportunity[]>([]);
  const [searchedLeads, setSearchedLeads] = useState<B2BLead[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<PlaceOpportunity | null>(null);

  // 3. Base Persistida de Leads da Empresa
  const [savedLeads, setSavedLeads] = useState<B2BLead[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // 4. Barra de Chat de IA de Frases de Prospecção
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingPhrases, setIsGeneratingPhrases] = useState(false);
  const [generatedPhrases, setGeneratedPhrases] = useState<
    Array<{ id: string; title: string; channel: string; text: string }>
  >([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const profDropdownRef = useRef<HTMLDivElement>(null);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Carrega base salva ao iniciar e sincroniza com a profissão ativa do perfil da empresa
  useEffect(() => {
    setSavedLeads(AppStorage.getLeads());
    const corpProfile = AppStorage.getProfile('empresa');
    if (corpProfile && corpProfile.profession) {
      const match = PROFESSIONS_LIST.find((p) =>
        p.toLowerCase().includes(corpProfile.profession.toLowerCase()) ||
        corpProfile.profession.toLowerCase().includes(p.toLowerCase())
      );
      if (match) {
        setSelectedProfession(match);
      } else {
        setSelectedProfession(corpProfile.profession);
      }
    }
  }, []);

  // Carrega todos os municípios oficiais do estado selecionado (IBGE + cache + fallback offline)
  useEffect(() => {
    let cancelled = false;
    if (selectedState === 'TODOS') {
      setStateMunicipalities([]);
      return;
    }
    getMunicipalitiesByState(selectedState).then((list) => {
      if (!cancelled) {
        setStateMunicipalities(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedState]);

  // Cache em memória/localStorage por profissao_uf_cidade (0ms em consultas repetidas)
  const b2bMemCacheRef = useRef<Map<string, { ts: number; opps: PlaceOpportunity[]; leads: B2BLead[] }>>(new Map());

  // Executa busca ativa no backend protegido (/api/ai/prospection) e atualiza mapa + tabela + 3 cards de abordagem
  const handleExecuteSearch = async (overrideCity?: string, overrideState?: string) => {
    const targetCity = (overrideCity !== undefined ? overrideCity : cityOrSearchInput).trim();
    const targetState = overrideState !== undefined ? overrideState : selectedState;
    const cacheKey = `opensketch_b2b_${selectedProfession.toLowerCase()}_${targetState.toLowerCase()}_${targetCity.toLowerCase()}`;

    setIsCityDropdownOpen(false);

    // 1. Retorno instantâneo (0ms) se já estiver em cache recente (10 min)
    const memHit = b2bMemCacheRef.current.get(cacheKey);
    if (memHit && Date.now() - memHit.ts < 10 * 60 * 1000) {
      setOpportunities(memHit.opps);
      setSearchedLeads(memHit.leads);
      handleGeneratePhrases(undefined, undefined, targetCity, targetState);
      return;
    }
    try {
      const rawCached = localStorage.getItem(cacheKey);
      if (rawCached) {
        const parsed = JSON.parse(rawCached);
        if (parsed && Array.isArray(parsed.opps) && Date.now() - Number(parsed.ts || 0) < 10 * 60 * 1000) {
          b2bMemCacheRef.current.set(cacheKey, parsed);
          setOpportunities(parsed.opps);
          setSearchedLeads(parsed.leads || []);
          handleGeneratePhrases(undefined, undefined, targetCity, targetState);
          return;
        }
      }
    } catch {
      // ignore cache read errors
    }

    setIsSearchingB2B(true);
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 9000);

    try {
      const apiBase = ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '')
        .trim()
        .replace(/\/+$/, '');
      const idToken = await getCurrentFirebaseIdToken();
      const res = await fetch(`${apiBase}/api/ai/prospection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          profession: selectedProfession,
          state: targetState,
          city: targetCity,
        }),
      });
      clearTimeout(abortTimer);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data?.opportunities)) {
          const opps: PlaceOpportunity[] = data.opportunities.map((raw: any) => {
            const lat = typeof raw.coordinates?.lat === 'number' ? raw.coordinates.lat : (typeof raw.latitude === 'number' ? raw.latitude : -14.235);
            const lng = typeof raw.coordinates?.lng === 'number' ? raw.coordinates.lng : (typeof raw.longitude === 'number' ? raw.longitude : -51.925);
            return {
              id: raw.id,
              name: raw.name,
              cnpj: raw.cnpj || '00.000.000/0001-00',
              profession: raw.profession || selectedProfession,
              area: raw.area || raw.category || 'Geral',
              state: raw.state || targetState,
              city: raw.city || targetCity || 'Brasil',
              formattedAddress: raw.formattedAddress || raw.address || `${raw.city || targetCity} - ${raw.state || targetState}`,
              coordinates: {
                lat,
                lng,
                x: Number(((lng + 180) * (100 / 360)).toFixed(2)),
                y: Number(((90 - lat) * (100 / 180)).toFixed(2)),
              },
              rating: typeof raw.rating === 'number' ? raw.rating : 4.8,
              userRatingsTotal: typeof raw.userRatingsTotal === 'number' ? raw.userRatingsTotal : 30,
              phoneNumber: raw.phoneNumber || raw.phone || 'Sem telefone público',
              website: raw.website || '',
              email: raw.email || '',
              fitScore: typeof raw.fitScore === 'number' ? raw.fitScore : 92,
              estimatedVolume: raw.estimatedVolume || 'R$ 30.000 / mês',
              notes: raw.notes || 'Oportunidade B2B mapeada.',
            };
          });
          const mappedLeads: B2BLead[] = opps.map((opp, idx) => ({
            id: opp.id,
            companyName: opp.name,
            cnpj: opp.cnpj,
            segment: opp.profession,
            fitScore: opp.fitScore,
            estimatedVolume: opp.estimatedVolume,
            region: `${opp.city} - ${opp.state}`,
            status: 'NOVO',
            contactPerson: data.opportunities[idx]?.contactPerson || 'Responsável Comercial',
            contactPhone: opp.phoneNumber,
            contactEmail: opp.email,
            notes: [opp.notes],
            lastInteraction: new Date().toLocaleDateString('pt-BR'),
          }));
          setOpportunities(opps);
          setSearchedLeads(mappedLeads);
          if (opps.length > 0) {
            const cachePayload = { ts: Date.now(), opps, leads: mappedLeads };
            b2bMemCacheRef.current.set(cacheKey, cachePayload);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
            } catch {}
          }
          handleGeneratePhrases(undefined, undefined, targetCity, targetState);
          return;
        }
      }
    } catch {
      clearTimeout(abortTimer);
    } finally {
      setIsSearchingB2B(false);
    }

    const fallbackResults = await PlacesProspectingService.searchPlaces({
      profession: selectedProfession,
      state: targetState,
      city: targetCity,
      query: targetCity,
    });
    setOpportunities(fallbackResults);
    if (targetCity || targetState !== 'TODOS') {
      setSearchedLeads(
        fallbackResults.map((opp) => ({
          id: opp.id,
          companyName: opp.name,
          cnpj: opp.cnpj,
          segment: opp.profession,
          fitScore: opp.fitScore,
          estimatedVolume: opp.estimatedVolume,
          region: `${opp.city} - ${opp.state}`,
          status: 'NOVO',
          contactPerson: 'Responsável Comercial',
          contactPhone: opp.phoneNumber,
          contactEmail: opp.email,
          notes: [opp.notes],
          lastInteraction: new Date().toLocaleDateString('pt-BR'),
        }))
      );
      handleGeneratePhrases(undefined, undefined, targetCity, targetState);
    }
  };

  // Atualiza mapa automaticamente quando mudar estado ou limpar busca
  useEffect(() => {
    if (selectedState === 'TODOS' && !cityOrSearchInput.trim()) {
      setSearchedLeads([]);
      setOpportunities([]);
      setGeneratedPhrases([]);
    } else if (selectedState !== 'TODOS' && !cityOrSearchInput.trim()) {
      handleExecuteSearch('', selectedState);
    }
  }, [selectedProfession, selectedState]);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profDropdownRef.current && !profDropdownRef.current.contains(e.target as Node)) {
        setIsProfDropdownOpen(false);
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setIsStateDropdownOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Salvar oportunidade na base da empresa
  const handleSaveOpportunity = (opp: PlaceOpportunity) => {
    const newLead: B2BLead = {
      id: opp.id,
      companyName: opp.name,
      cnpj: opp.cnpj,
      segment: opp.profession,
      fitScore: opp.fitScore,
      estimatedVolume: opp.estimatedVolume,
      region: `${opp.city} - ${opp.state}`,
      status: 'NOVO',
      contactPerson: 'Responsável Comercial',
      contactPhone: opp.phoneNumber,
      contactEmail: opp.email,
      notes: [opp.notes, `Mapeado via busca geográfica em ${opp.city} - ${opp.state}.`],
      lastInteraction: new Date().toLocaleDateString('pt-BR'),
    };

    const updated = AppStorage.saveLead(newLead);
    setSavedLeads(updated);
    showToast(`✓ "${opp.name}" salva na base da sua empresa!`);
  };

  // Converter lead em cliente oficial (garante persistência prévia se vier de busca dinâmica)
  const handleConvertLead = (leadOrId: string | B2BLead) => {
    try {
      const leadId = typeof leadOrId === 'string' ? leadOrId : leadOrId.id;
      const existing = AppStorage.getLeads();
      if (!existing.some((l) => l.id === leadId)) {
        if (typeof leadOrId !== 'string') {
          AppStorage.saveLead(leadOrId);
        } else {
          const opp = opportunities.find((o) => o.id === leadId);
          if (opp) {
            AppStorage.saveLead({
              id: opp.id,
              companyName: opp.name,
              cnpj: opp.cnpj,
              segment: opp.profession,
              fitScore: opp.fitScore,
              estimatedVolume: opp.estimatedVolume,
              region: `${opp.city} - ${opp.state}`,
              status: 'NOVO',
              contactPerson: 'Responsável Comercial',
              contactPhone: opp.phoneNumber,
              contactEmail: opp.email,
              notes: [opp.notes],
              lastInteraction: new Date().toLocaleDateString('pt-BR'),
            });
          }
        }
      }
      const result = AppStorage.convertLeadToClient(leadId);
      setSavedLeads([...result.leads]);
      showToast(`🎉 Parabéns! "${result.newClient.name}" agora é um Cliente na Carteira!`);
      setSelectedOpp(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao converter lead.');
    }
  };

  const hasActiveSearch = Boolean(cityOrSearchInput.trim() || selectedState !== 'TODOS');

  const displayedLeads: B2BLead[] = !hasActiveSearch
    ? []
    : searchedLeads.length > 0
    ? searchedLeads.map((lead) => {
        const savedMatch = savedLeads.find((s) => s.id === lead.id);
        return savedMatch || lead;
      })
    : opportunities.map((opp) => {
        const savedMatch = savedLeads.find((s) => s.id === opp.id);
        if (savedMatch) return savedMatch;
        return {
          id: opp.id,
          companyName: opp.name,
          cnpj: opp.cnpj,
          segment: opp.profession,
          fitScore: opp.fitScore,
          estimatedVolume: opp.estimatedVolume,
          region: `${opp.city} - ${opp.state}`,
          status: 'NOVO',
          contactPerson: 'Responsável Comercial',
          contactPhone: opp.phoneNumber,
          contactEmail: opp.email,
          notes: [opp.notes],
          lastInteraction: new Date().toLocaleDateString('pt-BR'),
        };
      });

  // Gerar frases de prospecção com IA
  const handleGeneratePhrases = async (
    customText?: string,
    explicitCompany?: string,
    overrideCity?: string,
    overrideState?: string
  ) => {
    setIsGeneratingPhrases(true);
    const textToUse = customText !== undefined ? customText : aiPrompt;
    const isCustomTextNotEmpty = textToUse.trim().length > 0;

    // Se o usuário digitou um prompt na barra de comando, respeita fielmente o pedido dele
    // Apenas força o lead específico se o clique veio do botão dedicado ou se o prompt estiver vazio
    const companyToTarget = explicitCompany || (!isCustomTextNotEmpty && selectedOpp ? selectedOpp.name : undefined);

    try {
      const phrases = await AiConversationalService.generateProspectingPhrases({
        profession: selectedProfession,
        area: selectedProfession === 'Todas as Profissões' ? 'Geral' : selectedProfession,
        state: overrideState !== undefined ? overrideState : selectedState,
        city: overrideCity !== undefined ? overrideCity : cityOrSearchInput || (companyToTarget && selectedOpp ? selectedOpp.city : ''),
        customPrompt: isCustomTextNotEmpty ? textToUse.trim() : undefined,
        targetCompany: companyToTarget,
      });
      setGeneratedPhrases(phrases);
    } catch (err) {
      console.error('Erro ao gerar frases:', err);
    } finally {
      setIsGeneratingPhrases(false);
    }
  };

  // Copiar frase para o clipboard
  const handleCopyPhrase = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('✓ Frase copiada para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div
      className="responsive-view-container"
      style={{
        flex: 1,
        overflowY: 'auto',
        boxSizing: 'border-box',
        backgroundColor: '#121417',
        color: '#D9DEE4',
      }}
    >
      {/* Toast de Notificação */}
      {feedbackToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1C1E22',
            border: '1px solid #10B981',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>⚡</span>
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header do Módulo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
          borderBottom: '1px solid #272C34',
          paddingBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 600, color: '#D9DEE4' }}>
              Prospecção & Mercado B2B
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(61, 90, 115, 0.3)',
                color: '#93C5FD',
                border: '1px solid #3D5A73',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Minha Empresa
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '15px', color: '#8A96A3' }}>
            Encontre novas oportunidades por profissão e localidade, explore o mapa interativo e gere frases de abordagem com IA.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '14px', color: '#8A96A3' }}>
            Oportunidades Salvas: <strong style={{ color: '#FFFFFF' }}>{savedLeads.length}</strong>
          </span>
        </div>
      </div>

      {/* ================= 1. DUAS BARRAS DE BUSCA MINIMALISTAS (ESTILO GOOGLE PLACES) ================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Barra 1: Segmentação Profissional */}
        <div ref={profDropdownRef} style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8A96A3', marginBottom: '8px' }}>
            1. PÚBLICO-ALVO / PROFISSÃO
          </label>
          <div
            onClick={() => setIsProfDropdownOpen((prev) => !prev)}
            style={{
              padding: '14px 18px',
              backgroundColor: '#1C1E22',
              border: isProfDropdownOpen ? '2px solid #3D5A73' : '1px solid #2C4257',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>💼</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                {selectedProfession}
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                color: '#8A96A3',
                transform: isProfDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              ▼
            </span>
          </div>

          {/* Dropdown Flutuante em Pílula */}
          {isProfDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                backgroundColor: '#1C1E22',
                border: '1px solid #3D5A73',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                maxHeight: '260px',
                overflowY: 'auto',
                zIndex: 100,
                padding: '6px',
              }}
            >
              {(() => {
                const recommendedSet = new Set(idealTargetPills.map((p) => p.segmentCategory));
                const recommendedItems = idealTargetPills
                  .map((p) => p.segmentCategory)
                  .filter((cat, i, arr) => PROFESSIONS_LIST.includes(cat) && arr.indexOf(cat) === i);
                const otherItems = PROFESSIONS_LIST.filter(
                  (p) => p !== 'Todas as Profissões' && !recommendedSet.has(p)
                );

                const renderOption = (prof: string, isRecommended = false) => {
                  const isSelected = selectedProfession === prof;
                  return (
                    <div
                      key={`${isRecommended ? 'rec' : 'all'}-${prof}`}
                      onClick={() => {
                        setSelectedProfession(prof);
                        setIsProfDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        margin: '2px 0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 500,
                        backgroundColor: isSelected ? 'rgba(61, 90, 115, 0.4)' : 'transparent',
                        color: isSelected ? '#FFFFFF' : '#D9DEE4',
                        border: isSelected ? '1px solid #3D5A73' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#272C34';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span>{prof}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isRecommended && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#93C5FD', backgroundColor: 'rgba(61, 90, 115, 0.28)', padding: '2px 6px', borderRadius: '999px' }}>
                            Ideal
                          </span>
                        )}
                        {isSelected && <span style={{ color: '#93C5FD' }}>✓</span>}
                      </span>
                    </div>
                  );
                };

                return (
                  <>
                    {renderOption('Todas as Profissões', false)}
                    {recommendedItems.length > 0 && (
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 14px 4px' }}>
                        ✨ Recomendado para o seu perfil
                      </div>
                    )}
                    {recommendedItems.map((prof) => renderOption(prof, true))}
                    {otherItems.length > 0 && (
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 14px 4px', borderTop: '1px solid #272C34', marginTop: '4px' }}>
                        Demais categorias
                      </div>
                    )}
                    {otherItems.map((prof) => renderOption(prof, false))}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Barra 2: Segmentação Geográfica (Estado & Cidade / Busca Textual) */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Seletor Estado (UF) */}
          <div ref={stateDropdownRef} style={{ position: 'relative', width: '42%' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8A96A3', marginBottom: '8px' }}>
              2. ESTADO (UF)
            </label>
            <div
              onClick={() => setIsStateDropdownOpen((prev) => !prev)}
              style={{
                padding: '14px 18px',
                backgroundColor: '#1C1E22',
                border: isStateDropdownOpen ? '2px solid #3D5A73' : '1px solid #2C4257',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📍</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                  {selectedState}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#8A96A3',
                  transform: isStateDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                ▼
              </span>
            </div>

            {/* Dropdown Estados */}
            {isStateDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#1C1E22',
                  border: '1px solid #3D5A73',
                  borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  zIndex: 100,
                  padding: '6px',
                }}
              >
                {STATES_LIST.map((st) => {
                  const isSelected = selectedState === st.uf;
                  return (
                    <div
                      key={st.uf}
                      onClick={() => {
                        setSelectedState(st.uf);
                        setIsStateDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        margin: '2px 0',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 500,
                        backgroundColor: isSelected ? 'rgba(61, 90, 115, 0.4)' : 'transparent',
                        color: isSelected ? '#FFFFFF' : '#D9DEE4',
                        border: isSelected ? '1px solid #3D5A73' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#272C34';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {st.uf} - {st.name}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Campo Cidade / Busca Inteligente com Autocompletar IBGE (Todos os Municípios) */}
          <div ref={cityDropdownRef} style={{ flex: 1, position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#8A96A3', marginBottom: '8px' }}>
              3. CIDADE OU PESQUISA LOCAL
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  flex: 1,
                  minWidth: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#1C1E22',
                  border: '1px solid #2C4257',
                  borderRadius: '12px',
                  padding: '0 14px',
                  height: '50px',
                }}
              >
                <span style={{ color: '#8A96A3', marginRight: '10px' }}>🔍</span>
                <input
                  type="text"
                  placeholder={
                    selectedState !== 'TODOS'
                      ? `Digite o município em ${selectedState} (ex: Manicoré, Maués...)`
                      : 'Ex: São Paulo, Manicoré, Campinas, Curitiba...'
                  }
                  value={cityOrSearchInput}
                  onFocus={() => setIsCityDropdownOpen(true)}
                  onChange={(e) => {
                    setCityOrSearchInput(e.target.value);
                    setIsCityDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleExecuteSearch();
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {cityOrSearchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCityOrSearchInput('');
                      setSearchedLeads([]);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#8A96A3',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Botão Compacto de Pesquisa Ativa (34px) */}
              <button
                type="button"
                disabled={isSearchingB2B}
                onClick={() => handleExecuteSearch()}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: '#3D5A73',
                  border: 'none',
                  borderRadius: '7px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isSearchingB2B ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{isSearchingB2B ? '⏳' : '🔎'}</span>
                <span>{isSearchingB2B ? 'Buscando...' : 'Buscar Oportunidades'}</span>
              </button>
            </div>

            {/* Autocomplete Discreto de Municípios IBGE do Estado Selecionado */}
            {isCityDropdownOpen && selectedState !== 'TODOS' && stateMunicipalities.length > 0 && (
              (() => {
                const matches = filterMunicipalities(stateMunicipalities, cityOrSearchInput, 6);
                if (matches.length === 0) return null;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: '80px',
                      left: 0,
                      right: '170px',
                      backgroundColor: '#1C1E22',
                      border: '1px solid #3D5A73',
                      borderRadius: '10px',
                      boxShadow: '0 10px 28px rgba(0,0,0,0.7)',
                      zIndex: 110,
                      padding: '6px',
                    }}
                  >
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#8A96A3', padding: '4px 10px', fontWeight: 700 }}>
                      Municípios de {selectedState} (IBGE):
                    </div>
                    {matches.map((mun) => (
                      <div
                        key={mun}
                        onClick={() => {
                          setCityOrSearchInput(mun);
                          setIsCityDropdownOpen(false);
                          handleExecuteSearch(mun, selectedState);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '7px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: '#D9DEE4',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#272C34')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        📍 {mun} — {selectedState}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. MAPA INTERATIVO CLICÁVEL COM PINOS E REGIÕES ================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedOpp ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr',
          gap: '24px',
          marginBottom: '36px',
          transition: 'all 0.25s ease',
        }}
      >
        {/* Painel do Mapa */}
        <div
          style={{
            backgroundColor: '#181A1F',
            border: '1px solid #272C34',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          {/* Barra Superior do Mapa com Seletor Rápido de Estados */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>🗺️</span>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#D9DEE4' }}>
                Mapa Interativo de Oportunidades Comerciais
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                📍 {opportunities.length} oportunidade(s) encontrada(s)
              </span>
            </div>
          </div>

          {/* Atalhos Rápidos por Região / Estado Clicáveis */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '14px',
              overflowX: 'auto',
              paddingBottom: '4px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#8A96A3', marginRight: '4px', whiteSpace: 'nowrap' }}>
              Filtrar no Mapa:
            </span>
            {['TODOS', 'SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'BA', 'PE', 'CE', 'AM', 'GO', 'DF'].map((uf) => {
              const isActive = selectedState === uf;
              return (
                <button
                  key={uf}
                  type="button"
                  onClick={() => {
                    setSelectedState(uf);
                    handleExecuteSearch(cityOrSearchInput, uf);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    backgroundColor: isActive ? '#D9DEE4' : '#1C1E22',
                    border: isActive ? '1px solid #FFFFFF' : '1px solid #272C34',
                    color: isActive ? '#121417' : '#8A96A3',
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(255,255,255,0.15)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '#8A96A3';
                  }}
                >
                  {uf === 'TODOS' ? 'Brasil (Todos)' : uf}
                </button>
              );
            })}
          </div>

          {/* Mapa-Múndi Plano Interativo (Largura Total + Altura Compacta) */}
          <InteractiveFlatWorldMap
            opportunities={opportunities}
            selectedOpportunity={selectedOpp}
            onSelectOpportunity={(opp) => setSelectedOpp(opp)}
            targetState={selectedState}
            targetCity={cityOrSearchInput}
          />
        </div>

        {/* Card de Ação Rápida da Oportunidade Inspecionada */}
        {selectedOpp && (
          <div
            style={{
              backgroundColor: '#1C1E22',
              border: '1px solid #3D5A73',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#6EE7B7',
                      border: '1px solid #10B981',
                    }}
                  >
                    Fit Score: {selectedOpp.fitScore}%
                  </span>
                  <span style={{ fontSize: '12px', color: '#F59E0B' }}>
                    ★ {selectedOpp.rating} ({selectedOpp.userRatingsTotal} avaliações)
                  </span>
                </div>
                <h3 style={{ margin: '6px 0 2px 0', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
                  {selectedOpp.name}
                </h3>
                <span style={{ fontSize: '13px', color: '#8A96A3' }}>
                  {selectedOpp.city} - {selectedOpp.state} • {selectedOpp.profession}
                </span>
              </div>
              <button
                onClick={() => setSelectedOpp(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#8A96A3',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#121417',
                border: '1px solid #272C34',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '18px',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#8A96A3' }}>Endereço: </strong>
                <span style={{ color: '#D9DEE4' }}>{selectedOpp.formattedAddress}</span>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#8A96A3' }}>Telefone / WhatsApp: </strong>
                <span style={{ color: '#93C5FD' }}>{selectedOpp.phoneNumber || 'Sem telefone público'}</span>
              </div>
              {selectedOpp.website && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#8A96A3' }}>Site (OSM): </strong>
                  <a
                    href={selectedOpp.website.startsWith('http') ? selectedOpp.website : `https://${selectedOpp.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#6EE7B7', textDecoration: 'underline' }}
                  >
                    {selectedOpp.website}
                  </a>
                </div>
              )}
              {selectedOpp.email && (
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#8A96A3' }}>E-mail: </strong>
                  <span style={{ color: '#D9DEE4' }}>{selectedOpp.email}</span>
                </div>
              )}
              <div>
                <strong style={{ color: '#8A96A3' }}>Diagnóstico: </strong>
                <span style={{ color: '#CBD5E1' }}>{selectedOpp.notes}</span>
              </div>
            </div>

            {/* Ações do Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
              <button
                type="button"
                onClick={() => handleSaveOpportunity(selectedOpp)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1E252F',
                  color: '#FFFFFF',
                  border: '1px solid #3D5A73',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#27323F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1E252F';
                }}
              >
                <span>💾</span>
                <span>Salvar na Base da Empresa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const prompt = `Quero uma abordagem comercial dedicada para a ${selectedOpp.name} em ${selectedOpp.city}`;
                  setAiPrompt(prompt);
                  handleGeneratePhrases(prompt, selectedOpp.name);
                  showToast(`Gerando abordagem dedicada para ${selectedOpp.name}!`);
                }}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#1E252F',
                  color: '#93C5FD',
                  border: '1px solid #3D5A73',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>✨</span>
                <span>Gerar Frase para Esta Empresa</span>
              </button>

              <button
                type="button"
                onClick={() => handleConvertLead(selectedOpp.id)}
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: 'transparent',
                  color: '#6EE7B7',
                  border: '1px solid #10B981',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🤝</span>
                <span>Converter em Cliente Agora</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= 3. BARRA DE CHAT DE IA EXCLUSIVA PARA FRASES DE PROSPECÇÃO ================= */}
      <div
        style={{
          backgroundColor: '#1C1E22',
          border: '1px solid #272C34',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '36px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>✨</span>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#D9DEE4' }}>
            Gerador de Frases e Abordagens com IA
          </h2>
        </div>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#8A96A3' }}>
          Gere mensagens prontas de alto impacto, profissionais e acolhedoras para abordar prospects no WhatsApp ou e-mail, considerando os filtros ativos.
        </p>

        {/* Input Bar do Chat de Prospecção */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#121417',
            border: '1px solid #3D5A73',
            borderRadius: '12px',
            padding: '8px 16px',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '18px', color: '#8A96A3' }}>💬</span>
          <input
            type="text"
            placeholder="Ex: Abordagem que chame atenção de um restaurante... ou redução de custos"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGeneratePhrases();
            }}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '15px',
              outline: 'none',
            }}
          />

          {/* Botão Escurecido com Alto Contraste Nítido 50+ */}
          <button
            type="button"
            disabled={isGeneratingPhrases}
            onClick={() => handleGeneratePhrases()}
            style={{
              padding: '12px 24px',
              backgroundColor: isGeneratingPhrases ? '#11151A' : '#1B222C',
              color: '#FFFFFF',
              border: '1px solid #4B6B8A',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isGeneratingPhrases ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
            onMouseEnter={(e) => {
              if (!isGeneratingPhrases) e.currentTarget.style.backgroundColor = '#283545';
            }}
            onMouseLeave={(e) => {
              if (!isGeneratingPhrases) e.currentTarget.style.backgroundColor = '#1B222C';
            }}
          >
            <span>{isGeneratingPhrases ? '⏳' : '✨'}</span>
            <span>{isGeneratingPhrases ? 'Gerando abordagens...' : 'Gerar Novas Frases'}</span>
          </button>
        </div>

        {/* Lista de Frases Geradas Prontas com Botão Copiar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            position: 'relative',
            opacity: isGeneratingPhrases ? 0.45 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          {isGeneratingPhrases && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid #38BDF8',
                borderRadius: '8px',
                padding: '10px 20px',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                zIndex: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚡</span>
              <span>Gerando abordagens personalizadas...</span>
            </div>
          )}
          {generatedPhrases.length === 0 && !isGeneratingPhrases ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '20px',
                textAlign: 'center',
                color: '#8A96A3',
                fontSize: '13.5px',
                backgroundColor: '#16191E',
                border: '1px dashed #272C34',
                borderRadius: '10px',
              }}
            >
              Os scripts de abordagem serão exibidos aqui após selecionar um estado/cidade na busca ou clicar em <strong>Gerar Novas Frases</strong>.
            </div>
          ) : (
            generatedPhrases.map((phrase) => {
            const isCopied = copiedId === phrase.id;
            return (
              <div
                key={phrase.id}
                style={{
                  backgroundColor: '#16191E',
                  border: '1px solid #272C34',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#1E252F',
                        color: '#93C5FD',
                        border: '1px solid #3D5A73',
                      }}
                    >
                      {phrase.channel}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                    {phrase.title}
                  </h4>
                  <p
                    style={{
                      margin: '0 0 18px 0',
                      fontSize: '14px',
                      color: '#CBD5E1',
                      lineHeight: 1.55,
                      fontStyle: 'normal',
                    }}
                  >
                    "{phrase.text}"
                  </p>
                </div>

                {/* Botão Grande de Alto Contraste: Copiar Frase */}
                <button
                  type="button"
                  onClick={() => handleCopyPhrase(phrase.id, phrase.text)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: isCopied ? '#064E3B' : '#1C1E22',
                    border: isCopied ? '1px solid #10B981' : '1px solid #4B5563',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCopied) {
                      e.currentTarget.style.backgroundColor = '#272C34';
                      e.currentTarget.style.borderColor = '#93C5FD';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCopied) {
                      e.currentTarget.style.backgroundColor = '#1C1E22';
                      e.currentTarget.style.borderColor = '#4B5563';
                    }
                  }}
                >
                  <span>{isCopied ? '✓' : '📋'}</span>
                  <span>{isCopied ? 'Frase Copiada!' : 'Copiar Frase'}</span>
                </button>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* ================= 4. BASE SALVA DA EMPRESA (COM LINGUAGEM 100% AMIGÁVEL 50+) ================= */}
      <div
        style={{
          backgroundColor: '#1C1E22',
          border: '1px solid #272C34',
          borderRadius: '16px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600, color: '#D9DEE4' }}>
              Base de Oportunidades da Empresa
            </h3>
            <span style={{ fontSize: '13px', color: '#8A96A3' }}>
              Atualizada dinamicamente conforme as buscas e filtros realizados acima.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasActiveSearch && (
              <button
                type="button"
                onClick={() => {
                  setCityOrSearchInput('');
                  setSelectedState('TODOS');
                  setSearchedLeads([]);
                  setOpportunities([]);
                  setGeneratedPhrases([]);
                  setSelectedOpp(null);
                }}
                style={{
                  height: '32px',
                  padding: '4px 12px',
                  backgroundColor: '#16191E',
                  border: '1px solid #272C34',
                  borderRadius: '6px',
                  color: '#D9DEE4',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Limpar busca
              </button>
            )}
            <span style={{ fontSize: '13px', color: '#93C5FD', fontWeight: 600 }}>
              {displayedLeads.length} oportunidade(s)
            </span>
          </div>
        </div>

        {isSearchingB2B ? (
          <div style={{ padding: '36px 24px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
            <style>{`
              @keyframes b2bSpin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '3px solid #272C34',
                borderTopColor: '#4A7296',
                margin: '0 auto 12px',
                animation: 'b2bSpin 0.8s linear infinite',
              }}
            />
            <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: '4px' }}>
              Buscando empresas reais em {cityOrSearchInput.trim() || selectedState}...
            </div>
            <div style={{ fontSize: '12px', color: '#8A96A3' }}>
              Filtrando segmento: {selectedProfession}
            </div>
          </div>
        ) : !hasActiveSearch ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#8A96A3', fontSize: '14px' }}>
            Nenhuma busca realizada ainda. Selecione um Estado (UF) ou pesquise uma cidade/termo acima para visualizar oportunidades reais.
          </div>
        ) : displayedLeads.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#8A96A3', fontSize: '14px' }}>
            Nenhum resultado correspondente encontrado para o filtro aplicado. Tente outro município ou termo de busca.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #272C34', color: '#8A96A3', backgroundColor: '#16191E' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Empresa</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contato</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>WhatsApp / Telefone</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Região</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid #22262C' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#D9DEE4' }}>
                      {lead.companyName}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#D9DEE4' }}>
                      {lead.contactPerson || 'Responsável'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#93C5FD' }}>
                      {lead.contactPhone || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#8A96A3' }}>
                      {lead.region}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            lead.status === 'CONVERTIDO'
                              ? '#064E3B'
                              : lead.status === 'CONTATADO'
                              ? '#78350F'
                              : '#272C34',
                          color:
                            lead.status === 'CONVERTIDO'
                              ? '#6EE7B7'
                              : lead.status === 'CONTATADO'
                              ? '#FDE68A'
                              : '#D9DEE4',
                        }}
                      >
                        {lead.status === 'CONVERTIDO'
                          ? '✓ Cliente Ativo'
                          : lead.status === 'CONTATADO'
                          ? 'Em Contato'
                          : 'Novo Lead'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {lead.status !== 'CONVERTIDO' && (
                        <button
                          type="button"
                          onClick={() => handleConvertLead(lead)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#1E252F',
                            border: '1px solid #10B981',
                            borderRadius: '6px',
                            color: '#6EE7B7',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Converter em Cliente
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
