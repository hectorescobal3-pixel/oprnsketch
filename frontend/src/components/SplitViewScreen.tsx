import React, { useState } from 'react';
import { ExtractedInvoiceData } from '../types/invoice';
import { isSafeMediaUrl } from '../security/sanitizer';

interface SplitViewScreenProps {
  documentImageUrl: string;
  initialData: ExtractedInvoiceData;
  onConfirmSale: (data: ExtractedInvoiceData) => void | Promise<void>;
  onCancel: () => void;
}

export const SplitViewScreen: React.FC<SplitViewScreenProps> = ({
  documentImageUrl,
  initialData,
  onConfirmSale,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ExtractedInvoiceData>(initialData);
  const [submitting, setSubmitting] = useState(false);

  const safeImageUrl =
    documentImageUrl.startsWith('/') || isSafeMediaUrl(documentImageUrl)
      ? documentImageUrl
      : '';

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirmSale(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
        padding: '24px',
        flex: 1,
        overflowY: 'auto',
        backgroundColor: '#F8FAFC',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
          Documento Original
        </div>
        {safeImageUrl ? (
          <img
            src={safeImageUrl}
            alt="Documento para conferência"
            style={{ width: '100%', maxHeight: '520px', objectFit: 'contain', borderRadius: '8px' }}
          />
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Pré-visualização indisponível para este formato de mídia.
          </div>
        )}
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
          Conferência de Dados Extraídos
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
          Emitente / Cliente
          <input
            type="text"
            value={formData.issuer_name}
            onChange={(e) => setFormData({ ...formData, issuer_name: e.target.value })}
            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
          Número do Documento
          <input
            type="text"
            value={formData.invoice_number}
            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
          Valor Total (R$)
          <input
            type="number"
            step="0.01"
            value={formData.total_amount}
            onChange={(e) =>
              setFormData({ ...formData, total_amount: Number(e.target.value) || 0 })
            }
            style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
          />
        </label>

        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              flex: 2,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Confirmando...' : 'Confirmar Registro'}
          </button>
        </div>
      </div>
    </div>
  );
};
