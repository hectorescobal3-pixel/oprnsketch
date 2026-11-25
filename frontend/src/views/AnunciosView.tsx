import React, { useState, useEffect } from 'react';
import { WorkspaceContext } from '../components/HeaderNavigation';
import { AppStorage, AdItem } from '../services/app-storage';
import { sanitizeAndCompressImage } from '../security/file-security';
import { sanitizePlainText } from '../security/sanitizer';

interface AnunciosViewProps {
  context?: WorkspaceContext;
}

export const AnunciosView: React.FC<AnunciosViewProps> = ({ context }) => {
  const scope = context?.type || 'PERSONAL';
  const [ads, setAds] = useState<AdItem[]>([]);
  const [activeFormatFilter, setActiveFormatFilter] = useState<'TODOS' | AdItem['format']>('TODOS');
  const [notification, setNotification] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formFormat, setFormFormat] = useState<AdItem['format']>('9:16');
  const [formCaption, setFormCaption] = useState('');
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  const profile = AppStorage.getProfile(scope);
  const currentProfession = profile.profession || (scope === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho');

  const getTailoredAdTemplate = (prof: string) => {
    const p = (prof || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (p.includes('imove') || p.includes('imobil') || p.includes('corretor')) {
      return {
        title: 'Oportunidade Exclusiva: Imóvel Pronto para Morar',
        caption: 'Buscando o imóvel dos seus sonhos com condições facilitadas de financiamento? Confira esta oportunidade única e agende uma visita guiada comigo hoje mesmo via WhatsApp!',
      };
    }
    if (p.includes('odonto') || p.includes('dent') || p.includes('saude')) {
      return {
        title: 'Avaliação Odontológica & Saúde do Sorriso',
        caption: 'Sua saúde bucal em primeiro lugar! Agende sua avaliação preventiva com atendimento humanizado e tecnologia moderna. Vagas limitadas para esta semana!',
      };
    }
    if (p.includes('advoc') || p.includes('jurid')) {
      return {
        title: 'Assessoria Jurídica Preventiva & Contratos',
        caption: 'Proteja a segurança jurídica e financeira do seu patrimônio com consultoria especializada e preventiva. Entre em contato para um diagnóstico inicial.',
      };
    }
    if (p.includes('consult')) {
      return {
        title: 'Diagnóstico Empresarial: Otimização de Processos e Custos',
        caption: 'Sua empresa pode render mais com menos desperdício. Implemente um plano estratégico prático para elevar sua margem de lucro. Fale conosco!',
      };
    }
    return {
      title: `Serviços Especializados em ${prof || 'Atendimento de Qualidade'}`,
      caption: `Soluções completas e atendimento diferenciado com foco em resultados reais para você e seu negócio. Entre em contato e solicite um orçamento sem compromisso!`,
    };
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    setAds(AppStorage.getAds(scope));
  }, [scope]);

  const handleOpenCreateModal = () => {
    setEditingAd(null);
    setFormTitle('');
    setFormFormat('9:16');
    setFormCaption('');
    setFormImagePreview(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ad: AdItem) => {
    setEditingAd(ad);
    setFormTitle(ad.title);
    setFormFormat(ad.format);
    setFormCaption(ad.caption || '');
    setFormImagePreview(ad.imageUrl || null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    try {
      const compressedDataUrl = await sanitizeAndCompressImage(file, 480, 0.65);
      setFormImagePreview(compressedDataUrl);
      showToast('✓ Imagem validada e protegida com sucesso.');
    } catch (err: any) {
      console.warn('OPENsketch File Armor: Upload bloqueado por segurança:', err);
      alert(err?.message || 'Arquivo não permitido ou inválido. Envie apenas fotos JPG, PNG ou WEBP.');
      setFormImagePreview(null);
      if (e.target) e.target.value = '';
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSubmitAd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanTitle = sanitizePlainText(formTitle);
    if (!cleanTitle) {
      alert('Por favor, informe o título da sua ideia ou anúncio.');
      return;
    }

    setIsSaving(true);

    try {
      const formatLabels: Record<AdItem['format'], string> = {
        '9:16': 'Stories / Reels (Vídeo em pé no celular)',
        '1:1': 'Feed do Instagram / Facebook (Foto quadrada)',
        '16:9': 'Vídeo / YouTube (Deitado)',
      };

      const adToSave: AdItem = {
        id: editingAd ? editingAd.id : `AD-${Date.now().toString().slice(-4)}`,
        title: cleanTitle,
        format: formFormat,
        caption: sanitizePlainText(formCaption),
        imageUrl: formImagePreview || undefined,
        lastUpdated: new Date().toLocaleDateString('pt-BR'),
        aspectRatioLabel: formatLabels[formFormat],
        status: 'APROVADO',
      };

      // Save to AppStorage (persisted in localStorage with safety fallback)
      const updated = AppStorage.saveAd(scope, adToSave);
      setAds([...updated]);

      // Close modal immediately
      setIsModalOpen(false);
      setIsSaving(false);

      // Provide immediate feedback toast
      showToast(
        editingAd
          ? '✓ Alterações no anúncio salvas com sucesso!'
          : '✓ Novo anúncio adicionado à sua lista com sucesso!'
      );
    } catch (error) {
      console.error('Falha ao salvar anúncio:', error);
      setIsSaving(false);
      alert('Não foi possível salvar o anúncio. Tente novamente sem a imagem.');
    }
  };

  const handleDeleteAd = (adId: string, adTitle: string) => {
    if (window.confirm(`Deseja remover o anúncio "${adTitle}" da sua lista?`)) {
      const updated = AppStorage.deleteAd(scope, adId);
      setAds(updated);
      showToast('✓ Anúncio removido da lista.');
    }
  };

  const filteredAds = ads.filter((ad) => {
    if (activeFormatFilter === 'TODOS') return true;
    return ad.format === activeFormatFilter;
  });

  return (
    <div className="responsive-view-container" style={{ flex: 1, overflowY: 'auto', boxSizing: 'border-box', position: 'relative' }}>
      {/* Toast de Feedback Imediato */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#1C1E22',
            border: '1px solid #10B981',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            color: '#D9DEE4',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: '#10B981', fontSize: '18px' }}>✓</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Header Acolhedor */}
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
          <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 600, color: '#D9DEE4' }}>
            Meus Anúncios e Criativos
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#8A96A3' }}>
            Organize suas ideias de fotos, vídeos e textos para divulgar seu trabalho e atrair mais clientes.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            padding: '12px 22px',
            minHeight: '44px',
            backgroundColor: '#3D5A73',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          <span>Criar Novo Anúncio</span>
        </button>
      </div>

      {/* Filtro simples por formato */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '6px' }}>
        {[
          { id: 'TODOS', label: 'Todos os Criativos' },
          { id: '9:16', label: '📱 Stories / Reels (Em pé)' },
          { id: '1:1', label: '🖼️ Feed (Quadrado)' },
          { id: '16:9', label: '💻 Vídeos (Deitado)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFormatFilter(tab.id as any)}
            style={{
              padding: '10px 18px',
              minHeight: '40px',
              whiteSpace: 'nowrap',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: activeFormatFilter === tab.id ? '#3D5A73' : '#272C34',
              backgroundColor: activeFormatFilter === tab.id ? '#2C4257' : '#1C1E22',
              color: activeFormatFilter === tab.id ? '#D9DEE4' : '#8A96A3',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid de Cards de Anúncios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {filteredAds.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: '#1C1E22',
              borderRadius: '16px',
              border: '1px solid #272C34',
              color: '#8A96A3',
            }}
          >
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>📢</span>
            <div style={{ fontSize: '17px', color: '#D9DEE4', fontWeight: 600, marginBottom: '6px' }}>
              Nenhum criativo cadastrado neste formato
            </div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Clique no botão acima para adicionar uma nova ideia de postagem ou divulgação.
            </p>
          </div>
        ) : (
          filteredAds.map((ad) => (
            <div
              key={ad.id}
              style={{
                backgroundColor: '#1C1E22',
                border: '1px solid #272C34',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3D5A73')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#272C34')}
            >
              <div>
                {/* Formato de Mídia */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#121417',
                      border: '1px solid #272C34',
                      color: '#D9DEE4',
                    }}
                  >
                    {ad.format === '9:16' ? '📱 Stories / Reels' : ad.format === '1:1' ? '🖼️ Feed Quadrado' : '💻 Vídeo'}
                  </span>

                  <span style={{ fontSize: '12px', color: '#8A96A3' }}>{ad.lastUpdated}</span>
                </div>

                {/* Imagem/Arte se houver */}
                {ad.imageUrl && (
                  <div
                    style={{
                      marginBottom: '16px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      maxHeight: '180px',
                      border: '1px solid #272C34',
                      backgroundColor: '#121417',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                {/* Título da Ideia */}
                <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600, color: '#D9DEE4' }}>
                  {ad.title}
                </h3>

                {/* Ideia da Legenda / Copy */}
                {ad.caption && (
                  <div
                    style={{
                      backgroundColor: '#121417',
                      border: '1px solid #272C34',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      color: '#C3CAD2',
                      fontStyle: 'italic',
                    }}
                  >
                    "{ad.caption}"
                  </div>
                )}
              </div>

              {/* Ações Simples */}
              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1px solid #272C34',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  onClick={() => handleOpenEditModal(ad)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#121417',
                    border: '1px solid #3D5A73',
                    borderRadius: '6px',
                    color: '#D9DEE4',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Editar Ideia
                </button>
                <button
                  onClick={() => handleDeleteAd(ad.id, ad.title)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#1E1417',
                    border: '1px solid #E11D48',
                    borderRadius: '6px',
                    color: '#FDA4AF',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= MODAL TOTALMENTE CORRIGIDO E FUNCIONAL ================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
            zIndex: 2000,
          }}
        >
          <div
            className="responsive-modal-card"
            style={{
              backgroundColor: '#1C1E22',
              border: '1px solid #3D5A73',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: 'calc(100% - 24px)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#D9DEE4' }}>
                {editingAd ? 'Editar Anúncio' : 'Nova Ideia de Anúncio'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#8A96A3', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAd}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 1. Título do Criativo */}
                <div>
                  <label style={simpleLabelStyle}>
                    Título da Ideia ou Anúncio <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Promoção Especial de Fim de Ano"
                    style={simpleInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const tpl = getTailoredAdTemplate(currentProfession);
                      setFormTitle(tpl.title);
                      setFormCaption(tpl.caption);
                      showToast(`✨ Ideia sugerida sob medida para ${currentProfession}!`);
                    }}
                    style={{
                      marginTop: '8px',
                      backgroundColor: 'rgba(61, 90, 115, 0.25)',
                      border: '1px dashed #3D5A73',
                      color: '#93C5FD',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>✨ Sugerir Ideia para {currentProfession}</span>
                  </button>
                </div>

                {/* 2. Formato de Mídia */}
                <div>
                  <label style={simpleLabelStyle}>Onde você vai postar?</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as any)}
                    style={simpleInputStyle}
                  >
                    <option value="9:16">📱 Stories / Reels (Vídeo em pé no celular)</option>
                    <option value="1:1">🖼️ Feed do Instagram / Facebook (Foto quadrada)</option>
                    <option value="16:9">💻 Vídeo / YouTube (Deitado)</option>
                  </select>
                </div>

                {/* 3. Ideia do Texto / Legenda */}
                <div>
                  <label style={simpleLabelStyle}>Ideia do Texto ou Legenda para Postar</label>
                  <textarea
                    rows={3}
                    value={formCaption}
                    onChange={(e) => setFormCaption(e.target.value)}
                    placeholder="Escreva aqui o que você quer falar na postagem ou o recado para o cliente..."
                    style={{ ...simpleInputStyle, resize: 'vertical' }}
                  />
                </div>

                {/* 4. Anexar Foto ou Arte (Opcional, com compressão automática) */}
                <div>
                  <label style={simpleLabelStyle}>Foto ou Arte do Anúncio (Opcional)</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      backgroundColor: '#121417',
                      border: '1px dashed #3D5A73',
                      borderRadius: '8px',
                      color: '#D9DEE4',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <span>📷</span>
                    <span>
                      {isCompressingImage
                        ? 'Otimizando imagem...'
                        : formImagePreview
                        ? 'Trocar Imagem Selecionada'
                        : 'Escolher Foto do Computador'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      disabled={isCompressingImage}
                      onChange={handleImageUpload}
                    />
                  </label>

                  {formImagePreview && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={formImagePreview}
                        alt="Prévia"
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                      <span style={{ fontSize: '13px', color: '#10B981' }}>✓ Foto pronta e otimizada</span>
                      <button
                        type="button"
                        onClick={() => setFormImagePreview(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#FDA4AF',
                          fontSize: '12px',
                          cursor: 'pointer',
                          marginLeft: 'auto',
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões Grandes e Claros */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '12px 20px',
                    minHeight: '44px',
                    backgroundColor: 'transparent',
                    border: '1px solid #272C34',
                    color: '#8A96A3',
                    borderRadius: '8px',
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isCompressingImage}
                  onClick={(e) => handleSubmitAd(e)}
                  style={{
                    padding: '12px 24px',
                    minHeight: '44px',
                    backgroundColor: isSaving ? '#2C4257' : '#3D5A73',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: isSaving ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{isSaving ? 'Salvando...' : 'Salvar Anúncio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const simpleLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: '#D9DEE4',
  marginBottom: '8px',
};

const simpleInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  backgroundColor: '#121417',
  border: '1px solid #272C34',
  borderRadius: '8px',
  color: '#D9DEE4',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};
