import React, { useState, useRef, useEffect, useMemo } from 'react';
import { WorkspaceContext } from './HeaderNavigation';
import { AppStorage } from '../services/app-storage';
import { getFirebaseAuthClient, syncWorkspaceSummaryToFirestore } from '../services/firebase-client';

interface OnboardingScreenProps {
  context: WorkspaceContext;
  userEmail: string;
  onComplete: () => void;
  onBackToEnvironmentSelection?: () => void;
}

export interface CatalogItem {
  title: string;
  subtitle: string;
  icon: string;
  areas: string[];
}

export const BRAZILIAN_PROFESSIONS_CATALOG: CatalogItem[] = [
  {
    title: 'Comercial & Vendas',
    subtitle: 'Representação Comercial, SDR, Closer, B2B e Vendas Diretas',
    icon: '🤝',
    areas: ['Vendas B2B', 'Representação Comercial', 'Inside Sales / Closer', 'Prospecção Outbound', 'Key Account / Grandes Contas', 'Vendas Consultivas', 'Vendas no Varejo', 'Venda Direta / Porta a Porta'],
  },
  {
    title: 'Corretor de Imóveis & Imobiliário',
    subtitle: 'Vendas, Locações, Lançamentos, Loteamentos e Alto Padrão',
    icon: '🏠',
    areas: ['Imóveis de Alto Padrão', 'Lançamentos na Planta', 'Minha Casa Minha Vida', 'Locação Residencial', 'Imóveis Comerciais & Galpões', 'Loteamentos & Terrenos', 'Imóveis Rurais', 'Avaliação & Perícia Imobiliária'],
  },
  {
    title: 'Saúde & Clínicas',
    subtitle: 'Consultórios Médicos, Especialidades, Exames e Telemedicina',
    icon: '🩺',
    areas: ['Clínica Médica Geral', 'Dermatologia & Estética Médica', 'Ortopedia & Reabilitação', 'Cardiologia', 'Pediatria', 'Fisioterapia & Pilates', 'Nutrição Clínica & Esportiva', 'Laboratório & Diagnóstico por Imagem'],
  },
  {
    title: 'Clínica Odontológica',
    subtitle: 'Dentista, Implantes, Ortodontia, Harmonização e Estética Dental',
    icon: '🦷',
    areas: ['Implantodontia', 'Ortodontia & Alinhadores', 'Lentes & Estética Dental', 'Harmonização Orofacial', 'Endodontia', 'Odontopediatria', 'Clínica Odontológica Geral', 'Prótese Dentária'],
  },
  {
    title: 'Direito & Jurídico',
    subtitle: 'Escritório de Advocacia, Consultoria Jurídica e Contencioso',
    icon: '⚖️',
    areas: ['Direito Empresarial & Societário', 'Direito Trabalhista', 'Direito Civil & Contratos', 'Direito Tributário', 'Direito Previdenciário', 'Direito Imobiliário', 'Direito de Família & Sucessões', 'Direito Digital & LGPD'],
  },
  {
    title: 'Contabilidade & Finanças',
    subtitle: 'Escritório Contábil, BPO Financeiro, Fiscal e Planejamento',
    icon: '📑',
    areas: ['Contabilidade para PMEs', 'BPO Financeiro', 'Planejamento Tributário', 'Abertura & Legalização de Empresas', 'Contabilidade para MEI', 'Folha de Pagamento & DP', 'Auditoria & Perícia Contábil', 'Consultoria Financeira Pessoal'],
  },
  {
    title: 'Engenharia & Construção',
    subtitle: 'Obras Civis, Reformas, Laudos, Energia Solar e Projetos',
    icon: '🏗️',
    areas: ['Construção Residencial', 'Reformas & Obras Rápidas', 'Engenharia Estrutural', 'Energia Solar Fotovoltaica', 'Laudos & Vistorias Técnicas', 'Engenharia Elétrica & Automação', 'Obras Comerciais & Galpões', 'Regularização & Aprovação de Projetos'],
  },
  {
    title: 'Arquitetura & Design',
    subtitle: 'Projetos Arquitetônicos, Interiores, Paisagismo e 3D',
    icon: '📐',
    areas: ['Arquitetura Residencial', 'Design de Interiores', 'Arquitetura Comercial & Lojas', 'Reformas de Alto Padrão', 'Paisagismo', 'Luminotécnica', 'Marcenaria & Móveis Planejados', 'Maquete Eletrônica & 3D'],
  },
  {
    title: 'Tecnologia & Software',
    subtitle: 'Desenvolvimento, SaaS, Suporte de TI, Cloud e Automação',
    icon: '💻',
    areas: ['Desenvolvimento Web & Apps', 'SaaS & Sistemas sob Medida', 'Automação & Inteligência Artificial', 'Consultoria em Cloud & DevOps', 'Suporte Técnico & Infraestrutura TI', 'Segurança da Informação', 'Dados & Business Intelligence', 'Integrações & ERP'],
  },
  {
    title: 'Marketing & Tráfego Pago',
    subtitle: 'Agência, Gestão de Tráfego, Social Media, Copy e Branding',
    icon: '📢',
    areas: ['Gestão de Tráfego Pago (Meta/Google)', 'Social Media & Conteúdo', 'Copywriting & Funis de Venda', 'Branding & Identidade Visual', 'SEO & Posicionamento Orgânico', 'Lançamentos Digitais', 'CRM & Automação de Marketing', 'Produção de Criativos & Reels'],
  },
  {
    title: 'Educação & Cursos',
    subtitle: 'Escolas, Mentorias, Cursos Online, Idiomas e Treinamentos',
    icon: '🎓',
    areas: ['Cursos Online & Infoprodutos', 'Mentoria Empresarial', 'Escola de Idiomas', 'Aulas Particulares & Reforço', 'Treinamentos Corporativos', 'Preparatório para Concursos', 'Educação Profissionalizante', 'Consultoria Pedagógica'],
  },
  {
    title: 'Gastronomia & Alimentação',
    subtitle: 'Restaurantes, Delivery, Cafeterias, Confeitaria e Eventos',
    icon: '🍽️',
    areas: ['Restaurante à La Carte', 'Delivery & Dark Kitchen', 'Hamburgueria & Lanchonete', 'Pizzaria', 'Confeitaria & Doceria Artesanal', 'Padaria & Cafeteria', 'Marmitaria & Alimentação Saudável', 'Buffet & Catering para Eventos'],
  },
  {
    title: 'Beleza & Estética',
    subtitle: 'Salões, Barbearia, Estética Avançada, Sobrancelhas e Spa',
    icon: '✨',
    areas: ['Estética Facial & Corporal', 'Salão de Cabeleireiros', 'Barbearia Premium', 'Design de Sobrancelhas & Cílios', 'Manicure & Nail Design', 'Depilação a Laser', 'Maquiagem Profissional', 'Massoterapia & Spa'],
  },
  {
    title: 'Automotivo & Mecânica',
    subtitle: 'Oficinas, Estética Automotiva, Autopeças e Revenda de Veículos',
    icon: '🔧',
    areas: ['Mecânica Geral & Revisão', 'Estética Automotiva & Polimento', 'Funilaria & Pintura', 'Autoelétrica & Injeção Eletrônica', 'Troca de Óleo & Pneus', 'Comércio de Autopeças', 'Revenda de Seminovos', 'Martelinho de Ouro'],
  },
  {
    title: 'Logística & Transporte',
    subtitle: 'Transportadoras, Fretes, Mudanças, Motoboy e Armazenagem',
    icon: '🚚',
    areas: ['Transporte Rodoviário de Cargas', 'Fretes & Mudanças', 'Entregas Rápidas & Last Mile', 'Logística para E-commerce', 'Transporte Executivo', 'Armazenagem & Distribuição', 'Despacho Aduaneiro', 'Gestão de Frotas'],
  },
  {
    title: 'Agronegócio & Agropecuária',
    subtitle: 'Produção Rural, Insumos, Maquinário, Pecuária e Consultoria Agro',
    icon: '🌾',
    areas: ['Agricultura de Grãos', 'Pecuária de Corte & Leite', 'Venda de Insumos & Sementes', 'Maquinário & Implementos Agrícolas', 'Consultoria Agronômica', 'Hortifrúti & Orgânicos', 'Veterinária Rural', 'Irrigação & Energia no Campo'],
  },
  {
    title: 'Indústria & Manufatura',
    subtitle: 'Fábricas, Metalurgia, Confecção, Embalagens e B2B Industrial',
    icon: '🏭',
    areas: ['Metalurgia & Usinagem', 'Confecção & Têxtil', 'Plásticos & Embalagens', 'Alimentos & Bebidas', 'Móveis & Marcenaria Industrial', 'Química & Cosméticos', 'Manutenção Industrial', 'Distribuição Atacadista'],
  },
  {
    title: 'Recursos Humanos & DP',
    subtitle: 'Recrutamento, Seleção, Treinamento, Endomarketing e RH',
    icon: '👥',
    areas: ['Recrutamento & Seleção', 'Consultoria de RH para PMEs', 'Treinamento & Desenvolvimento', 'Clima & Cultura Organizacional', 'Departamento Pessoal Terceirizado', 'Assessment & Cargos e Salários', 'Recolocação Profissional', 'Benefícios Corporativos'],
  },
  {
    title: 'Seguros & Consórcios',
    subtitle: 'Corretora de Seguros, Planos de Saúde, Consórcios e Crédito',
    icon: '🛡️',
    areas: ['Seguro Auto & Frota', 'Planos de Saúde Empresariais', 'Seguro de Vida & Previdência', 'Consórcio Imobiliário', 'Consórcio Automotivo', 'Seguro Residencial & Empresarial', 'Crédito & Financiamentos', 'Seguro Garantia & Fiança'],
  },
  {
    title: 'E-commerce & Varejo',
    subtitle: 'Lojas Virtuais, Marketplaces, Lojas Físicas e Dropshipping',
    icon: '🛍️',
    areas: ['Loja Virtual Própria', 'Vendas em Marketplaces (ML/Shopee/Amazon)', 'Moda & Vestuário', 'Casa, Decoração & Utilidades', 'Eletrônicos & Acessórios', 'Cosméticos & Perfumaria', 'Pet Shop & Ração', 'Atacado & Distribuição'],
  },
  {
    title: 'Psicologia & Terapia',
    subtitle: 'Atendimento Clínico, Terapia Online, Neuropsicologia e Coaching',
    icon: '🧠',
    areas: ['Psicoterapia Clínica Individual', 'Atendimento Online', 'Terapia de Casal & Família', 'Psicologia Infantil', 'Avaliação Neuropsicológica', 'Terapia Cognitivo-Comportamental', 'Psicologia Organizacional', 'Orientação Vocacional'],
  },
  {
    title: 'Academia & Fitness',
    subtitle: 'Academias, Personal Trainer, CrossFit, Lutas e Bem-estar',
    icon: '🏋️',
    areas: ['Personal Trainer Presencial', 'Consultoria Fitness Online', 'Academia de Musculação', 'Studio de Pilates & Funcional', 'Box de CrossFit', 'Artes Marciais', 'Natação & Hidroginástica', 'Preparação Física Esportiva'],
  },
  {
    title: 'Fotografia & Audiovisual',
    subtitle: 'Ensaios, Casamentos, Vídeos Institucionais, Drones e Edição',
    icon: '📷',
    areas: ['Fotografia Corporativa & Retratos', 'Casamentos & Eventos Sociais', 'Vídeos Institucionais & Comerciais', 'Produção para Redes Sociais', 'Filmagem com Drone', 'Fotografia de Produtos / E-commerce', 'Cobertura de Eventos', 'Edição & Pós-Produção'],
  },
  {
    title: 'Prestação de Serviços Gerais',
    subtitle: 'Manutenção, Limpeza, Segurança, Climatização e Facilities',
    icon: '🛠️',
    areas: ['Climatização & Ar-Condicionado', 'Limpeza Comercial & Pós-Obra', 'Segurança Eletrônica & CFTV', 'Manutenção Predial & Marido de Aluguel', 'Dedetização & Controle de Pragas', 'Jardinagem & Paisagismo', 'Assistência Técnica de Eletrodomésticos', 'Energia & Instalações Elétricas'],
  },
];

