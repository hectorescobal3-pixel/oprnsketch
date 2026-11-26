import React, { useEffect, useState } from 'react';
import { createPagBankCheckout, SubscriptionPlan } from '../services/user-plan-service';
import { PixPaymentModal, PixPaymentData } from './PixPaymentModal';

interface UpgradeCheckoutModalProps {
  isOpen: boolean;
  currentPlan: SubscriptionPlan;
  initialHighlightPlan?: 'essential_monthly' | 'pro_lifetime';
  lockedFeatureName?: string | null;
  userName?: string;
  onClose: () => void;
}

export const UpgradeCheckoutModal: React.FC<UpgradeCheckoutModalProps> = ({
  isOpen,
  currentPlan,
  initialHighlightPlan = 'pro_lifetime',
  lockedFeatureName,
  userName,
  onClose,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<'essential_monthly' | 'pro_lifetime' | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPixData(null);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (plan: 'essential_monthly' | 'pro_lifetime') => {
    setLoadingPlan(plan);
    setStatusMessage(null);
    setPixData(null);
    try {
      const result = await createPagBankCheckout(plan, userName);
      if (result.pixCopyPaste) {
        setPixData({
          plan: result.plan,
          amountCents: result.amountCents,
          referenceId: result.referenceId,
          orderId: result.orderId || result.checkoutId,
          pixCopyPaste: result.pixCopyPaste,
          pixQrCodeUrl: result.pixQrCodeUrl || null,
          pixExpiresAt: result.pixExpiresAt || null,
        });
      } else if (result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer');
        setStatusMessage(
          'Checkout PagBank aberto em nova aba. Assim que o pagamento for confirmado, seus módulos serão destravados automaticamente aqui na tela.'
        );
      } else {
        setStatusMessage(
          result.message ||
            'Não foi possível gerar a cobrança PIX no PagBank. Tente novamente em instantes.'
        );
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Erro ao iniciar checkout PagBank.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3200,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#11151C',
          border: '1px solid #3B5B78',
          borderRadius: '18px',
          maxWidth: '840px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
          color: '#F8FAFC',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Desbloquear Recursos • Pagamento Seguro PagBank
            </div>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, color: '#F8FAFC' }}>
              {lockedFeatureName
                ? `Libere "${lockedFeatureName}" agora`
                : 'Escolha seu plano no opensketch'}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#94A3B8', lineHeight: 1.5 }}>
              Plano atual: <strong style={{ color: '#F8FAFC' }}>{currentPlan === 'free' ? 'Gratuito (Meu Trabalho Base)' : currentPlan === 'essential_monthly' ? 'Essencial Mensal' : 'Completo Vitalício'}</strong>. Assim que o pagamento for confirmado, os cadeados abrem em tempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de upgrade"
            style={{
              backgroundColor: '#1E252F',
              border: '1px solid #334155',
              color: '#F8FAFC',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        {statusMessage && (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 91, 120, 0.22)',
              border: '1px solid #4A7296',
              color: '#F8FAFC',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            <div>{statusMessage}</div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '18px',
          }}
        >
          {/* Plano Essencial Mensal */}
          <div
            style={{
              backgroundColor: '#090B0E',
              border: initialHighlightPlan === 'essential_monthly' ? '2px solid #4A7296' : '1px solid #263447',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px' }}>
              Plano Essencial • Mensal
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
              <span style={{ fontSize: '30px', fontWeight: 800, color: '#F8FAFC' }}>R$ 39,99</span>
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>/mês</span>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
              Destrava 100% do ambiente <strong style={{ color: '#F8FAFC' }}>Meu Trabalho</strong>, incluindo os 2 módulos extras:
            </p>
            <ul style={{ margin: '0 0 20px 0', paddingLeft: '18px', fontSize: '13px', color: '#E2E8F0', lineHeight: 1.8, flex: 1 }}>
              <li>Prospecção & Mercado B2B (leads + IA)</li>
              <li>Biblioteca & Playbooks Comerciais</li>
              <li>Até 100 consultas de IA/mês</li>
            </ul>
            <button
              type="button"
              disabled={loadingPlan !== null || currentPlan === 'essential_monthly' || currentPlan === 'pro_lifetime'}
              onClick={() => handleCheckout('essential_monthly')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '9px',
                border: '1px solid #3B5B78',
                backgroundColor: currentPlan === 'essential_monthly' ? '#1E293B' : 'transparent',
                color: '#F8FAFC',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loadingPlan || currentPlan !== 'free' ? 'not-allowed' : 'pointer',
              }}
            >
              {currentPlan === 'essential_monthly'
                ? 'Plano Ativo'
                : loadingPlan === 'essential_monthly'
                ? 'Gerando checkout PagBank...'
                : 'Assinar Plano Essencial (R$ 39,99/mês)'}
            </button>
          </div>

          {/* Plano Completo Vitalício */}
          <div
            style={{
              backgroundColor: '#090B0E',
              border: '2px solid #4A7296',
              borderRadius: '14px',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 0 28px rgba(74, 114, 150, 0.22)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4A7296', textTransform: 'uppercase', marginBottom: '6px' }}>
              Plano Completo Vitalício • Pagamento Único
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
              <span style={{ fontSize: '30px', fontWeight: 800, color: '#F8FAFC' }}>R$ 119,99</span>
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>único</span>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
              Libera tudo sem mensalidade: <strong style={{ color: '#F8FAFC' }}>Meu Trabalho completo + Minha Empresa completo</strong>.
            </p>
            <ul style={{ margin: '0 0 20px 0', paddingLeft: '18px', fontSize: '13px', color: '#F8FAFC', lineHeight: 1.8, flex: 1 }}>
              <li>Tudo do Plano Essencial em Meu Trabalho</li>
              <li>Ambiente Minha Empresa + Gestão B2B</li>
              <li>Centro de Inteligência Financeira & Margem</li>
              <li>Até 150 consultas IA/mês + atualizações futuras</li>
            </ul>
            <button
              type="button"
              disabled={loadingPlan !== null || currentPlan === 'pro_lifetime'}
              onClick={() => handleCheckout('pro_lifetime')}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '9px',
                border: '1px solid #4A7296',
                backgroundColor: '#2C4863',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                cursor: loadingPlan || currentPlan === 'pro_lifetime' ? 'not-allowed' : 'pointer',
              }}
            >
              {currentPlan === 'pro_lifetime'
                ? 'Plano Vitalício Ativo'
                : loadingPlan === 'pro_lifetime'
                ? 'Gerando checkout PagBank...'
                : 'Desbloquear Vitalício (R$ 119,99)'}
            </button>
          </div>
        </div>
      </div>

      <PixPaymentModal
        isOpen={Boolean(pixData)}
        data={pixData}
        isAnonymous={false}
        onClose={() => setPixData(null)}
        onManualRefresh={() => {
          onClose();
        }}
      />
    </div>
  );
};
