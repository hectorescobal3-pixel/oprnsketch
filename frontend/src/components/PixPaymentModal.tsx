import React, { useEffect, useState } from 'react';
import { validatePaidActivation } from '../services/user-plan-service';

export interface PixPaymentData {
  plan: 'essential_monthly' | 'pro_lifetime';
  amountCents: number;
  referenceId: string;
  orderId?: string;
  pixCopyPaste: string;
  pixQrCodeUrl: string | null;
  pixExpiresAt: string | null;
}

interface PixPaymentModalProps {
  isOpen: boolean;
  data: PixPaymentData | null;
  isAnonymous?: boolean;
  onClose: () => void;
  onActivationConfirmed?: (activationToken: string, email?: string) => void;
  onManualRefresh?: () => Promise<void> | void;
}

function formatRemainingTime(expiresAt: string | null): string {
  if (!expiresAt) return '30:00';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Expirado';
  const totalSec = Math.floor(diffMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  data,
  isAnonymous = true,
  onClose,
  onActivationConfirmed,
  onManualRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<string>(() => formatRemainingTime(data?.pixExpiresAt || null));
  const [checking, setChecking] = useState(false);
  const [statusText, setStatusText] = useState<string>('Aguardando pagamento via PIX...');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!isOpen || !data) return;
    setCopied(false);
    setConfirmed(false);
    setStatusText('Aguardando pagamento via PIX...');
    setCountdown(formatRemainingTime(data.pixExpiresAt));

    const timer = setInterval(() => {
      setCountdown(formatRemainingTime(data.pixExpiresAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, data]);

  useEffect(() => {
    if (!isOpen || !data?.referenceId || !isAnonymous || confirmed) return;

    let cancelled = false;
    const checkStatus = async () => {
      try {
        const res = await validatePaidActivation({ ref: data.referenceId });
        if (!cancelled && res.valid && res.activationToken) {
          setConfirmed(true);
          setStatusText('Pagamento confirmado! Liberando criação da sua conta...');
          setTimeout(() => {
            onActivationConfirmed?.(res.activationToken!, res.email);
          }, 900);
        }
      } catch {
        // segue aguardando webhook
      }
    };

    const poll = setInterval(checkStatus, 4000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [isOpen, data?.referenceId, isAnonymous, confirmed, onActivationConfirmed]);

  if (!isOpen || !data) return null;

  const planTitle =
    data.plan === 'pro_lifetime' ? 'Plano Completo Vitalício' : 'Plano Essencial Mensal';
  const amountFormatted = (data.amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(data.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  const handleVerifyNow = async () => {
    setChecking(true);
    try {
      if (isAnonymous) {
        const res = await validatePaidActivation({ ref: data.referenceId });
        if (res.valid && res.activationToken) {
          setConfirmed(true);
          setStatusText('Pagamento confirmado! Liberando criação da sua conta...');
          onActivationConfirmed?.(res.activationToken, res.email);
          return;
        }
        setStatusText('Pagamento ainda não compensado. Se acabou de pagar, aguarde alguns segundos.');
      } else {
        await onManualRefresh?.();
        setStatusText('Verificação solicitada. Assim que o PagBank confirmar, seus módulos serão liberados automaticamente.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 10, 0.84)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3500,
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
          maxWidth: '480px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '26px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          color: '#F8FAFC',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#93C5FD',
                backgroundColor: 'rgba(59, 91, 120, 0.25)',
                border: '1px solid #3B5B78',
                padding: '3px 10px',
                borderRadius: '999px',
                marginBottom: '8px',
              }}
            >
              Pagamento PIX • PagBank
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#F8FAFC' }}>
              {planTitle}
            </h2>
            <div style={{ marginTop: '4px', fontSize: '14px', color: '#94A3B8' }}>
              Valor: <strong style={{ color: '#F8FAFC', fontSize: '16px' }}>{amountFormatted}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: '#1C1E22',
              border: '1px solid #2D3540',
              color: '#94A3B8',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Countdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: '#0B0E13',
            border: '1px solid #272C34',
            marginBottom: '18px',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#94A3B8' }}>Expira em</span>
          <strong
            style={{
              color: countdown === 'Expirado' ? '#F87171' : '#93C5FD',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '14px',
            }}
          >
            {countdown}
          </strong>
        </div>

        {/* QR Code */}
        {data.pixQrCodeUrl && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '12px',
                borderRadius: '14px',
                border: '2px solid #3B5B78',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              }}
            >
              <img
                src={data.pixQrCodeUrl}
                alt="QR Code PIX PagBank"
                style={{ width: '196px', height: '196px', display: 'block' }}
              />
            </div>
            <span style={{ marginTop: '8px', fontSize: '12px', color: '#94A3B8' }}>
              Aponte a câmera do app do seu banco para o QR Code
            </span>
          </div>
        )}

        {/* Copia e Cola */}
        <div style={{ marginBottom: '18px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: '#CBD5E1',
              marginBottom: '6px',
            }}
          >
            Código PIX Copia e Cola
          </label>
          <textarea
            readOnly
            value={data.pixCopyPaste}
            rows={3}
            onClick={(e) => e.currentTarget.select()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#090B0E',
              border: '1px solid #2D3540',
              borderRadius: '10px',
              padding: '10px 12px',
              color: '#E2E8F0',
              fontSize: '12px',
              fontFamily: 'monospace',
              resize: 'none',
              marginBottom: '10px',
            }}
          />
          <button
            type="button"
            onClick={handleCopyPix}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #4A7296',
              backgroundColor: copied ? '#166534' : '#2C4863',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Código PIX copiado!' : 'Copiar Código PIX'}
          </button>
        </div>

        {/* Status & Manual Verification */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: confirmed ? 'rgba(22, 101, 52, 0.25)' : 'rgba(59, 91, 120, 0.16)',
            border: `1px solid ${confirmed ? '#22C55E' : '#2E475F'}`,
            fontSize: '13px',
            color: '#E2E8F0',
            marginBottom: '14px',
            lineHeight: 1.5,
          }}
        >
          {statusText}
        </div>

        {!confirmed && (
          <button
            type="button"
            disabled={checking}
            onClick={handleVerifyNow}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              border: '1px solid #2D3540',
              backgroundColor: '#1C1E22',
              color: '#CBD5E1',
              fontSize: '13px',
              fontWeight: 600,
              cursor: checking ? 'wait' : 'pointer',
            }}
          >
            {checking ? 'Verificando pagamento...' : 'Já paguei — Verificar status'}
          </button>
        )}
      </div>
    </div>
  );
};