const FALLBACK_AREAS = [
  'Atendimento ao Cliente Final (B2C)',
  'Atendimento a Empresas (B2B)',
  'Consultoria Especializada',
  'Vendas & Prospecção Comercial',
  'Gestão & Operação Diária',
  'Serviços Recorrentes / Mensalidade',
  'Atendimento Online / Remoto',
  'Atendimento Presencial Regional',
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  context,
  userEmail,
  onComplete,
  onBackToEnvironmentSelection,
}) => {
  const isCorporate = context.type === 'CORPORATE';
  const environmentLabel = isCorporate ? 'Minha Empresa' : 'Meu Trabalho';
  const accentColor = isCorporate ? '#3D5A73' : '#10B981';
  const badgeBg = isCorporate ? 'rgba(61, 90, 115, 0.25)' : 'rgba(16, 185, 129, 0.18)';
  const badgeText = isCorporate ? '#93C5FD' : '#6EE7B7';

  const [step, setStep] = useState<1 | 2>(1);
  const [professionInput, setProfessionInput] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [areaInput, setAreaInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const professionInputRef = useRef<HTMLInputElement>(null);
  const areaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) {
      professionInputRef.current?.focus();
    } else {
      areaInputRef.current?.focus();
    }
  }, [step]);

  const filteredProfessions = useMemo(() => {
    const query = normalizeText(professionInput);
    if (!query) return BRAZILIAN_PROFESSIONS_CATALOG;
    return BRAZILIAN_PROFESSIONS_CATALOG.filter((item) => {
      const matchTitle = normalizeText(item.title).includes(query);
      const matchSubtitle = normalizeText(item.subtitle).includes(query);
      const matchAreas = item.areas.some((a) => normalizeText(a).includes(query));
      return matchTitle || matchSubtitle || matchAreas;
    });
  }, [professionInput]);

  const currentCatalogMatch = useMemo(() => {
    const normSel = normalizeText(selectedProfession);
    return BRAZILIAN_PROFESSIONS_CATALOG.find((item) => normalizeText(item.title) === normSel) || null;
  }, [selectedProfession]);

  const availableAreas = useMemo(() => {
    return currentCatalogMatch?.areas || FALLBACK_AREAS;
  }, [currentCatalogMatch]);

  const handleSelectProfession = (title: string) => {
    setProfessionInput(title);
    setSelectedProfession(title);
    setAreaInput('');
  };

  const handleContinueToStep2 = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const chosen = (professionInput || selectedProfession).trim();
    if (!chosen) return;
    setSelectedProfession(chosen);
    setStep(2);
  };

  const handleFinish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalProfession = (selectedProfession || professionInput).trim();
    const finalArea = areaInput.trim() || availableAreas[0] || 'Geral';
    if (!finalProfession || !finalArea) return;

    AppStorage.completeOnboarding(context.type, finalProfession, finalArea);

    const authUid = getFirebaseAuthClient()?.currentUser?.uid;
    if (authUid) {
      void syncWorkspaceSummaryToFirestore(authUid, context.type, {
        profession: finalProfession,
        specialty: finalArea,
        areaAtuacao: finalArea,
      }).catch(() => {});
    }

    onComplete();
  };

  const canContinueStep1 = Boolean((professionInput || selectedProfession).trim());
  const canFinishStep2 = Boolean(areaInput.trim());

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#121417',
        color: '#D9DEE4',
        padding: '28px 20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '720px',
          margin: '0 auto 28px auto',
          width: '100%',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/assets/opensketch-logo.svg"
            alt="opensketch"
            style={{ height: '28px', width: 'auto' }}
          />
          <div style={{ width: '1px', height: '20px', backgroundColor: '#272C34' }} />
          <span
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '8px',
              backgroundColor: badgeBg,
              color: badgeText,
              border: `1px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{isCorporate ? '🏢' : '👤'}</span>
            <span>{environmentLabel}</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12.5px', color: '#8A96A3' }}>{userEmail}</span>
          {onBackToEnvironmentSelection && (
            <button
              type="button"
              onClick={onBackToEnvironmentSelection}
              style={{
                background: 'none',
                border: '1px solid #272C34',
                color: '#8A96A3',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Trocar ambiente
            </button>
          )}
        </div>
      </div>

      {/* Main Content Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        {/* Step Indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '999px',
            backgroundColor: badgeBg,
            border: `1px solid ${accentColor}`,
            color: badgeText,
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          <span>Etapa {step} de 2</span>
          <span>•</span>
          <span>{step === 1 ? 'Profissão' : 'Área de Atuação'}</span>
        </div>

        {step === 1 ? (
          /* ================= TELA 1: QUAL É A SUA PROFISSÃO? ================= */
          <form onSubmit={handleContinueToStep2} style={{ width: '100%' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                margin: '0 0 10px 0',
                color: '#FFFFFF',
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              Qual é a sua profissão?
            </h1>
            <p
              style={{
                margin: '0 auto 24px auto',
                fontSize: '14.5px',
                color: '#8A96A3',
                lineHeight: 1.5,
                maxWidth: '540px',
                textAlign: 'center',
              }}
            >
              Escolha no catálogo completo abaixo ou digite uma profissão personalizada para adaptarmos o Copiloto IA e as ferramentas para <strong>{environmentLabel}</strong>.
            </p>

            {/* Campo de Busca / Profissão Customizada */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1C1E22',
                border: isInputFocused ? `2px solid ${accentColor}` : '1px solid #2C4257',
                borderRadius: '12px',
                padding: '4px 16px',
                marginBottom: '14px',
              }}
            >
              <span style={{ fontSize: '18px', marginRight: '10px', color: '#8A96A3' }}>🔍</span>
              <input
                id="profession-input"
                ref={professionInputRef}
                type="text"
                value={professionInput}
                onChange={(e) => {
                  setProfessionInput(e.target.value);
                  setSelectedProfession(e.target.value);
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Busque ou digite sua profissão (ex: Corretor de Imóveis, Advocacia...)"
                style={{
                  flex: 1,
                  minHeight: '46px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 500,
                  outline: 'none',
                }}
              />
              {professionInput && (
                <button
                  type="button"
                  onClick={() => {
                    setProfessionInput('');
                    setSelectedProfession('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8A96A3',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Lista Rolável com Catálogo Completo */}
            <div
              style={{
                backgroundColor: '#16191E',
                border: '1px solid #272C34',
                borderRadius: '12px',
                padding: '8px',
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  color: '#8A96A3',
                  padding: '6px 10px',
                }}
              >
                Catálogo de Profissões ({filteredProfessions.length})
              </div>

              {filteredProfessions.length === 0 ? (
                <div style={{ padding: '16px 12px', fontSize: '13px', color: '#94A3B8', textAlign: 'center' }}>
                  Nenhuma profissão encontrada no catálogo. Clique em <strong>Continuar</strong> para usar “{professionInput.trim()}” como profissão personalizada.
                </div>
              ) : (
                filteredProfessions.map((item, idx) => {
                  const isSelected = normalizeText(item.title) === normalizeText(professionInput);
                  const isHovered = hoveredIndex === idx;
                  return (
                    <div
                      key={item.title}
                      onClick={() => handleSelectProfession(item.title)}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? badgeBg : isHovered ? '#1F242C' : 'transparent',
                        border: isSelected ? `1px solid ${accentColor}` : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#D9DEE4' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8A96A3' }}>
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: isSelected ? badgeText : accentColor, fontWeight: 600, flexShrink: 0 }}>
                        {isSelected ? '✓ Selecionada' : 'Selecionar'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="submit"
              disabled={!canContinueStep1}
              style={{
                width: '100%',
                minHeight: '50px',
                padding: '14px 28px',
                backgroundColor: canContinueStep1 ? accentColor : '#1C1E22',
                color: canContinueStep1 ? '#FFFFFF' : '#8A96A3',
                border: canContinueStep1 ? 'none' : '1px solid #272C34',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: canContinueStep1 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <span>Continuar</span>
              <span>→</span>
            </button>
          </form>
        ) : (
          /* ================= TELA 2: QUAL É A SUA ÁREA DE ATUAÇÃO? ================= */
          <form onSubmit={handleFinish} style={{ width: '100%' }}>
            {/* Card/Badge da Profissão Selecionada + Botão Trocar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#16191E',
                border: `1px solid ${accentColor}`,
                borderRadius: '12px',
                padding: '12px 16px',
                marginBottom: '22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{currentCatalogMatch?.icon || '💼'}</span>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8A96A3', fontWeight: 700 }}>
                    Profissão Selecionada
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8FAFC' }}>
                    {selectedProfession}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  backgroundColor: '#1C1E22',
                  border: '1px solid #334155',
                  color: '#CBD5E1',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Trocar profissão
              </button>
            </div>

            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                margin: '0 0 10px 0',
                color: '#FFFFFF',
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              Qual é a sua área de atuação?
            </h1>
            <p
              style={{
                margin: '0 auto 22px auto',
                fontSize: '14.5px',
                color: '#8A96A3',
                lineHeight: 1.5,
                maxWidth: '540px',
                textAlign: 'center',
              }}
            >
              Selecione uma especialidade abaixo ou digite a sua área para que os agentes de IA gerem argumentos, metas e abordagens específicas.
            </p>

            {/* Campo da Área Personalizada */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#1C1E22',
                border: isInputFocused ? `2px solid ${accentColor}` : '1px solid #2C4257',
                borderRadius: '12px',
                padding: '4px 16px',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '18px', marginRight: '10px', color: '#8A96A3' }}>🎯</span>
              <input
                id="area-input"
                ref={areaInputRef}
                type="text"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="Selecione uma pílula abaixo ou digite sua área específica..."
                style={{
                  flex: 1,
                  minHeight: '46px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 500,
                  outline: 'none',
                }}
              />
              {areaInput && (
                <button
                  type="button"
                  onClick={() => setAreaInput('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8A96A3',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                  title="Limpar área"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Caixa Rolável com Pílulas (Pills) das Áreas da Profissão */}
            <div
              style={{
                backgroundColor: '#16191E',
                border: '1px solid #272C34',
                borderRadius: '12px',
                padding: '14px',
                maxHeight: '240px',
                overflowY: 'auto',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  color: '#8A96A3',
                  marginBottom: '10px',
                }}
              >
                Áreas de Atuação em {selectedProfession}:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {availableAreas.map((area) => {
                  const isActive = normalizeText(areaInput) === normalizeText(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setAreaInput(area)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: isActive ? 700 : 500,
                        backgroundColor: isActive ? accentColor : '#1C1E22',
                        color: isActive ? '#FFFFFF' : '#CBD5E1',
                        border: isActive ? `1px solid ${accentColor}` : '1px solid #2C333D',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isActive ? `✓ ${area}` : area}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!canFinishStep2}
              style={{
                width: '100%',
                minHeight: '52px',
                padding: '14px 28px',
                backgroundColor: canFinishStep2 ? accentColor : '#1C1E22',
                color: canFinishStep2 ? '#FFFFFF' : '#8A96A3',
                border: canFinishStep2 ? 'none' : '1px solid #272C34',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: canFinishStep2 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <span>Concluir e Acessar {environmentLabel}</span>
              <span>→</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
