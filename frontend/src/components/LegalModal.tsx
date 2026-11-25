import React, { useState, useEffect } from 'react';

export type LegalTab = 'privacidade' | 'termos';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  isLight?: boolean;
}

export const LegalDocumentContent: React.FC<{ activeTab: LegalTab; isLight?: boolean }> = ({
  activeTab,
  isLight = false,
}) => {
  const headingColor = isLight ? '#0F172A' : '#FFFFFF';
  const textColor = isLight ? '#334155' : '#CBD5E1';
  const mutedColor = isLight ? '#64748B' : '#94A3B8';
  const boxBg = isLight ? '#F8FAFC' : '#16191E';
  const borderColor = isLight ? '#E2E8F0' : '#272C34';

  if (activeTab === 'privacidade') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: textColor, fontSize: '14px', lineHeight: 1.65 }}>
        <div style={{ backgroundColor: boxBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: mutedColor, textTransform: 'uppercase', marginBottom: '4px' }}>
            Controlador Responsável (LGPD)
          </div>
          <div>
            <strong>ESCORP IDS</strong> — Plataforma <strong>opensketch</strong><br />
            Canal oficial de privacidade e atendimento: <strong>suporte@escorpids.com.br</strong>
          </div>
        </div>

        <section>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
            1. Quais dados coletamos
          </h3>
          <p style={{ margin: 0 }}>
            Para que o <strong>opensketch</strong> funcione de forma personalizada para o seu trabalho, coletamos apenas as informações essenciais fornecidas por você:
          </p>
          <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
            <li><strong>Dados de acesso e perfil:</strong> nome, endereço de e-mail e sua profissão ou área de atuação.</li>
            <li><strong>Dados de clientes cadastrados por você:</strong> Nome, CPF, Telefone/WhatsApp e E-mail.</li>
            <li><strong>Fotos ou arquivos enviados opcionalmente no cadastro de clientes:</strong> processados pontualmente apenas para extração automática dos dados e do contexto do cliente, com descarte imediato do arquivo original após a leitura (sem retenção do arquivo bruto).</li>
            <li><strong>Conteúdo operacional:</strong> anúncios, metas, documentos da biblioteca e mensagens enviadas ao assistente de Inteligência Artificial.</li>
          </ul>
        </section>

        <section>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
            2. Como utilizamos esses dados
          </h3>
          <p style={{ margin: 0 }}>
            Seus dados são usados exclusivamente para operar as ferramentas da plataforma, adaptar o Copiloto IA e os modelos de anúncios à sua profissão e apoiar sua prospecção comercial. <strong>Não vendemos, não alugamos e não compartilhamos seus dados com terceiros para fins publicitários.</strong>
          </p>
        </section>

        <section>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
            3. Isolamento entre Meu Trabalho e Minha Empresa
          </h3>
          <p style={{ margin: 0 }}>
            A plataforma mantém separação total entre os ambientes <strong>Meu Trabalho</strong> (individual) e <strong>Minha Empresa</strong> (corporativo). Clientes, conversas com a IA, arquivos e configurações de um perfil nunca são misturados com o outro.
          </p>
        </section>

        <section>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
            4. Seus direitos, exportação e exclusão (LGPD)
          </h3>
          <p style={{ margin: 0 }}>
            Você tem controle total sobre suas informações. A qualquer momento, na tela de <strong>Configurações</strong>, você pode baixar uma cópia completa dos seus dados ou encerrar individualmente o perfil <strong>Meu Trabalho</strong>, o perfil <strong>Minha Empresa</strong> ou sua conta inteira — removendo imediatamente os registros armazenados. Para dúvidas ou solicitações adicionais sobre privacidade, escreva para <strong>suporte@escorpids.com.br</strong>.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: textColor, fontSize: '14px', lineHeight: 1.65 }}>
      <div style={{ backgroundColor: boxBg, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '14px 16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: mutedColor, textTransform: 'uppercase', marginBottom: '4px' }}>
          Identificação da Plataforma
        </div>
        <div>
          <strong>opensketch</strong> — Operado por <strong>ESCORP IDS</strong><br />
          Suporte oficial: <strong>suporte@escorpids.com.br</strong>
        </div>
      </div>

      <section>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
          1. Aceitação e objetivo do serviço
        </h3>
        <p style={{ margin: 0 }}>
          Ao acessar ou utilizar o <strong>opensketch</strong>, você concorda com estes Termos de Uso. A plataforma oferece ferramentas de organização de clientes, metas, biblioteca de documentos, criação de anúncios, prospecção comercial e assistência por Inteligência Artificial.
        </p>
      </section>

      <section>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
          2. Responsabilidade sobre os dados cadastrados
        </h3>
        <p style={{ margin: 0 }}>
          Você é integralmente responsável pela veracidade, legalidade e autorização de uso dos dados de clientes, documentos e imagens que cadastrar nos ambientes <strong>Meu Trabalho</strong> e <strong>Minha Empresa</strong>, comprometendo-se a manter suas credenciais de acesso em sigilo.
        </p>
      </section>

      <section>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
          3. Uso adequado da Inteligência Artificial, Franquia Justa e Prospecção
        </h3>
        <p style={{ margin: 0 }}>
          Os recursos de Inteligência Artificial e o módulo de prospecção B2B devem ser utilizados de forma ética, profissional e em conformidade com a legislação brasileira, sendo proibido o uso da plataforma para envio de spam abusivo, automação massiva ou tentativas de violação de segurança. Para garantir estabilidade e uso justo a todos os usuários, a franquia mensal inclusa nos servidores da plataforma é de até <strong>150 consultas de IA por mês no Plano Completo Vitalício</strong> (nos ambientes Meu Trabalho e Minha Empresa) e até <strong>100 consultas de IA por mês no Plano Essencial Mensal</strong> (exclusivo para Meu Trabalho), com limite técnico de até 1.500 caracteres por solicitação, 700 tokens por resposta e até 10 requisições por minuto (30 por dia).
        </p>
      </section>

      <section>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: headingColor }}>
          4. Suporte, encerramento e atualizações
        </h3>
        <p style={{ margin: 0 }}>
          Você pode encerrar qualquer perfil ou sua conta completa a qualquer momento em <strong>Configurações</strong>. Em caso de dúvidas técnicas, sugestões ou solicitações de suporte, entre em contato diretamente pelo e-mail <strong>suporte@escorpids.com.br</strong>. A <strong>ESCORP IDS</strong> poderá atualizar estes termos para refletir melhorias na plataforma, mantendo a versão vigente sempre acessível nesta página.
        </p>
      </section>
    </div>
  );
};

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'privacidade',
  onClose,
  isLight = false,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const cardBg = isLight ? '#FFFFFF' : '#1C1E22';
  const borderColor = isLight ? '#E2E8F0' : '#272C34';
  const textColor = isLight ? '#0F172A' : '#D9DEE4';
  const mutedText = isLight ? '#64748B' : '#8A96A3';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="responsive-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '16px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
          overflow: 'hidden',
        }}
      >
        {/* Header com Abas e Botão Fechar */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('privacidade')}
              style={{
                height: '34px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: activeTab === 'privacidade' ? '1px solid #3D5A73' : `1px solid ${borderColor}`,
                backgroundColor: activeTab === 'privacidade' ? '#3D5A73' : 'transparent',
                color: activeTab === 'privacidade' ? '#FFFFFF' : mutedText,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Política de Privacidade
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('termos')}
              style={{
                height: '34px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: activeTab === 'termos' ? '1px solid #3D5A73' : `1px solid ${borderColor}`,
                backgroundColor: activeTab === 'termos' ? '#3D5A73' : 'transparent',
                color: activeTab === 'termos' ? '#FFFFFF' : mutedText,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Termos de Uso
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              height: '34px',
              width: '34px',
              borderRadius: '7px',
              border: `1px solid ${borderColor}`,
              backgroundColor: 'transparent',
              color: textColor,
              fontSize: '16px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
          <LegalDocumentContent activeTab={activeTab} isLight={isLight} />
        </div>

        {/* Rodapé com Botão Claro de Fechar */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: `1px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '12px', color: mutedText }}>
            ESCORP IDS • opensketch
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '34px',
              padding: '6px 16px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: '#3D5A73',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export const PublicLegalPage: React.FC<{ initialTab: LegalTab }> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#121417',
        color: '#D9DEE4',
        padding: '32px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '20px',
            marginBottom: '24px',
            borderBottom: '1px solid #272C34',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/assets/opensketch-logo.svg" alt="opensketch" style={{ height: '28px', width: 'auto' }} />
            <span style={{ fontSize: '13px', color: '#8A96A3', fontWeight: 600 }}>ESCORP IDS</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('privacidade');
                window.history.pushState({}, '', '/privacidade');
              }}
              style={{
                height: '34px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: activeTab === 'privacidade' ? '1px solid #3D5A73' : '1px solid #272C34',
                backgroundColor: activeTab === 'privacidade' ? '#3D5A73' : '#1C1E22',
                color: activeTab === 'privacidade' ? '#FFFFFF' : '#8A96A3',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Política de Privacidade
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('termos');
                window.history.pushState({}, '', '/termos');
              }}
              style={{
                height: '34px',
                padding: '6px 14px',
                borderRadius: '7px',
                border: activeTab === 'termos' ? '1px solid #3D5A73' : '1px solid #272C34',
                backgroundColor: activeTab === 'termos' ? '#3D5A73' : '#1C1E22',
                color: activeTab === 'termos' ? '#FFFFFF' : '#8A96A3',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Termos de Uso
            </button>
            <a
              href="/"
              style={{
                height: '34px',
                padding: '0 14px',
                borderRadius: '7px',
                border: '1px solid #272C34',
                backgroundColor: 'transparent',
                color: '#D9DEE4',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              ← Voltar ao App
            </a>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1C1E22',
            border: '1px solid #272C34',
            borderRadius: '16px',
            padding: '28px',
          }}
        >
          <h1 style={{ margin: '0 0 18px 0', fontSize: '22px', fontWeight: 700, color: '#FFFFFF' }}>
            {activeTab === 'privacidade' ? 'Política de Privacidade (LGPD)' : 'Termos de Uso'}
          </h1>
          <LegalDocumentContent activeTab={activeTab} isLight={false} />
        </div>
      </div>
    </div>
  );
};
