import React, { useState } from 'react';

export type PublicPageRoute = '/' | '/recursos' | '/blog' | '/planos';
export type PlanType = 'gratuito' | 'essencial' | 'vitalicio';

interface LandingPageProps {
  currentRoute: PublicPageRoute;
  onNavigate: (route: PublicPageRoute | '/entrar' | '/cadastro' | '/privacidade' | '/termos') => void;
  onSelectPlan: (plan: PlanType) => void;
  checkoutLoadingPlan?: PlanType | null;
  checkoutError?: string | null;
}

const MODULES = [
  {
    title: 'Vendas',
    subtitle: 'Lana • Negociação & Fechamento',
    description:
      'Responda pedidos de desconto com segurança, contorne objeções na hora e conduza cada conversa para o fechamento.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Anúncios',
    subtitle: 'Lois • Tráfego Pago & Conversão',
    description:
      'Estruture anúncios objetivos, corrija campanhas que não convertem e direcione verba apenas para o que gera retorno.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 11v2a1 1 0 0 0 1 1h2l4 5V5L6 10H4a1 1 0 0 0-1 1z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Marketing',
    subtitle: 'Clowe • Atração & Posicionamento',
    description:
      'Construa autoridade no seu segmento com posicionamento claro e mensagens que atraem compradores qualificados.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Financeira',
    subtitle: 'Mike • Margem, Preço & Lucro',
    description:
      'Defina seu preço mínimo real, proteja sua margem contra descontos impulsivos e acompanhe metas com clareza.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 15l4-4 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Clientes',
    subtitle: 'Carteira & Histórico Comercial',
    description:
      'Mantenha histórico de compras, contatos, notas fiscais e oportunidades ativas organizados sem planilhas paralelas.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Prospecção',
    subtitle: 'Mercado B2B & Abordagem Direta',
    description:
      'Localize empresas por estado, cidade e segmento no ambiente corporativo e gere abordagens prontas para WhatsApp e e-mail.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="11" cy="11" r="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const TRIAD_STEPS = [
  {
    step: '1. Investigar',
    tag: 'Diagnóstico & Mercado',
    description:
      'Identifique empresas com maior aderência na sua região, revise o comportamento da sua carteira e enxergue onde sua margem está escapando.',
  },
  {
    step: '2. Desenvolver',
    tag: 'Oferta & Posicionamento',
    description:
      'Monte abordagens personalizadas, campanhas objetivas e argumentos de venda alinhados ao perfil real de cada comprador.',
  },
  {
    step: '3. Solucionar',
    tag: 'Fechamento & Escala',
    description:
      'Transforme contatos em vendas registradas, centralize comprovantes na biblioteca digital e execute suas metas diárias com previsibilidade.',
  },
];

const WHY_PILLARS = [
  {
    title: 'Chega de Perder Anotações e Clientes',
    description:
      'Tire foto das suas anotações do caderno ou jogue ideias soltas e transforme tudo em contatos organizados prontos para fechar negócio.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 7V5a2 2 0 0 1 2-2h2M20 7V5a2 2 0 0 0-2-2h-2M4 17v2a2 2 0 0 0 2 2h2M20 17v2a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 12h10M9 8h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Uma Equipe Inteira Trabalhando por Você',
    description:
      'Tenha especialistas em vendas, anúncios, marketing, finanças e estratégia respondendo na hora sobre o seu negócio.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 2l2.4 5.2L20 9.5l-4 3.9.9 5.6L12 16.3 7.1 19l.9-5.6-4-3.9 5.6-2.3L12 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Preço Certo sem Tomar Prejuízo',
    description:
      'Calcule sua margem real antes de dar desconto e acompanhe quanto está sobrando no bolso em cada venda.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="4" width="8" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="13" y="4" width="8" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Tudo Organizado no Celular ou Computador',
    description:
      'Acesse seus clientes, metas e estratégias de qualquer lugar, sem depender de planilhas complicadas ou papéis perdidos.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const FAQ_ITEMS = [
  {
    question: 'Como funciona a leitura de cadernos escritos à mão?',
    answer:
      'Basta fotografar ou colar (Ctrl+V) a folha do seu caderno, recibo ou anotação de reunião no Copiloto. A leitura automática identifica nomes, valores e observações para você conferir e salvar em segundos.',
  },
  {
    question: 'Qual a diferença entre Meu Trabalho e Minha Empresa?',
    answer:
      'Meu Trabalho é focado na sua organização individual (clientes, metas, anúncios e biblioteca). Minha Empresa adiciona recursos corporativos B2B, prospecção por região e o Centro de Inteligência Financeira & Margem.',
  },
  {
    question: 'Como funciona o Acesso Vitalício vs. Assinatura Mensal?',
    answer:
      'Na assinatura Essencial Mensal (R$ 39,99/mês) você utiliza 100% do ambiente Meu Trabalho. No Plano Completo Vitalício (R$ 119,99 único) você libera Meu Trabalho + Minha Empresa sem mensalidade e recebe futuras atualizações.',
  },
  {
    question: 'Meus dados e contatos de clientes ficam seguros e posso baixar tudo?',
    answer:
      'Sim. Suas informações ficam protegidas na sua conta privada, separadas entre seu trabalho individual e sua empresa, e você pode baixar uma cópia completa dos seus dados com um clique a qualquer momento.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  currentRoute,
  onNavigate,
  onSelectPlan,
  checkoutLoadingPlan = null,
  checkoutError = null,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeBlogArticle, setActiveBlogArticle] = useState<'A' | 'B' | null>(null);

  const navItems: Array<{ label: string; route: PublicPageRoute }> = [
    { label: 'Início', route: '/' },
    { label: 'Recursos', route: '/recursos' },
    { label: 'Blog', route: '/blog' },
    { label: 'Planos', route: '/planos' },
  ];

  const handlePlanClick = (plan: PlanType) => {
    onSelectPlan(plan);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090B0E',
        color: '#F8FAFC',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        .lp-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          width: 100%;
          box-sizing: border-box;
        }
        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 28px;
        }
        .lp-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lp-mobile-toggle {
          display: none;
        }
        .lp-hero-grid {
          display: grid;
          grid-template-columns: 1.05fr 1.15fr;
          gap: 48px;
          align-items: center;
        }
        .lp-modules-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .lp-triad-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .lp-plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 22px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .lp-pillars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 28px;
        }
        .lp-faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        .lp-support-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .lp-cta-primary {
          background-color: #2C4863;
          color: #FFFFFF;
          border: 1px solid #4A7296;
          transition: background-color 0.15s ease, transform 0.15s ease;
        }
        .lp-cta-primary:hover {
          background-color: #365778;
        }
        @media (max-width: 960px) {
          .lp-hero-grid {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .lp-modules-grid,
          .lp-pillars-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .lp-triad-grid,
          .lp-plans-grid,
          .lp-faq-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .lp-nav-links,
          .lp-header-actions {
            display: none;
          }
          .lp-mobile-toggle {
            display: inline-flex;
          }
          .lp-modules-grid,
          .lp-plans-grid,
          .lp-pillars-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* ================= CABEÇALHO FIXO ================= */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(9, 11, 14, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1E293B',
        }}
      >
        <div
          className="lp-container"
          style={{
            height: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          {/* Esquerda: Logo Oficial */}
          <button
            type="button"
            onClick={() => {
              onNavigate('/');
              setMobileMenuOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="opensketch Início"
          >
            <img
              src="/assets/opensketch-logo.svg"
              alt="opensketch"
              style={{ height: '32px', width: 'auto', display: 'block' }}
            />
          </button>

          {/* Centro: Navegação */}
          <nav className="lp-nav-links" aria-label="Navegação principal">
            {navItems.map((item) => {
              const active = currentRoute === item.route;
              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px 2px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#F8FAFC' : '#94A3B8',
                    borderBottom: active ? '2px solid #4A7296' : '2px solid transparent',
                    transition: 'color 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Direita: Entrar & Criar Conta */}
          <div className="lp-header-actions">
            <button
              type="button"
              onClick={() => onNavigate('/entrar')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #3B5B78',
                backgroundColor: 'transparent',
                color: '#F8FAFC',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className="lp-cta-primary"
              onClick={() => onNavigate('/cadastro')}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Criar Conta
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="lp-mobile-toggle"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={mobileMenuOpen}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #3B5B78',
              backgroundColor: '#11151C',
              color: '#F8FAFC',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div
            style={{
              backgroundColor: '#11151C',
              borderTop: '1px solid #1E293B',
              padding: '16px 24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {navItems.map((item) => (
              <button
                key={item.route}
                type="button"
                onClick={() => {
                  onNavigate(item.route);
                  setMobileMenuOpen(false);
                }}
                style={{
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '8px 0',
                  color: currentRoute === item.route ? '#F8FAFC' : '#94A3B8',
                  fontWeight: currentRoute === item.route ? 700 : 500,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  onNavigate('/entrar');
                  setMobileMenuOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #3B5B78',
                  backgroundColor: 'transparent',
                  color: '#F8FAFC',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Entrar
              </button>
              <button
                type="button"
                className="lp-cta-primary"
                onClick={() => {
                  onNavigate('/cadastro');
                  setMobileMenuOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Criar Conta
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ================= CONTEÚDO PRINCIPAL POR ROTA ================= */}
      <main style={{ flex: 1 }}>
        {currentRoute === '/' && (
          <>
            {/* HERO (2 COLUNAS COM FUNDO DE ONDAS LUMINOSAS ORIGINAL) */}
            <section
              style={{
                position: 'relative',
                padding: '76px 0 68px',
                backgroundImage: "url('/hero-bg.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'left center',
                backgroundRepeat: 'no-repeat',
                borderBottom: '1px solid #161D27',
                overflow: 'hidden',
              }}
            >
              {/* Leve sombra sutil apenas atrás do bloco de texto à esquerda */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, rgba(9, 11, 14, 0.72) 0%, rgba(9, 11, 14, 0.35) 52%, rgba(9, 11, 14, 0.12) 100%)',
                  pointerEvents: 'none',
                }}
              />

              <div className="lp-container lp-hero-grid" style={{ position: 'relative', zIndex: 1 }}>
                {/* Esquerda */}
                <div style={{ textShadow: '0 2px 16px rgba(0, 0, 0, 0.75)' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '5px 12px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(17, 21, 28, 0.85)',
                      border: '1px solid #3B5B78',
                      color: '#E2E8F0',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '20px',
                    }}
                  >
                    ESCORP IDS • Inteligência Comercial Aplicada
                  </div>
                  <h1
                    style={{
                      margin: '0 0 20px 0',
                      fontSize: 'clamp(32px, 4.4vw, 50px)',
                      fontWeight: 800,
                      lineHeight: 1.08,
                      letterSpacing: '-0.03em',
                      color: '#F8FAFC',
                    }}
                  >
                    INVESTIGAR.
                    <br />
                    DESENVOLVER.
                    <br />
                    <span style={{ color: '#4A7296' }}>SOLUCIONAR.</span>
                  </h1>
                  <p
                    style={{
                      margin: '0 0 32px 0',
                      fontSize: '17px',
                      lineHeight: 1.6,
                      color: '#E2E8F0',
                      maxWidth: '500px',
                    }}
                  >
                    Uma plataforma inteligente de prospecção, gestão de clientes e vendas, com IA para impulsionar o seu negócio.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="lp-cta-primary"
                      onClick={() => onNavigate('/cadastro')}
                      style={{
                        padding: '14px 26px',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
                      }}
                    >
                      Criar minha conta gratuita
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('/recursos')}
                      style={{
                        padding: '14px 20px',
                        borderRadius: '10px',
                        border: '1px solid #3B5B78',
                        backgroundColor: 'rgba(17, 21, 28, 0.85)',
                        color: '#F8FAFC',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Ver como funciona
                    </button>
                  </div>
                </div>

                {/* Direita: Mockup Realista de Notebook com Captura Real do App */}
                <div>
                  <div
                    style={{
                      backgroundColor: '#11151C',
                      border: '1px solid #3B5B78',
                      borderRadius: '16px',
                      padding: '12px 12px 10px',
                      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(74, 114, 150, 0.22)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                        padding: '0 6px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B5B78' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#263244' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#263244' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                        opensketch • Área de Operações
                      </span>
                      <span style={{ width: '24px' }} />
                    </div>
                    <div
                      style={{
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid #1E293B',
                        backgroundColor: '#090B0E',
                      }}
                    >
                      <img
                        src="/assets/opensketch-app-preview.jpg"
                        alt="Interface real do opensketch com Copiloto IA e barra lateral"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                      />
                    </div>
                  </div>
                  {/* Base do Notebook */}
                  <div
                    style={{
                      width: '88%',
                      height: '12px',
                      margin: '0 auto',
                      background: 'linear-gradient(180deg, #273447 0%, #11151C 100%)',
                      borderBottomLeftRadius: '14px',
                      borderBottomRightRadius: '14px',
                      border: '1px solid #3B5B78',
                      borderTop: 'none',
                    }}
                  />
                </div>
              </div>
            </section>

            {/* GRID DE 6 FRENTES */}
            <section style={{ padding: '72px 0', borderBottom: '1px solid #161D27' }}>
              <div className="lp-container">
                <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 44px' }}>
                  <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#F8FAFC' }}>
                    Administre suas oportunidades em 6 frentes
                  </h2>
                </div>
                <div className="lp-modules-grid">
                  {MODULES.map((mod) => (
                    <div
                      key={mod.title}
                      style={{
                        backgroundColor: '#11151C',
                        border: '1px solid #1F2A38',
                        borderRadius: '14px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(59, 91, 120, 0.2)',
                          border: '1px solid #3B5B78',
                          color: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {mod.icon}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#F8FAFC' }}>
                          {mod.title}
                        </h3>
                        <div style={{ fontSize: '12px', color: '#4A7296', fontWeight: 600 }}>
                          {mod.subtitle}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.55 }}>
                        {mod.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* POSIÇÃO 1 — POR QUE ESCOLHER O OPENSKETCH? (4 COLUNAS LIMPAS COM BRILHO RADIAL) */}
            <section
              style={{
                padding: '76px 0',
                borderBottom: '1px solid #161D27',
                background:
                  'radial-gradient(ellipse 65% 55% at 50% 42%, rgba(59, 91, 120, 0.22) 0%, rgba(17, 21, 28, 0.08) 55%, rgba(9, 11, 14, 0) 100%)',
              }}
            >
              <div className="lp-container">
                <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 52px' }}>
                  <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#F8FAFC' }}>
                    Por que escolher o opensketch?
                  </h2>
                </div>
                <div className="lp-pillars-grid">
                  {WHY_PILLARS.map((pillar) => (
                    <div
                      key={pillar.title}
                      style={{
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '8px 6px',
                      }}
                    >
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle at 30% 30%, #4A7296 0%, #2C4863 65%, #1A2B3C 100%)',
                          border: '1px solid rgba(148, 163, 184, 0.28)',
                          boxShadow: '0 0 28px rgba(74, 114, 150, 0.42)',
                          color: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {pillar.icon}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.35 }}>
                        {pillar.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.6 }}>
                        {pillar.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* SEÇÃO DE 3 PASSOS (A TRÍADE NA PRÁTICA) */}
            <section style={{ padding: '72px 0', borderBottom: '1px solid #161D27' }}>
              <div className="lp-container">
                <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 44px' }}>
                  <h2 style={{ margin: '0 0 12px 0', fontSize: '30px', fontWeight: 700, color: '#F8FAFC' }}>
                    A Tríade na Prática
                  </h2>
                  <p style={{ margin: 0, fontSize: '15px', color: '#94A3B8', lineHeight: 1.6 }}>
                    Do primeiro contato ao pós-venda: cada etapa orientada por dados reais para você vender com mais margem e menos esforço operacional.
                  </p>
                </div>
                <div className="lp-triad-grid">
                  {TRIAD_STEPS.map((item) => (
                    <div
                      key={item.step}
                      style={{
                        backgroundColor: '#11151C',
                        border: '1px solid #263447',
                        borderRadius: '14px',
                        padding: '28px 24px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#4A7296',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: '8px',
                        }}
                      >
                        {item.tag}
                      </div>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '21px', fontWeight: 700, color: '#F8FAFC' }}>
                        {item.step}
                      </h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.6 }}>
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* POSIÇÃO 2 — CASO DE USO EM DESTAQUE + BARRA DE AVALIAÇÕES E SUPORTE */}
            <section style={{ padding: '72px 0 32px', borderBottom: '1px solid #161D27' }}>
              <div className="lp-container">
                {/* Caso de Uso em Destaque (Glassmorphism sobre foto horizontal) */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: '1px solid #263447',
                    backgroundColor: '#11151C',
                    backgroundImage: "url('/assets/use-case-office.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center right',
                    minHeight: '380px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '40px 32px',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
                    marginBottom: '28px',
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(90deg, rgba(9, 11, 14, 0.86) 0%, rgba(9, 11, 14, 0.45) 55%, rgba(9, 11, 14, 0.15) 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      maxWidth: '610px',
                      background: 'linear-gradient(135deg, rgba(22, 34, 51, 0.82) 0%, rgba(44, 72, 99, 0.62) 100%)',
                      backdropFilter: 'blur(14px)',
                      WebkitBackdropFilter: 'blur(14px)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '16px',
                      padding: '28px 28px 24px',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        fontSize: '42px',
                        lineHeight: 0.8,
                        fontWeight: 800,
                        color: '#4A7296',
                        marginBottom: '12px',
                      }}
                    >
                      “
                    </div>
                    <p
                      style={{
                        margin: '0 0 18px 0',
                        fontSize: '15px',
                        lineHeight: 1.55,
                        color: '#F8FAFC',
                        fontWeight: 500,
                      }}
                    >
                      “Enquanto concorrentes improvisam no papel e dão desconto no escuro, entro em cada reunião sabendo até onde minha margem aguenta. Jogo minhas anotações no opensketch e a inteligência artificial mapeia o próximo passo e entrega o fechamento pronto — sem ninguém perceber a estrutura que opera nos bastidores.”
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: '#2C4863',
                          border: '1px solid #4A7296',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                        }}
                      >
                        JE
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>Julian Escobal</div>
                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>Fundador & Estrategista Comercial</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra Horizontal de Avaliações e Suporte */}
                <div
                  className="lp-support-bar"
                  style={{
                    background: 'linear-gradient(90deg, #11151C 0%, #162233 65%, #1D3047 100%)',
                    border: '1px solid #2C4863',
                    borderRadius: '14px',
                    padding: '18px 24px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Avatares circulares sobrepostos */}
                    <div style={{ display: 'flex', alignItems: 'center' }} aria-hidden="true">
                      {[
                        { initials: 'RM', bg: '#2C4863' },
                        { initials: 'AL', bg: '#3B5B78' },
                        { initials: 'CS', bg: '#1E3A5F' },
                        { initials: 'JP', bg: '#4A7296' },
                      ].map((av, idx) => (
                        <div
                          key={av.initials}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: av.bg,
                            border: '2px solid #090B0E',
                            color: '#F8FAFC',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: idx === 0 ? 0 : '-10px',
                          }}
                        >
                          {av.initials}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#FBBF24', letterSpacing: '0.08em', marginBottom: '2px' }}>
                        ★★★★★
                      </div>
                      <div style={{ fontSize: '14px', color: '#F8FAFC', fontWeight: 500 }}>
                        Aprovado por profissionais autônomos e empresas que trocaram o caderno de papel pela gestão inteligente
                      </div>
                    </div>
                  </div>

                  <a
                    href="mailto:suporte@escorpids.com.br"
                    className="lp-cta-primary"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '9px',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Falar com Suporte
                  </a>
                </div>
              </div>
            </section>

            {/* SEÇÃO DE PLANOS (2 CARDS) */}
            <section style={{ padding: '72px 0', borderBottom: '1px solid #161D27' }}>
              <div className="lp-container">
                <div style={{ textAlign: 'center', maxWidth: '620px', margin: '0 auto 44px' }}>
                  <h2 style={{ margin: '0 0 12px 0', fontSize: '30px', fontWeight: 700, color: '#F8FAFC' }}>
                    Invista no Ritmo da Sua Operação
                  </h2>
                  <p style={{ margin: 0, fontSize: '15px', color: '#94A3B8', lineHeight: 1.6 }}>
                    Comece no ambiente individual ou garanta agora o acesso completo vitalício sem mensalidades.
                  </p>
                </div>
                <PlansComparisonGrid
                  onSelectPlan={handlePlanClick}
                  checkoutLoadingPlan={checkoutLoadingPlan}
                  checkoutError={checkoutError}
                />
              </div>
            </section>

            {/* POSIÇÃO 3 — FAQ EM 2 COLUNAS */}
            <section style={{ padding: '72px 0', borderBottom: '1px solid #161D27' }}>
              <div className="lp-container">
                <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 44px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#4A7296',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '8px',
                    }}
                  >
                    Perguntas Frequentes
                  </div>
                  <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 700, color: '#F8FAFC' }}>
                    Dúvidas Sobre o opensketch
                  </h2>
                </div>
                <div className="lp-faq-grid">
                  {FAQ_ITEMS.map((item) => (
                    <div
                      key={item.question}
                      style={{
                        backgroundColor: '#11151C',
                        border: '1px solid #1F2A38',
                        borderRadius: '14px',
                        padding: '22px 24px',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(59, 91, 120, 0.22)',
                          border: '1px solid #3B5B78',
                          color: '#4A7296',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        ?
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.4 }}>
                          {item.question}
                        </h3>
                        <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.6 }}>
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* FECHAMENTO FINAL (ANTES DO RODAPÉ) */}
            <section style={{ padding: '72px 0' }}>
              <div className="lp-container">
                <div
                  style={{
                    background: 'linear-gradient(135deg, #11151C 0%, #15202E 100%)',
                    border: '1px solid #3B5B78',
                    borderRadius: '18px',
                    padding: '48px 28px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '22px',
                  }}
                >
                  <img
                    src="/assets/opensketch-logo.svg"
                    alt="opensketch"
                    style={{ height: '38px', width: 'auto', display: 'block' }}
                  />
                  <div
                    style={{
                      fontSize: 'clamp(20px, 3vw, 28px)',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      color: '#F8FAFC',
                    }}
                  >
                    SUA VISÃO, NOSSO RESULTADO.
                  </div>
                  <button
                    type="button"
                    className="lp-cta-primary"
                    onClick={() => onNavigate('/cadastro')}
                    style={{
                      padding: '13px 28px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Criar Conta
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ================= PÁGINA DEDICADA: /recursos ================= */}
        {currentRoute === '/recursos' && (
          <section style={{ padding: '64px 0 80px' }}>
            <div className="lp-container">
              <div style={{ maxWidth: '720px', marginBottom: '44px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  Recursos do Sistema
                </div>
                <h1 style={{ margin: '0 0 14px 0', fontSize: '36px', fontWeight: 800, color: '#F8FAFC' }}>
                  Administre suas oportunidades em 6 frentes
                </h1>
                <p style={{ margin: 0, fontSize: '16px', color: '#94A3B8', lineHeight: 1.65 }}>
                  Cada frente conecta seus números reais a especialistas de IA para acelerar prospecção B2B, negociação comercial e controle financeiro.
                </p>
              </div>
              <div className="lp-modules-grid" style={{ marginBottom: '40px' }}>
                {MODULES.map((mod) => (
                  <div
                    key={mod.title}
                    style={{
                      backgroundColor: '#11151C',
                      border: '1px solid #263447',
                      borderRadius: '14px',
                      padding: '26px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ color: '#4A7296' }}>{mod.icon}</div>
                    <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#F8FAFC' }}>{mod.title}</h2>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4A7296' }}>{mod.subtitle}</div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.6 }}>{mod.description}</p>
                  </div>
                ))}
              </div>

              {/* 1. DO CADERNO FÍSICO AO CONTROLE TOTAL */}
              <div style={{ marginTop: '64px', marginBottom: '64px' }}>
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Transformação Imediata
                  </div>
                  <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#F8FAFC' }}>
                    Do Caderno Físico ao Controle Total
                  </h2>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '20px',
                    alignItems: 'center',
                  }}
                >
                  {/* Card Esquerdo: Folha de Caderno Pautada */}
                  <div
                    style={{
                      backgroundColor: '#131822',
                      border: '1px solid #2A3648',
                      borderRadius: '14px',
                      padding: '26px 24px',
                      backgroundImage:
                        'repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(148, 163, 184, 0.14) 31px, rgba(148, 163, 184, 0.14) 32px)',
                      boxShadow: 'inset 4px 0 0 rgba(74, 114, 150, 0.45)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                      Anotação no Caderno
                    </div>
                    <div
                      style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontStyle: 'italic',
                        fontSize: '18px',
                        lineHeight: '32px',
                        color: '#E2E8F0',
                      }}
                    >
                      “Reunião Carlos - proposta R$ 4.500 - pedir retorno quinta”
                    </div>
                  </div>

                  {/* Seta Luminosa Central */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 0' }}>
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(74, 114, 150, 0.4) 0%, rgba(44, 72, 99, 0.25) 70%)',
                        border: '1px solid #4A7296',
                        boxShadow: '0 0 28px rgba(74, 114, 150, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#F8FAFC',
                        fontSize: '22px',
                        fontWeight: 700,
                      }}
                    >
                      →
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4A7296', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Leitura Automática
                    </span>
                  </div>

                  {/* Card Direito: Painel Digital opensketch */}
                  <div
                    style={{
                      backgroundColor: '#11151C',
                      border: '1px solid #3B5B78',
                      borderRadius: '14px',
                      padding: '24px',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                      Painel Digital opensketch
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {[
                        { label: 'Cliente: Carlos', accent: '#3B5B78' },
                        { label: 'Valor: R$ 4.500', accent: '#3B5B78' },
                        { label: 'Margem Protegida', accent: '#10B981' },
                        { label: 'Próximo Passo: Quinta-feira', accent: '#4A7296' },
                      ].map((tag) => (
                        <span
                          key={tag.label}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#090B0E',
                            border: `1px solid ${tag.accent}`,
                            color: '#F8FAFC',
                            fontSize: '13px',
                            fontWeight: 600,
                          }}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. SUA EQUIPE DE ESPECIALISTAS NOS BASTIDORES */}
              <div style={{ marginBottom: '64px', paddingTop: '48px', borderTop: '1px solid #161D27' }}>
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Inteligência Aplicada
                  </div>
                  <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#F8FAFC' }}>
                    Sua Equipe de Especialistas nos Bastidores
                  </h2>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '28px',
                    alignItems: 'start',
                  }}
                >
                  {/* Esquerda: Mock Estático de Atendimento */}
                  <div
                    style={{
                      backgroundColor: '#11151C',
                      border: '1px solid #3B5B78',
                      borderRadius: '16px',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Simulação de Atendimento ao Vivo
                    </div>
                    <div
                      style={{
                        alignSelf: 'flex-end',
                        backgroundColor: '#2C4863',
                        border: '1px solid #4A7296',
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        maxWidth: '90%',
                      }}
                    >
                      “O cliente pediu 15% de desconto, até onde posso ir?”
                    </div>
                    <div
                      style={{
                        backgroundColor: '#090B0E',
                        border: '1px solid #263447',
                        borderRadius: '12px',
                        padding: '14px',
                        fontSize: '13px',
                        color: '#E2E8F0',
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#4A7296', marginBottom: '6px' }}>
                        Mike • Finanças
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        Sua margem segura comporta no máximo <strong>8%</strong> (preço mínimo de R$ 4.140). Ceder 15% comprometeria o lucro líquido da operação.
                      </div>
                      <div style={{ fontWeight: 700, color: '#4A7296', marginBottom: '6px' }}>
                        Lana • Vendas
                      </div>
                      <div>
                        <strong>Argumento pronto:</strong> “Consigo chegar em 8% mantendo entrega prioritária e implantação completa ainda esta semana. Podemos fechar assim?”
                      </div>
                    </div>
                  </div>

                  {/* Direita: Lista dos 7 Especialistas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { name: 'Lana (Vendas)', role: 'Conduz negociações, quebra objeções e entrega argumentos prontos de fechamento.' },
                      { name: 'Mike (Finanças)', role: 'Calcula margem real, preço mínimo e limite seguro antes de qualquer desconto.' },
                      { name: 'Clowe (Marketing)', role: 'Estrutura posicionamento de marca e atração orgânica para o seu segmento.' },
                      { name: 'Lois (Anúncios)', role: 'Organiza campanhas de tráfego pago, segmentação e criativos de conversão.' },
                      { name: 'Lex (Estratégia)', role: 'Planeja metas, expansão comercial e próximos passos de médio prazo.' },
                      { name: 'Alia (Coordenação)', role: 'Orquestra os especialistas certos conforme o contexto da sua pergunta.' },
                      { name: 'Cael (Inteligência)', role: 'Mantém a integridade técnica, organização dos dados e consistência do painel.' },
                    ].map((agent) => (
                      <div
                        key={agent.name}
                        style={{
                          backgroundColor: '#11151C',
                          border: '1px solid #1F2A38',
                          borderRadius: '10px',
                          padding: '12px 16px',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', marginBottom: '2px' }}>
                          {agent.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
                          {agent.role}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. DOIS AMBIENTES EM UMA ÚNICA CONTA */}
              <div style={{ marginBottom: '48px', paddingTop: '48px', borderTop: '1px solid #161D27' }}>
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Separação Total
                  </div>
                  <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#F8FAFC' }}>
                    Dois Ambientes em Uma Única Conta
                  </h2>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '22px',
                  }}
                >
                  {/* Cartão 1: Meu Trabalho */}
                  <div
                    style={{
                      backgroundColor: '#11151C',
                      border: '1px solid #263447',
                      borderRadius: '14px',
                      padding: '26px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Modo Individual
                    </div>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
                      👤 Meu Trabalho
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#94A3B8', fontSize: '14px', lineHeight: 1.9 }}>
                      <li>Organização pessoal de clientes</li>
                      <li>Metas diárias e acompanhamento</li>
                      <li>Anúncios e ideias de divulgação</li>
                      <li>Biblioteca de scripts e caderno digital</li>
                    </ul>
                  </div>

                  {/* Cartão 2: Minha Empresa */}
                  <div
                    style={{
                      backgroundColor: '#11151C',
                      border: '2px solid #4A7296',
                      borderRadius: '14px',
                      padding: '26px',
                      boxShadow: '0 0 32px rgba(74, 114, 150, 0.2)',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Modo Corporativo • Destaque
                    </div>
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
                      🏢 Minha Empresa
                    </h3>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#F8FAFC', fontSize: '14px', lineHeight: 1.9 }}>
                      <li>Tudo do modo individual integrado</li>
                      <li>Prospecção B2B por cidade e estado</li>
                      <li>Inteligência financeira avançada e margem</li>
                      <li>Gestão comercial completa em um só lugar</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 4. FLUXO OPERACIONAL — COMO FUNCIONA: INVESTIGAR. DESENVOLVER. SOLUCIONAR. */}
              <div style={{ marginBottom: '48px', paddingTop: '48px', borderTop: '1px solid #161D27' }}>
                <div style={{ maxWidth: '720px', marginBottom: '32px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                    Fluxo Operacional
                  </div>
                  <h2 style={{ margin: '0 0 14px 0', fontSize: '30px', fontWeight: 800, color: '#F8FAFC' }}>
                    Como Funciona: Investigar. Desenvolver. Solucionar.
                  </h2>
                  <p style={{ margin: 0, fontSize: '16px', color: '#94A3B8', lineHeight: 1.65 }}>
                    Você escolhe seu ambiente de atuação (Meu Trabalho ou Minha Empresa), informa sua profissão e passa a operar com inteligência comercial adaptada ao seu mercado.
                  </p>
                </div>
                <div className="lp-triad-grid">
                  {[
                    {
                      step: '1. Investigar',
                      tag: 'DIAGNÓSTICO & MERCADO',
                      summary:
                        'Transforme anotações soltas e dados brutos de mercado em um radar claro de onde está o dinheiro na sua região e na sua carteira.',
                      inPractice:
                        'Fotografe anotações do caderno físico, cole conversas ou filtre empresas por cidade, estado e segmento.',
                      behindScenes:
                        'Lex mapeia oportunidades de mercado enquanto Mike identifica onde sua margem está escapando.',
                      result:
                        'Lista qualificada de compradores reais antes mesmo do primeiro contato.',
                    },
                    {
                      step: '2. Desenvolver',
                      tag: 'OFERTA & POSICIONAMENTO',
                      summary:
                        'Construa propostas irrecusáveis, anúncios diretos e respostas prontas para cada perfil de comprador sem improvisar na hora H.',
                      inPractice:
                        'Informe o perfil do cliente e o objetivo da negociação para receber a estratégia completa.',
                      behindScenes:
                        'Clowe e Lois estruturam a atração, Lana prepara o fechamento e Mike protege seu preço mínimo.',
                      result:
                        'Abordagens prontas para WhatsApp e e-mail com margem de lucro travada.',
                    },
                    {
                      step: '3. Solucionar',
                      tag: 'FECHAMENTO & ESCALA',
                      summary:
                        'Conduza negociações com domínio total, registre vendas em segundos e transforme esforço diário em previsibilidade de caixa.',
                      inPractice:
                        'Feche o contrato, centralize propostas na biblioteca digital e acompanhe suas metas em tempo real.',
                      behindScenes:
                        'Alia e Cael mantêm todo o histórico conectado entre Meu Trabalho e Minha Empresa.',
                      result:
                        'Carteira organizada, pós-venda ativo e operação escalável sem planilhas paralelas.',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      style={{
                        backgroundColor: '#11151C',
                        border: '1px solid #3B5B78',
                        borderRadius: '14px',
                        padding: '28px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {item.tag}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '21px', fontWeight: 700, color: '#F8FAFC' }}>{item.step}</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#CBD5E1', lineHeight: 1.6 }}>{item.summary}</p>
                      <div style={{ borderTop: '1px solid #1E293B', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#94A3B8', lineHeight: 1.55 }}>
                        <div>
                          <strong style={{ color: '#F8FAFC' }}>• Na prática:</strong> {item.inPractice}
                        </div>
                        <div>
                          <strong style={{ color: '#F8FAFC' }}>• Nos bastidores:</strong> {item.behindScenes}
                        </div>
                        <div>
                          <strong style={{ color: '#4A7296' }}>• Resultado:</strong> {item.result}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DESTAQUE DE DIFERENCIAIS EXCLUSIVOS: O QUE VOCÊ SÓ ENCONTRA NO OPENSKETCH */}
              <div style={{ marginTop: '64px', paddingTop: '56px', borderTop: '1px solid #161D27', marginBottom: '48px' }}>
                <div style={{ maxWidth: '720px', marginBottom: '32px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#4A7296',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '8px',
                    }}
                  >
                    O que você só encontra no opensketch
                  </div>
                  <h2 style={{ margin: '0 0 10px 0', fontSize: '26px', fontWeight: 800, color: '#F8FAFC' }}>
                    Feito Para Proteger Seu Ganho na Vida Real
                  </h2>
                  <p style={{ margin: 0, fontSize: '15px', color: '#94A3B8', lineHeight: 1.6 }}>
                    Nada de telas genéricas que só guardam anotações paradas. Cada recurso trabalha para colocar mais dinheiro no seu bolso em menos tempo.
                  </p>
                </div>

                <div className="lp-modules-grid">
                  {[
                    {
                      badge: 'DIFERENCIAL 1',
                      title: 'Dois modos inteligentes: para quem vende e para quem comanda',
                      body:
                        'Com um clique, o vendedor tem um painel exclusivo para proteger sua comissão, calcular descontos estratégicos de fechamento e bater a meta mensal; enquanto o dono de empresa controla margem real, impostos do seu regime (MEI, Simples, Presumido ou Real) e lucro líquido sem planilhas.',
                    },
                    {
                      badge: 'DIFERENCIAL 2',
                      title: 'Fim do desconto dado no impulso',
                      body:
                        'Antes de fechar qualquer proposta, o sistema avisa na hora o limite seguro de negociação e entrega argumentos prontos para defender seu preço sem perder o cliente.',
                    },
                    {
                      badge: 'DIFERENCIAL 3',
                      title: 'Radar comercial da sua cidade com abordagem pronta',
                      body:
                        'Escolha o segmento e a cidade para descobrir oportunidades reais nos principais polos comerciais da região, já com mensagens personalizadas para iniciar conversa no WhatsApp ou e-mail.',
                    },
                  ].map((diff) => (
                    <div
                      key={diff.title}
                      style={{
                        backgroundColor: '#11151C',
                        border: '1px solid #3B5B78',
                        borderRadius: '14px',
                        padding: '28px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.28)',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#4A7296', letterSpacing: '0.08em' }}>
                        {diff.badge}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.35 }}>
                        {diff.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#CBD5E1', lineHeight: 1.65 }}>
                        {diff.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="lp-cta-primary"
                onClick={() => onNavigate('/cadastro')}
                style={{
                  padding: '13px 26px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Criar Conta e Acessar os Módulos
              </button>
            </div>
          </section>
        )}

        {/* ================= PÁGINA DEDICADA: /blog ================= */}
        {currentRoute === '/blog' && (
          <section style={{ padding: '64px 0 80px' }}>
            <div className="lp-container">
              {/* Cabeçalho Editorial */}
              <div style={{ maxWidth: '720px', marginBottom: '36px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                  ESCORP I.D.S. • INTELIGÊNCIA & ESTRATÉGIA
                </div>
                <h1 style={{ margin: '0 0 14px 0', fontSize: '36px', fontWeight: 800, color: '#F8FAFC' }}>
                  Blog opensketch
                </h1>
                <p style={{ margin: 0, fontSize: '16px', color: '#94A3B8', lineHeight: 1.65 }}>
                  Bastidores de negociação, proteção de margem e operação comercial aplicada
                </p>
              </div>

              {/* Barra Visual de Categorias Estática */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '36px' }}>
                {[
                  { label: 'Todos', active: true },
                  { label: 'Negociação & Vendas', active: false },
                  { label: 'Margem & Finanças', active: false },
                  { label: 'Produtividade & IA', active: false },
                ].map((cat) => (
                  <span
                    key={cat.label}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '999px',
                      fontSize: '13px',
                      fontWeight: cat.active ? 700 : 500,
                      backgroundColor: cat.active ? '#2C4863' : '#11151C',
                      border: cat.active ? '1px solid #4A7296' : '1px solid #263447',
                      color: cat.active ? '#FFFFFF' : '#94A3B8',
                    }}
                  >
                    {cat.label}
                  </span>
                ))}
              </div>

              {/* Grade de 3 Cartões de Artigos Iniciais */}
              <div className="lp-modules-grid" style={{ marginBottom: '44px' }}>
                {[
                  {
                    category: 'Negociação & Vendas',
                    readTime: '5 min de leitura',
                    title: 'Como Responder ao “Vou Pensar” Sem Queimar o Fechamento',
                    summary:
                      'Aprenda a conduzir a conversa para descobrir o bloqueio real do cliente e manter o ritmo comercial sem parecer insistente.',
                  },
                  {
                    category: 'Margem & Finanças',
                    readTime: '6 min de leitura',
                    title: 'O Custo Oculto do Desconto de 10%: Quanto Sobra no Bolso?',
                    summary:
                      'Veja por que ceder desconto no impulso destrói o lucro líquido e como definir seu preço mínimo seguro antes de entrar na reunião.',
                  },
                  {
                    category: 'Produtividade & IA',
                    readTime: '4 min de leitura',
                    title: 'Do Caderno de Papel ao Painel Comercial em Segundos',
                    summary:
                      'Como transformar anotações soltas de reunião em acompanhamento estruturado de clientes, metas e próximas ações.',
                  },
                ].map((post) => (
                  <article
                    key={post.title}
                    style={{
                      backgroundColor: '#11151C',
                      border: '1px solid #263447',
                      borderRadius: '14px',
                      padding: '26px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#4A7296',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {post.category}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                        {post.readTime}
                      </span>
                    </div>
                    <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.4 }}>
                      {post.title}
                    </h2>
                    <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, flex: 1 }}>
                      {post.summary}
                    </p>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#4A7296', paddingTop: '4px' }}>
                      Em breve • Artigo completo
                    </div>
                  </article>
                ))}
              </div>

              {/* NOVOS ARTIGOS PERSUASIVOS DE ALTA CONVERSÃO */}
              <div style={{ marginBottom: '48px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                  Leitura Completa Disponível Agora
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  {[
                    {
                      id: 'A' as const,
                      category: 'Negociação & Margem',
                      readTime: '5 min de leitura',
                      title: 'Como negociar desconto com cliente sem queimar sua comissão (nem o lucro da empresa)',
                      summary:
                        'Entenda a diferença entre ceder preço no desespero e usar um desconto estratégico de fechamento que protege o ganho no modo individual e no modo empresa.',
                    },
                    {
                      id: 'B' as const,
                      category: 'Operação & Produtividade',
                      readTime: '4 min de leitura',
                      title: 'Por que anotar em caderno e usar planilhas soltas faz você perder vendas todos os dias',
                      summary:
                        'Veja o contraste entre ferramentas comuns que só guardam texto parado e uma plataforma que transforma anotações rápidas em cliente ativo, margem protegida e prospecção na mesma tela.',
                    },
                  ].map((art) => {
                    const isOpen = activeBlogArticle === art.id;
                    return (
                      <article
                        key={art.id}
                        style={{
                          backgroundColor: '#11151C',
                          border: isOpen ? '1px solid #4A7296' : '1px solid #263447',
                          borderRadius: '14px',
                          padding: '26px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {art.category}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>
                            {art.readTime}
                          </span>
                        </div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.38 }}>
                          {art.title}
                        </h2>
                        <p style={{ margin: 0, fontSize: '14px', color: '#CBD5E1', lineHeight: 1.6, flex: 1 }}>
                          {art.summary}
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveBlogArticle(isOpen ? null : art.id)}
                          style={{
                            alignSelf: 'flex-start',
                            marginTop: '4px',
                            padding: '9px 16px',
                            borderRadius: '8px',
                            border: '1px solid #4A7296',
                            backgroundColor: isOpen ? '#2C4863' : 'rgba(59, 91, 120, 0.16)',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isOpen ? 'Fechar leitura' : 'Ler artigo completo →'}
                        </button>
                      </article>
                    );
                  })}
                </div>

                {activeBlogArticle && (
                  <article
                    style={{
                      maxWidth: '780px',
                      margin: '32px auto 0',
                      backgroundColor: '#11151C',
                      border: '1px solid #3B5B78',
                      borderRadius: '16px',
                      padding: '32px 28px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                    }}
                  >
                    {activeBlogArticle === 'A' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Negociação & Margem • 5 min de leitura
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveBlogArticle(null)}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                          >
                            ✕ Fechar artigo
                          </button>
                        </div>
                        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.25 }}>
                          Como negociar desconto com cliente sem queimar sua comissão (nem o lucro da empresa)
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15.5px', lineHeight: 1.75, color: '#CBD5E1' }}>
                          <p style={{ margin: 0 }}>
                            Quando o cliente pede desconto na hora do fechamento, quem negocia no susto comete sempre o mesmo erro: corta o preço no chute para não perder a venda. O problema é que cada real cedido sem critério sai direto do ganho — seja da comissão do vendedor, seja do lucro líquido da empresa.
                          </p>
                          <p style={{ margin: 0 }}>
                            A diferença entre ceder no desespero e aplicar um <strong style={{ color: '#F8FAFC' }}>desconto estratégico de fechamento</strong> está em saber, antes de responder, qual é o piso mínimo seguro. Em vez de entregar toda a folga de uma vez, você ancora a conversa em valor e usa apenas a fração necessária para destravar o sim do cliente.
                          </p>
                          <p style={{ margin: 0 }}>
                            É exatamente isso que os dois ambientes do <strong style={{ color: '#F8FAFC' }}>opensketch</strong> resolvem na prática: no modo <strong style={{ color: '#F8FAFC' }}>Meu Trabalho</strong>, o vendedor visualiza na hora sua comissão bruta, o impacto do desconto na comissão líquida, o preço mínimo autorizado e gera uma sugestão pronta de fechamento para bater a meta mensal sem trabalhar de graça. Já no modo <strong style={{ color: '#F8FAFC' }}>Minha Empresa</strong>, o gestor seleciona o regime tributário (MEI, Simples Nacional, Lucro Presumido ou Lucro Real), enxerga a margem real após impostos e trava descontos que destruiriam o caixa.
                          </p>
                        </div>
                        <div style={{ marginTop: '8px', paddingTop: '18px', borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                          <div style={{ fontSize: '14px', color: '#E2E8F0', fontWeight: 600 }}>
                            Pare de perder dinheiro na mesa de negociação. Teste os dois modos na prática.
                          </div>
                          <button
                            type="button"
                            className="lp-cta-primary"
                            onClick={() => onNavigate('/cadastro')}
                            style={{ padding: '11px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Conhecer o opensketch Agora
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Operação & Produtividade • 4 min de leitura
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveBlogArticle(null)}
                            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                          >
                            ✕ Fechar artigo
                          </button>
                        </div>
                        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.25 }}>
                          Por que anotar em caderno e usar planilhas soltas faz você perder vendas todos os dias
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15.5px', lineHeight: 1.75, color: '#CBD5E1' }}>
                          <p style={{ margin: 0 }}>
                            Quantos negócios quentes já esfriaram porque o retorno prometido para quinta-feira ficou perdido numa folha de caderno ou em uma aba esquecida de planilha? Ferramentas comuns apenas guardam texto parado: elas não lembram você de cobrar, não calculam se o preço fecha a conta e não mostram onde estão os próximos compradores.
                          </p>
                          <p style={{ margin: 0 }}>
                            Quando anotação, histórico de cliente, cálculo de margem e prospecção vivem separados, você perde horas montando o quebra-cabeça antes de cada reunião — ou pior, entra na conversa no improviso.
                          </p>
                          <p style={{ margin: 0 }}>
                            No <strong style={{ color: '#F8FAFC' }}>opensketch</strong>, uma anotação rápida ou foto do caderno vira imediatamente registro estruturado na carteira de clientes, conectado ao simulador de comissão ou margem e ao radar comercial da sua cidade. Em uma única tela, você sabe quem abordar, o que falar no WhatsApp e exatamente até onde pode negociar para fechar.
                          </p>
                        </div>
                        <div style={{ marginTop: '8px', paddingTop: '18px', borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                          <div style={{ fontSize: '14px', color: '#E2E8F0', fontWeight: 600 }}>
                            Troque o improviso por uma operação comercial que trabalha por você.
                          </div>
                          <button
                            type="button"
                            className="lp-cta-primary"
                            onClick={() => onNavigate('/cadastro')}
                            style={{ padding: '11px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Conhecer o opensketch Agora
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                )}
              </div>

              {/* 1. ARTIGO PRINCIPAL EM DESTAQUE (Leitura aberta direto na página, sem caixas fechadas) */}
              <article
                style={{
                  maxWidth: '780px',
                  margin: '56px auto 64px',
                  paddingTop: '48px',
                  borderTop: '1px solid #1E293B',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#4A7296',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '12px',
                  }}
                >
                  EDITORIAL EM DESTAQUE • ESTRATÉGIA & MARGEM
                </div>
                <h2
                  style={{
                    margin: '0 0 14px 0',
                    fontSize: 'clamp(26px, 3.2vw, 34px)',
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    color: '#F8FAFC',
                  }}
                >
                  A Regra do Silêncio e da Margem: Por Que Quem Domina a Informação Antes da Reunião Sempre Dita o Preço
                </h2>
                <p
                  style={{
                    margin: '0 0 18px 0',
                    fontSize: '18px',
                    lineHeight: 1.6,
                    color: '#94A3B8',
                  }}
                >
                  Como transformar anotações soltas de campo em vantagem competitiva silenciosa antes mesmo de o cliente abrir a boca.
                </p>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748B',
                    paddingBottom: '28px',
                    marginBottom: '28px',
                    borderBottom: '1px solid #161D27',
                  }}
                >
                  Por <span style={{ color: '#E2E8F0' }}>Julian Escobal & Equipe Editorial ESCORP I.D.S.</span> • 4 min de leitura
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', fontSize: '16px', lineHeight: 1.78, color: '#CBD5E1' }}>
                  <p style={{ margin: 0 }}>
                    A maioria dos vendedores entra em uma negociação confiando apenas na memória e na simpatia. O resultado é previsível: na primeira objeção de preço do comprador, cedem desconto no escuro e entregam o lucro líquido da operação sem perceber.
                  </p>

                  <div>
                    <h3 style={{ margin: '8px 0 10px 0', fontSize: '21px', fontWeight: 700, color: '#F8FAFC' }}>
                      O Poder dos Bastidores Invisíveis
                    </h3>
                    <p style={{ margin: 0 }}>
                      Na negociação comercial, aparentar calma e domínio absoluto não vem do improviso — vem da preparação invisível. Quando você registra cada detalhe da reunião ainda no calor do momento e organiza o histórico do cliente, elimina a ansiedade de responder no impulso.
                    </p>
                  </div>

                  <blockquote
                    style={{
                      margin: '8px 0',
                      padding: '14px 20px',
                      borderLeft: '3px solid #4A7296',
                      backgroundColor: 'rgba(59, 91, 120, 0.1)',
                      color: '#F8FAFC',
                      fontSize: '18px',
                      fontStyle: 'italic',
                      fontWeight: 600,
                      lineHeight: 1.55,
                    }}
                  >
                    “Quem entra na mesa sabendo exatamente até onde a margem aguenta nunca precisa implorar pelo fechamento.”
                  </blockquote>

                  <div>
                    <h3 style={{ margin: '8px 0 10px 0', fontSize: '21px', fontWeight: 700, color: '#F8FAFC' }}>
                      Da Anotação Rápida ao Fechamento Previsível
                    </h3>
                    <p style={{ margin: 0 }}>
                      O papel aceita tudo, mas não avisa quando sua margem está vazando. Ao centralizar anotações de campo, cálculos financeiros e abordagens estratégicas em um único ambiente inteligente, cada contato deixa de ser um palpite e passa a seguir um plano claro até a assinatura.
                    </p>
                  </div>
                </div>
              </article>

              {/* 2. NOTAS RÁPIDAS & PLAYBOOKS DE CAMPO (Lista editorial limpa separada por linhas sutis) */}
              <div
                style={{
                  maxWidth: '780px',
                  margin: '0 auto 64px',
                  paddingTop: '48px',
                  borderTop: '1px solid #1E293B',
                }}
              >
                <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
                  Notas Rápidas de Operação
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    {
                      tag: 'FECHAMENTO',
                      title: 'Nunca responda um pedido de desconto na mesma frase',
                      summary:
                        'Aprenda a pausar a negociação, devolver uma pergunta de valor e proteger sua margem sem criar atrito com o comprador.',
                    },
                    {
                      tag: 'PROSPECÇÃO B2B',
                      title: 'Como filtrar empresas com real capacidade de compra na sua cidade',
                      summary:
                        'Pare de gastar energia com listas frias e foque apenas em operações que já demonstram aderência ao seu ticket.',
                    },
                    {
                      tag: 'ROTINA COMERCIAL',
                      title: 'O hábito de 3 minutos pós-reunião que dobra sua taxa de retorno',
                      summary:
                        'O que registrar imediatamente após sair do cliente para nunca mais esquecer um compromisso ou prazo de proposta.',
                    },
                  ].map((note, idx) => (
                    <div
                      key={note.title}
                      style={{
                        padding: '22px 0',
                        borderTop: idx === 0 ? '1px solid #1E293B' : 'none',
                        borderBottom: '1px solid #1E293B',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#4A7296',
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          marginBottom: '6px',
                        }}
                      >
                        {note.tag}
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.4 }}>
                        {note.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '14.5px', color: '#94A3B8', lineHeight: 1.6 }}>
                        {note.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. ASSINATURA EDITORIAL & CONVITE FINAL */}
              <div
                style={{
                  maxWidth: '780px',
                  margin: '0 auto',
                  paddingTop: '40px',
                  borderTop: '1px solid #1E293B',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.65 }}>
                  <strong style={{ color: '#F8FAFC' }}>Inteligência Aplicada ESCORP I.D.S.</strong> — Análises práticas construídas sobre a metodologia do opensketch e seus especialistas: <span style={{ color: '#CBD5E1' }}>Lana, Mike, Clowe, Lois, Lex, Alia e Cael</span>.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '6px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#F8FAFC' }}>
                    Pronto para aplicar essa estrutura na sua operação diária?
                  </div>
                  <button
                    type="button"
                    className="lp-cta-primary"
                    onClick={() => onNavigate('/cadastro')}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Criar minha conta no opensketch
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= PÁGINA DEDICADA: /planos ================= */}
        {currentRoute === '/planos' && (
          <>
            <section style={{ padding: '64px 0 80px', borderBottom: '1px solid #161D27' }}>
              <div className="lp-container">
                <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                    Planos e Acesso
                  </div>
                  <h1 style={{ margin: '0 0 14px 0', fontSize: '36px', fontWeight: 800, color: '#F8FAFC' }}>
                    Escolha o Modelo Ideal para Crescer
                  </h1>
                  <p style={{ margin: 0, fontSize: '16px', color: '#94A3B8', lineHeight: 1.65 }}>
                    Comece com o essencial mensal ou garanta em pagamento único o acesso vitalício aos ambientes Individual e Corporativo B2B.
                  </p>
                </div>
                <PlansComparisonGrid
                  onSelectPlan={handlePlanClick}
                  checkoutLoadingPlan={checkoutLoadingPlan}
                  checkoutError={checkoutError}
                />
              </div>
            </section>

            {/* 1. SEÇÃO DE PROVA SOCIAL */}
            <section style={{ padding: '72px 0', borderBottom: '1px solid #161D27' }}>
              <div className="lp-container">
                <div style={{ textAlign: 'center', maxWidth: '660px', margin: '0 auto 44px' }}>
                  <h2 style={{ margin: '0 0 12px 0', fontSize: '30px', fontWeight: 800, color: '#F8FAFC' }}>
                    O que dizem quem já opera no controle
                  </h2>
                  <p style={{ margin: 0, fontSize: '15px', color: '#94A3B8', lineHeight: 1.6 }}>
                    Profissionais autônomos e empresas que trocaram o improviso pela inteligência comercial do opensketch
                  </p>
                </div>

                <div className="lp-modules-grid">
                  {[
                    {
                      initials: 'CE',
                      name: 'Carlos Eduardo',
                      role: 'Representante Comercial',
                      quote:
                        'Passei a entrar em cada negociação sabendo exatamente até onde minha margem aguenta. Parei de dar desconto no impulso e meu lucro subiu já no primeiro mês.',
                    },
                    {
                      initials: 'MC',
                      name: 'Mariana Costa',
                      role: 'Consultora B2B',
                      quote:
                        'Fotografo minhas anotações de reunião e em segundos tenho todo o histórico organizado com os próximos passos prontos. Aposentei três cadernos.',
                    },
                    {
                      initials: 'RN',
                      name: 'Rafael Nogueira',
                      role: 'Diretor Comercial',
                      quote:
                        'O modo Minha Empresa mudou nossa prospecção regional. Encontramos compradores qualificados na nossa cidade sem depender de listas frias.',
                    },
                  ].map((item) => (
                    <div
                      key={item.name}
                      style={{
                        backgroundColor: '#11151C',
                        border: '1px solid #263447',
                        borderRadius: '14px',
                        padding: '26px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '20px',
                        position: 'relative',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          top: '16px',
                          right: '20px',
                          fontSize: '32px',
                          lineHeight: 1,
                          fontWeight: 800,
                          color: 'rgba(74, 114, 150, 0.28)',
                        }}
                      >
                        ”
                      </span>
                      <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#CBD5E1', lineHeight: 1.65 }}>
                        “{item.quote}”
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            backgroundColor: '#2C4863',
                            border: '1px solid #4A7296',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {item.initials}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>{item.name}</div>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>{item.role}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 2. FAIXA HORIZONTAL DE CONVERSÃO (LARANJA VIBRANTE DE PONTA A PONTA) */}
            <section
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #C2410C 0%, #EA580C 35%, #F97316 65%, #EA580C 100%)',
                padding: '64px 0',
              }}
            >
              <div className="lp-container" style={{ textAlign: 'center', maxWidth: '760px' }}>
                <h2
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: 'clamp(28px, 4vw, 38px)',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Pronto para transformar suas vendas?
                </h2>
                <p
                  style={{
                    margin: '0 0 28px 0',
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.92)',
                    lineHeight: 1.6,
                  }}
                >
                  Comece hoje no ambiente individual ou libere o acesso vitalício completo em pagamento único.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '22px' }}>
                  <button
                    type="button"
                    onClick={() => handlePlanClick('vitalicio')}
                    style={{
                      padding: '14px 26px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#FFFFFF',
                      color: '#C2410C',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
                    }}
                  >
                    Garantir Acesso Vitalício →
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlanClick('essencial')}
                    style={{
                      padding: '14px 24px',
                      borderRadius: '10px',
                      border: '1.5px solid #FFFFFF',
                      backgroundColor: 'transparent',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Começar no Plano Mensal
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: '18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.92)',
                  }}
                >
                  <span>✓ Acesso imediato</span>
                  <span>✓ Sem fidelidade no mensal</span>
                  <span>✓ Pagamento único sem mensalidade no Vitalício</span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ================= RODAPÉ COMPLETO EM 4 COLUNAS ================= */}
      <footer
        style={{
          borderTop: '1px solid #1E293B',
          backgroundColor: '#090B0E',
          padding: '52px 0 28px',
        }}
      >
        <div className="lp-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '32px',
              paddingBottom: '36px',
              borderBottom: '1px solid #161D27',
            }}
          >
            {/* Coluna 1: Marca */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <img
                src="/assets/opensketch-logo.svg"
                alt="opensketch"
                style={{ height: '28px', width: 'auto', alignSelf: 'flex-start', display: 'block' }}
              />
              <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: 1.6 }}>
                Inteligência comercial e gestão estratégica para transformar anotações e dados em vendas previsíveis.
              </p>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A7296' }}>
                Uma solução ESCORP I.D.S.
              </div>
            </div>

            {/* Coluna 2: Produto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Produto
              </div>
              {[
                { label: 'Início', route: '/' as const },
                { label: 'Recursos', route: '/recursos' as const },
                { label: 'Planos', route: '/planos' as const },
              ].map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => onNavigate(link.route)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    textAlign: 'left',
                    color: '#94A3B8',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Coluna 3: Conteúdo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Conteúdo
              </div>
              {[
                { label: 'Blog', route: '/blog' as const },
                { label: 'Fluxo Operacional', route: '/recursos' as const },
                { label: 'Especialistas', route: '/recursos' as const },
              ].map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => onNavigate(link.route)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    textAlign: 'left',
                    color: '#94A3B8',
                    fontSize: '13.5px',
                    cursor: 'pointer',
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Coluna 4: Legal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Legal
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/privacidade')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  color: '#94A3B8',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Política de Privacidade
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/termos')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  color: '#94A3B8',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Termos de Uso
              </button>
              <a
                href="mailto:suporte@escorpids.com.br"
                style={{
                  color: '#94A3B8',
                  fontSize: '13.5px',
                  textDecoration: 'none',
                }}
              >
                Suporte (suporte@escorpids.com.br)
              </a>
            </div>
          </div>

          <div
            style={{
              paddingTop: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '12.5px',
              color: '#64748B',
            }}
          >
            <span>opensketch • ESCORP IDS</span>
            <span>SUA VISÃO, NOSSO RESULTADO.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const PlansComparisonGrid: React.FC<{
  onSelectPlan: (plan: PlanType) => void;
  checkoutLoadingPlan?: PlanType | null;
  checkoutError?: string | null;
}> = ({ onSelectPlan, checkoutLoadingPlan = null, checkoutError = null }) => (
  <>
    {checkoutError && (
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto 20px auto',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(239, 68, 68, 0.14)',
          border: '1px solid #EF4444',
          color: '#FECACA',
          fontSize: '13.5px',
          textAlign: 'center',
        }}
      >
        {checkoutError}
      </div>
    )}
    <div className="lp-plans-grid">
    {/* CARD 1 — PLANO GRATUITO */}
    <div
      style={{
        backgroundColor: '#11151C',
        border: '1px solid #263447',
        borderRadius: '16px',
        padding: '32px 26px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        Plano Gratuito
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '34px', fontWeight: 800, color: '#F8FAFC' }}>R$ 0,00</span>
        <span style={{ fontSize: '13px', color: '#94A3B8' }}>grátis para começar</span>
      </div>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94A3B8', lineHeight: 1.55 }}>
        Experimente na prática o ambiente <strong style={{ color: '#F8FAFC' }}>Meu Trabalho</strong> com Copiloto IA, Simulador de Comissão e gestão diária.
      </p>
      <ul style={{ margin: '0 0 28px 0', padding: '0 0 0 18px', color: '#CBD5E1', fontSize: '13.5px', lineHeight: 1.9, flex: 1 }}>
        <li>Acesso imediato ao ambiente individual Meu Trabalho</li>
        <li>Simulador de Comissão, Copiloto de IA (5 consultas/dia), Clientes e Metas liberados</li>
        <li>Consulta aos playbooks e materiais salvos na Biblioteca</li>
      </ul>
      <button
        type="button"
        onClick={() => onSelectPlan('gratuito')}
        style={{
          width: '100%',
          padding: '13px',
          borderRadius: '10px',
          border: '1px solid #3B5B78',
          backgroundColor: 'transparent',
          color: '#F8FAFC',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Começar Gratuitamente
      </button>
    </div>

    {/* CARD 2 — PLANO ESSENCIAL MENSAL */}
    <div
      style={{
        backgroundColor: '#11151C',
        border: '1px solid #3B5B78',
        borderRadius: '16px',
        padding: '32px 26px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        Plano Essencial Mensal
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '34px', fontWeight: 800, color: '#F8FAFC' }}>R$ 39,99</span>
        <span style={{ fontSize: '14px', color: '#94A3B8' }}>/ mês</span>
      </div>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94A3B8', lineHeight: 1.55 }}>
        Escolha 1 ambiente completo (<strong style={{ color: '#F8FAFC' }}>Meu Trabalho OU Minha Empresa</strong>) com atualizações contínuas.
      </p>
      <ul style={{ margin: '0 0 28px 0', padding: '0 0 0 18px', color: '#CBD5E1', fontSize: '13.5px', lineHeight: 1.9, flex: 1 }}>
        <li>Escolha 1 ambiente completo (Meu Trabalho ou Minha Empresa)</li>
        <li>Todos os módulos e ferramentas do ambiente escolhido liberados</li>
        <li>Todas as futuras atualizações do seu ambiente incluídas</li>
      </ul>
      <button
        type="button"
        disabled={checkoutLoadingPlan !== null}
        onClick={() => onSelectPlan('essencial')}
        style={{
          width: '100%',
          padding: '13px',
          borderRadius: '10px',
          border: '1px solid #4A7296',
          backgroundColor: '#1E2F42',
          color: '#F8FAFC',
          fontSize: '14px',
          fontWeight: 700,
          cursor: checkoutLoadingPlan ? 'wait' : 'pointer',
        }}
      >
        {checkoutLoadingPlan === 'essencial' ? 'Abrindo Checkout PagBank...' : 'Selecionar Plano Mensal'}
      </button>
    </div>

    {/* CARD 3 — PLANO COMPLETO VITALÍCIO (Destaque Laranja) */}
    <div
      style={{
        backgroundColor: '#11151C',
        border: '2px solid #F97316',
        borderRadius: '16px',
        padding: '32px 26px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 36px rgba(249, 115, 22, 0.22)',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-12px',
          right: '20px',
          backgroundColor: '#EA580C',
          border: '1px solid #FB923C',
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: '999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Mais Vantajoso • Vitalício
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FB923C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        Plano Completo Vitalício
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '34px', fontWeight: 800, color: '#F8FAFC' }}>R$ 119,99</span>
        <span style={{ fontSize: '14px', color: '#94A3B8' }}>pagamento único</span>
      </div>
      <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94A3B8', lineHeight: 1.55 }}>
        Pague uma única vez e libere <strong style={{ color: '#F8FAFC' }}>Meu Trabalho + Minha Empresa</strong> integrados para sempre.
      </p>
      <ul style={{ margin: '0 0 28px 0', padding: '0 0 0 18px', color: '#F8FAFC', fontSize: '13.5px', lineHeight: 1.9, flex: 1 }}>
        <li>Meu Trabalho + Minha Empresa liberados e integrados</li>
        <li>Prospecção B2B multi-polo e Scripts de Abordagem IA</li>
        <li>Todas as futuras atualizações incluídas nos dois ambientes</li>
        <li>Zero mensalidade ou taxas recorrentes</li>
      </ul>
      <button
        type="button"
        disabled={checkoutLoadingPlan !== null}
        onClick={() => onSelectPlan('vitalicio')}
        style={{
          width: '100%',
          padding: '13px',
          borderRadius: '10px',
          border: '1px solid #FB923C',
          backgroundColor: '#EA580C',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: 700,
          cursor: checkoutLoadingPlan ? 'wait' : 'pointer',
        }}
      >
        {checkoutLoadingPlan === 'vitalicio' ? 'Abrindo Checkout PagBank...' : 'Garantir Plano Completo Vitalício'}
      </button>
    </div>
  </div>
  </>
);
