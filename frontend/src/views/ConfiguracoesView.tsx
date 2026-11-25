import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceContext } from '../components/HeaderNavigation';
import { AppStorage, UserProfileData, normalizeWorkspaceEnv } from '../services/app-storage';
import { sanitizeAndCompressImage } from '../security/file-security';
import { sanitizePlainText, sanitizeEmail, sanitizePhone, escapeHtml } from '../security/sanitizer';
import { LegalModal, LegalTab } from '../components/LegalModal';
import { AiConversationalService } from '../services/ai-conversational-service';
import { getFirebaseAuthClient } from '../services/firebase-client';

interface ConfiguracoesViewProps {
  context: WorkspaceContext;
  onSwitchContext: (newContext: WorkspaceContext) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: (newTheme: 'dark' | 'light') => void;
  userEmail: string;
  isOwner?: boolean;
  onDeactivateCurrentProfile?: () => void;
  onTerminateFullAccount?: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  context,
  onSwitchContext,
  theme = 'dark',
  onToggleTheme,
  userEmail,
  isOwner = false,
  onDeactivateCurrentProfile,
  onTerminateFullAccount,
}) => {
  const isCorporate = context.type === 'CORPORATE';
  const isLight = theme === 'light';
  const currentEnv = normalizeWorkspaceEnv(context.type);
  const currentLabel = isCorporate ? 'Minha Empresa' : 'Meu Trabalho';
  const otherLabel = isCorporate ? 'Meu Trabalho' : 'Minha Empresa';
  const otherType = isCorporate ? 'PERSONAL' : 'CORPORATE';
  const isOtherActive = AppStorage.isOnboardingCompleted(otherType);

  // Modal de confirmação de encerramento (50+)
  const [confirmModalMode, setConfirmModalMode] = useState<'NONE' | 'PROFILE' | 'FULL_ACCOUNT'>('NONE');
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);

  // Profile data state
  const [profile, setProfile] = useState<UserProfileData>({
    fullName: isCorporate ? 'Minha Empresa Ltda' : 'Hector Julian',
    username: isCorporate ? '@minhaempresa' : '@hectorjulian',
    profession: isCorporate ? 'Soluções Corporativas' : 'Consultor de Negócios e Estratégia',
    email: userEmail,
    coverImage: null,
    profilePhoto: null,
  });

  // Toast Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // BYOK Gemini API Key & Monthly AI Quota State
  const [userGeminiKey, setUserGeminiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('opensketch_user_gemini_key') || '';
    } catch {
      return '';
    }
  });
  const [hasSavedByokKey, setHasSavedByokKey] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('opensketch_user_gemini_key')?.trim());
    } catch {
      return false;
    }
  });
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [aiQuota, setAiQuota] = useState<{
    plan: 'free' | 'essential_monthly' | 'pro_lifetime';
    used: number;
    limit: number;
    remaining: number;
    resetMonth: string;
    byokActive: boolean;
  }>({
    plan: 'pro_lifetime',
    used: 0,
    limit: 150,
    remaining: 150,
    resetMonth: '',
    byokActive: false,
  });

  useEffect(() => {
    let mounted = true;
    AiConversationalService.fetchAiQuotaStatus().then((q) => {
      if (mounted) setAiQuota(q);
    });
    return () => {
      mounted = false;
    };
  }, [hasSavedByokKey, context.type]);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Reload profile whenever the active workspace context changes
  useEffect(() => {
    const loaded = AppStorage.getProfile(context.type);
    const authEmail = getFirebaseAuthClient()?.currentUser?.email || userEmail || '';
    const isPlaceholderEmail =
      !loaded.email?.trim() ||
      loaded.email === 'hector.julian@escorp.systems' ||
      loaded.email === 'contato@minhaempresa.com.br';
    setProfile({
      ...loaded,
      email: isPlaceholderEmail && authEmail ? authEmail : loaded.email,
    });
  }, [context.type, userEmail]);

  // Image compression helper
  const compressImage = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality = 0.82
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Cover image change with Security Armor
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await sanitizeAndCompressImage(file, 1200, 0.8);
      const updated = { ...profile, coverImage: compressed };
      setProfile(updated);
      AppStorage.saveProfile(context.type, updated);
      showToast('✓ Imagem de capa validada e protegida com sucesso!');
    } catch (err: any) {
      alert(err?.message || 'Arquivo não permitido. Envie apenas fotos válidas JPG, PNG ou WEBP.');
    }
  };

  // Profile photo change with Security Armor
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await sanitizeAndCompressImage(file, 300, 0.85);
      const updated = { ...profile, profilePhoto: compressed };
      setProfile(updated);
      AppStorage.saveProfile(context.type, updated);
      showToast('✓ Foto de perfil validada e protegida com sucesso!');
    } catch (err: any) {
      alert(err?.message || 'Arquivo não permitido. Envie apenas fotos válidas JPG, PNG ou WEBP.');
    }
  };

  // Save profile fields with sanitization
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedProfile: UserProfileData = {
      ...profile,
      fullName: sanitizePlainText(profile.fullName) || (isCorporate ? 'Minha Empresa' : 'Meu Trabalho'),
      username: sanitizePlainText(profile.username) || '@usuario',
      profession: sanitizePlainText(profile.profession),
      segment: profile.segment ? sanitizePlainText(profile.segment) : undefined,
      phone: profile.phone ? sanitizePhone(profile.phone) : undefined,
      email: sanitizeEmail(profile.email) || userEmail,
    };
    setProfile(sanitizedProfile);
    AppStorage.saveProfile(context.type, sanitizedProfile);
    showToast(
      `✓ Dados salvos com sucesso em "${isCorporate ? 'Minha Empresa' : 'Meu Trabalho'}"!`
    );
  };

  // "Baixar meus dados" - downloads exclusively active environment data
  const handleDownloadActiveData = () => {
    const clients = AppStorage.getClients(context.type);
    const documents = AppStorage.getDocuments(context.type);
    const metas = AppStorage.getMetas(context.type);
    const ads = AppStorage.getAds(context.type);
    const dateStr = new Date().toLocaleString('pt-BR');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Meus Dados (${isCorporate ? 'Minha Empresa' : 'Meu Trabalho'}) — opensketch</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1E293B; background: #F8FAFC; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; background: #FFFFFF; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    h1 { color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 20px; font-size: 26px; }
    h2 { color: #1E40AF; margin-top: 32px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 24px; font-size: 14px; }
    th, td { border: 1px solid #E2E8F0; padding: 10px 14px; text-align: left; }
    th { background-color: #F1F5F9; color: #475569; font-weight: 600; }
    .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: #E0E7FF; color: #3730A3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Relatório de Dados — opensketch (ESCORP IDS)</h1>
    <div class="header-info">
      <div><strong>Ambiente de Origem:</strong> ${isCorporate ? 'Minha Empresa (Corporativo)' : 'Meu Trabalho (Individual)'}</div>
      <div><strong>Nome do Perfil:</strong> ${escapeHtml(profile.fullName)} (${escapeHtml(profile.username)})</div>
      <div><strong>E-mail:</strong> ${escapeHtml(profile.email)}</div>
      <div><strong>Profissão / Ramo:</strong> ${escapeHtml(profile.profession)}</div>
      <div><strong>Data de Exportação:</strong> ${escapeHtml(dateStr)}</div>
    </div>

    <h2>1. Clientes Cadastrados (${clients.length})</h2>
    ${
      clients.length === 0
        ? '<p>Nenhum cliente cadastrado neste ambiente.</p>'
        : `<table>
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Documento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${clients
                .map(
                  (c) => `
                <tr>
                  <td><strong>${escapeHtml(c.name)}</strong></td>
                  <td>${escapeHtml(c.phone || '-')}</td>
                  <td>${escapeHtml(c.email || '-')}</td>
                  <td>${escapeHtml(c.documentTaxId || '-')}</td>
                  <td><span class="badge">${escapeHtml(c.status)}</span></td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
    }

    <h2>2. Anúncios e Criativos (${ads.length})</h2>
    ${
      ads.length === 0
        ? '<p>Nenhum anúncio cadastrado neste ambiente.</p>'
        : `<table>
            <thead>
              <tr>
                <th>Título da Ideia</th>
                <th>Formato</th>
                <th>Legenda / Roteiro</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${ads
                .map(
                  (a) => `
                <tr>
                  <td><strong>${escapeHtml(a.title)}</strong></td>
                  <td>${escapeHtml(a.aspectRatioLabel || a.format)}</td>
                  <td>${escapeHtml(a.caption || '-')}</td>
                  <td>${escapeHtml(a.lastUpdated)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
    }

    <h2>3. Progresso e Metas do Trabalho</h2>
    <table>
      <thead>
        <tr>
          <th>Objetivo Ativo</th>
          <th>Progresso Concluído</th>
          <th>Ciclo</th>
          <th>Prazo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${escapeHtml(metas.goalTitle || 'Meta Geral')}</strong></td>
          <td><strong style="color: #059669; font-size: 16px;">${Math.min(
            100,
            Math.round((metas.realizadoTotal / (metas.metaTotal || 100)) * 100)
          )}%</strong></td>
          <td>${escapeHtml(metas.cycleName)}</td>
          <td>${escapeHtml(metas.deadline)}</td>
        </tr>
      </tbody>
    </table>

    <h2>4. Arquivos na Biblioteca (${documents.length})</h2>
    ${
      documents.length === 0
        ? '<p>Nenhum arquivo na biblioteca deste ambiente.</p>'
        : `<table>
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Nome do Arquivo</th>
                <th>Categoria</th>
                <th>Tamanho</th>
                <th>Data de Inclusão</th>
              </tr>
            </thead>
            <tbody>
              ${documents
                .map(
                  (d) => `
                <tr>
                  <td>${escapeHtml(d.id)}</td>
                  <td><strong>${escapeHtml(d.fileName)}</strong></td>
                  <td>${escapeHtml(d.category)}</td>
                  <td>${(d.fileSizeBytes / 1024).toFixed(1)} KB</td>
                  <td>${escapeHtml(d.uploadedAt)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
    }
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meus-dados-opensketch-${currentEnv}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ Arquivo "meus-dados-opensketch-${currentEnv}.html" baixado!`);
  };

  const supportEmail = 'escorpsystems@gmail.com';
  const supportSubject = 'Suporte opensketch — Solicitação de Ajuda';
  const supportBody = `Olá, equipe de suporte do opensketch!\n\nPreciso de ajuda com a plataforma. Seguem os detalhes:\n\n- Ambiente utilizado (Meu Trabalho ou Minha Empresa): \n- O que está acontecendo / Minha dúvida: \n\nAguardo retorno. Obrigado(a)!`;
  const supportGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

  // Theme styling helpers
  const cardBg = isLight ? '#FFFFFF' : '#1C1E22';
  const borderColor = isLight ? '#E2E8F0' : '#272C34';
  const textColor = isLight ? '#0F172A' : '#D9DEE4';
  const mutedText = isLight ? '#64748B' : '#8A96A3';
  const inputBg = isLight ? '#F1F5F9' : '#121417';

  return (
    <div className="responsive-view-container" style={{ flex: 1, overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            backgroundColor: isLight ? '#FFFFFF' : '#1C1E22',
            border: '1px solid #10B981',
            borderRadius: '10px',
            padding: '14px 22px',
            color: isLight ? '#0F172A' : '#D9DEE4',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ color: '#10B981', fontSize: '18px' }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleCoverUpload}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 700, color: textColor }}>
            Configurações e Perfil
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: mutedText }}>
            Centralize suas preferências, edite os dados do seu perfil e gerencie suas configurações com segurança.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '880px' }}>
        {/* ================= 1. IDENTIDADE VISUAL: CAPA E FOTO DE PERFIL ================= */}
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            padding: '24px 28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 600, color: textColor }}>
            Foto de Perfil e Imagem de Capa ({isCorporate ? 'Minha Empresa' : 'Meu Trabalho'})
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: mutedText }}>
            Personalize a imagem de capa e a foto deste ambiente. As fotos ficam salvas exclusivamente aqui.
          </p>

          {/* Banner de Capa */}
          <div style={{ position: 'relative', marginBottom: '60px' }}>
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '14px',
                border: `1px solid ${borderColor}`,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: isCorporate ? '#1B2430' : '#1A2228',
                backgroundImage: profile.coverImage
                  ? `url(${profile.coverImage})`
                  : isCorporate
                  ? 'linear-gradient(135deg, #1C232B 0%, #253342 60%, #3D5A73 100%)'
                  : 'linear-gradient(135deg, #1C232B 0%, #203831 60%, #10B981 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                title="Escolha uma imagem do computador para a capa deste ambiente"
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  backgroundColor: 'rgba(18, 20, 23, 0.75)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📷</span>
                <span>Alterar Capa</span>
              </button>
            </div>

            {/* Foto de Perfil sobreposta */}
            <div
              style={{
                position: 'absolute',
                bottom: '-40px',
                left: '24px',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '94px',
                  height: '94px',
                  borderRadius: '50%',
                  backgroundColor: isCorporate ? '#3D5A73' : '#2C4257',
                  border: `4px solid ${cardBg}`,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {profile.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt="Foto de Perfil"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF' }}>
                    {profile.fullName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                title="Escolha uma foto para este ambiente"
                style={{
                  backgroundColor: isLight ? '#FFFFFF' : '#1C1E22',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <span>📷</span>
                <span>Trocar Foto de Perfil</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= 3. DADOS PESSOAIS E CADASTRAIS ================= */}
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            padding: '24px 28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 600, color: textColor }}>
            Dados Cadastrais do Perfil
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: mutedText }}>
            Informações salvas e apresentadas exclusivamente no contexto de {isCorporate ? 'Minha Empresa' : 'Meu Trabalho'}.
          </p>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  Nome Completo / Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    color: textColor,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  Nome de Usuário (@)
                </label>
                <input
                  type="text"
                  required
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    color: textColor,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  {isCorporate ? 'Atividade Principal da Empresa' : 'Profissão / Ocupação Principal'}
                </label>
                <input
                  type="text"
                  required
                  value={profile.profession}
                  onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
                  placeholder={isCorporate ? 'Ex: Comércio e Varejo, Tecnologia...' : 'Ex: Consultor, Arquiteto, Advogado...'}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    color: textColor,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  Área de Atuação / Segmento
                </label>
                <input
                  type="text"
                  required
                  value={profile.segment || ''}
                  onChange={(e) => setProfile({ ...profile, segment: e.target.value })}
                  placeholder="Ex: Atendimento e Vendas Diretas, Execução de Projetos..."
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    color: textColor,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    color: textColor,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(11) 98765-4321"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    backgroundColor: inputBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    color: textColor,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: 'fit-content',
                height: '34px',
                padding: '6px 14px',
                backgroundColor: '#3D5A73',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(61,90,115,0.2)',
              }}
            >
              <span>💾</span>
              <span>Salvar Dados do Perfil</span>
            </button>
          </form>
        </div>

        {/* ================= 4. APARÊNCIA, CÓPIA DE DADOS E SUPORTE ================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Aparência */}
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '16px',
              padding: '22px 24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: textColor }}>
                Aparência do Sistema
              </h2>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: mutedText }}>
                Escolha o tema com alto contraste e máximo conforto para a visão.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme('dark')}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: !isLight ? '#121417' : '#F1F5F9',
                  border: !isLight ? '1.5px solid #3D5A73' : `1px solid ${borderColor}`,
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: !isLight ? '#FFFFFF' : '#0F172A',
                }}
              >
                <span>🌙</span>
                <span>Modo Escuro</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme('light')}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: isLight ? '#F8FAFC' : '#121417',
                  border: isLight ? '1.5px solid #2563EB' : `1px solid ${borderColor}`,
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isLight ? '#0F172A' : '#D9DEE4',
                }}
              >
                <span>☀️</span>
                <span>Modo Claro</span>
              </button>
            </div>
          </div>

          {/* Baixar Dados */}
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '16px',
              padding: '22px 24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: textColor }}>
                Cópia dos Meus Dados
              </h2>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: mutedText, lineHeight: '1.4' }}>
                Baixe um arquivo organizado contendo exclusivamente os registros deste ambiente ativo ({isCorporate ? 'Empresa' : 'Individual'}).
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadActiveData}
              style={{
                width: 'fit-content',
                height: '34px',
                padding: '6px 14px',
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📥</span>
              <span>Baixar meus dados</span>
            </button>
          </div>
        </div>

        {/* ================= 5. SUPORTE DIRETO POR E-MAIL ================= */}
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            padding: '22px 28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: textColor }}>
            Precisa de Ajuda? Fale com a Gente
          </h2>
          <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: mutedText }}>
            Nossa equipe oficial de atendimento está à disposição para tirar qualquer dúvida sobre a plataforma.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: inputBg,
                padding: '6px 14px',
                borderRadius: '7px',
                border: `1px solid ${borderColor}`,
                height: '34px',
              }}
            >
              <span style={{ fontSize: '15px' }}>✉️</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: textColor }}>
                {supportEmail}
              </span>
            </div>

            <a
              href={supportGmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: '34px',
                padding: '0 14px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>✉️</span>
              <span>Falar com o Suporte</span>
            </a>
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: `1px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '12px', color: mutedText }}>
              Documentos Legais & LGPD (ESCORP IDS):
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setLegalModalTab('privacidade')}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: inputBg,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🛡️</span>
                <span>Política de Privacidade</span>
              </button>
              <button
                type="button"
                onClick={() => setLegalModalTab('termos')}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: inputBg,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📄</span>
                <span>Termos de Uso</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= 5.5. FRANQUIA MENSAL DE IA & CHAVE PRÓPRIA (BYOK - EXCLUSIVO OWNER) ================= */}
        {isOwner && (
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            padding: '24px 28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: textColor }}>
              Consumo de IA & Chave Própria (BYOK)
            </h2>
            <span
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: hasSavedByokKey ? 'rgba(16, 185, 129, 0.14)' : 'rgba(59, 91, 120, 0.2)',
                border: hasSavedByokKey ? '1px solid #10B981' : '1px solid #4A7296',
                color: hasSavedByokKey ? '#10B981' : textColor,
              }}
            >
              {hasSavedByokKey
                ? 'Uso Ilimitado Ativo (Chave Própria)'
                : `${aiQuota.remaining}/${aiQuota.limit} consultas IA este mês`}
            </span>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: mutedText, lineHeight: 1.55 }}>
            Seu plano atual ({aiQuota.plan === 'essential_monthly' ? 'Essencial Mensal — 100/mês' : 'Completo Vitalício — 150/mês'}) inclui franquia mensal gerenciada nos servidores do opensketch. Se desejar uso ilimitado por conta própria, informe abaixo sua chave da API do Google Gemini — ela será usada diretamente sem descontar da sua franquia mensal.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={userGeminiKey}
              onChange={(e) => setUserGeminiKey(e.target.value)}
              placeholder="Cole sua chave Google Gemini (ex: AIzaSy...)"
              style={{
                flex: '1 1 280px',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: inputBg,
                color: textColor,
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey((v) => !v)}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                backgroundColor: 'transparent',
                color: textColor,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showGeminiKey ? 'Ocultar' : 'Mostrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                const trimmed = userGeminiKey.trim();
                if (!/^AIza[0-9A-Za-z_-]{20,80}$/.test(trimmed)) {
                  showToast('Informe uma chave Google Gemini válida (começando com AIza...).');
                  return;
                }
                try {
                  localStorage.setItem('opensketch_user_gemini_key', trimmed);
                  setHasSavedByokKey(true);
                  showToast('✓ Chave Gemini própria salva! Uso ilimitado sem consumir cota do servidor.');
                } catch {
                  showToast('Não foi possível salvar a chave localmente.');
                }
              }}
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #4A7296',
                backgroundColor: '#2C4863',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Salvar Chave
            </button>
            {hasSavedByokKey && (
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('opensketch_user_gemini_key');
                  } catch {}
                  setUserGeminiKey('');
                  setHasSavedByokKey(false);
                  showToast('Chave própria removida. Voltando para a franquia mensal do servidor.');
                }}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: '1px solid #E11D48',
                  backgroundColor: 'transparent',
                  color: isLight ? '#BE123C' : '#FDA4AF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Remover Chave
              </button>
            )}
          </div>
        </div>
        )}

        {/* ================= 6. ENCERRAMENTO DE PERFIL OU CONTA ================= */}
        <div
          style={{
            backgroundColor: cardBg,
            border: isLight ? '1px solid #FECACA' : '1px solid rgba(225, 29, 72, 0.45)',
            borderRadius: '16px',
            padding: '24px 28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ margin: '0 0 6px 0', fontSize: '17px', fontWeight: 600, color: isLight ? '#9F1239' : '#FDA4AF' }}>
            Gerenciamento & Encerramento de Perfil
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: mutedText, lineHeight: 1.5 }}>
            Você pode desativar apenas o perfil <strong>{currentLabel}</strong> mantendo o outro ambiente preservado, ou encerrar a sua conta por completo.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Encerrar Perfil Individual / Corporativo Atual */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>
                  Encerrar perfil {currentLabel}
                </div>
                <div style={{ fontSize: '13px', color: mutedText, lineHeight: 1.4 }}>
                  {isOtherActive
                    ? `Desativa exclusivamente o ambiente ${currentLabel}. Você continuará operando normalmente em ${otherLabel}.`
                    : `Desativa e limpa os dados locais de ${currentLabel}, retornando à tela inicial de seleção de ambiente.`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmModalMode('PROFILE')}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: isLight ? '#FFF1F2' : '#2C141B',
                  border: '1px solid #E11D48',
                  color: isLight ? '#BE123C' : '#FDA4AF',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Encerrar perfil {currentLabel}
              </button>
            </div>

            {/* Encerrar Conta Completa */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
              }}
            >
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: textColor, marginBottom: '4px' }}>
                  Encerrar conta completa
                </div>
                <div style={{ fontSize: '13px', color: mutedText, lineHeight: 1.4 }}>
                  Remove todos os dados armazenados de Meu Trabalho e Minha Empresa e encerra sua sessão no opensketch.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmModalMode('FULL_ACCOUNT')}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: '#E11D48',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Encerrar Conta Completa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL DE CONFIRMAÇÃO ACESSÍVEL (50+) ================= */}
      {confirmModalMode !== 'NONE' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
        >
          <div
            className="responsive-modal-card"
            style={{
              backgroundColor: cardBg,
              border: '1px solid #E11D48',
              borderRadius: '16px',
              padding: '28px 24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.65)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: textColor }}>
                {confirmModalMode === 'PROFILE'
                  ? `Encerrar perfil ${currentLabel}?`
                  : 'Encerrar conta completa?'}
              </h2>
            </div>

            <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: mutedText, lineHeight: 1.6 }}>
              {confirmModalMode === 'PROFILE' ? (
                isOtherActive ? (
                  <>
                    O perfil <strong>{currentLabel}</strong> será desativado e seus dados locais serão apagados. Você continuará operando normalmente em <strong>{otherLabel}</strong>, que permanece ativo e intacto.
                  </>
                ) : (
                  <>
                    O perfil <strong>{currentLabel}</strong> será desativado e seus dados locais serão apagados. Como não há outro perfil ativo no momento, você voltará para a tela inicial de seleção de ambiente.
                  </>
                )
              ) : (
                <>
                  Todos os seus dados locais de <strong>Meu Trabalho</strong> e <strong>Minha Empresa</strong> serão permanentemente apagados e sua sessão será encerrada. Esta ação não pode ser desfeita.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setConfirmModalMode('NONE')}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const mode = confirmModalMode;
                  setConfirmModalMode('NONE');
                  if (mode === 'PROFILE') {
                    onDeactivateCurrentProfile?.();
                  } else {
                    onTerminateFullAccount?.();
                  }
                }}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: '#E11D48',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {confirmModalMode === 'PROFILE' ? `Sim, Encerrar ${currentLabel}` : 'Sim, Encerrar Conta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LegalModal
        isOpen={legalModalTab !== null}
        initialTab={legalModalTab || 'privacidade'}
        onClose={() => setLegalModalTab(null)}
        isLight={isLight}
      />
    </div>
  );
};
