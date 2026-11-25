import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceContext } from '../components/HeaderNavigation';
import { AppStorage } from '../services/app-storage';
import { escapeHtml } from '../security/sanitizer';

interface PerfilViewProps {
  userEmail: string;
  context: WorkspaceContext;
  theme?: 'dark' | 'light';
  onToggleTheme?: (newTheme: 'dark' | 'light') => void;
}

export const PerfilView: React.FC<PerfilViewProps> = ({
  userEmail,
  context,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isCorporate = context.type === 'CORPORATE';
  const isLight = theme === 'light';

  // Personal fields
  const [fullName, setFullName] = useState('Hector Julian');
  const [username, setUsername] = useState('@hectorjulian');
  const [profession, setProfession] = useState('Consultor de Negócios e Estratégia');
  const [email, setEmail] = useState(userEmail);

  // Images: Cover and Profile Photo
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    const saved = AppStorage.getProfile('PERSONAL');
    if (saved.fullName) setFullName(saved.fullName);
    if (saved.username) setUsername(saved.username);
    if (saved.profession) setProfession(saved.profession);
    if (saved.email) setEmail(saved.email);
    if (saved.coverImage) setCoverImage(saved.coverImage);
    if (saved.profilePhoto) setProfilePhoto(saved.profilePhoto);
  }, []);

  // Safe image compression helper to avoid exceeding localStorage quota
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

  // Cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1200, 400, 0.8);
      setCoverImage(compressed);
      localStorage.setItem('opensketch_profile_cover', compressed);
      showToast('Imagem de capa atualizada com sucesso!');
    } catch {
      alert('Não foi possível carregar a imagem de capa. Tente outra foto.');
    }
  };

  // Profile photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 300, 300, 0.85);
      setProfilePhoto(compressed);
      localStorage.setItem('opensketch_profile_photo', compressed);
      showToast('Foto de perfil atualizada com sucesso!');
    } catch {
      alert('Não foi possível carregar a foto de perfil. Tente outra imagem.');
    }
  };

  // Save personal fields
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('opensketch_profile_name', fullName.trim());
    localStorage.setItem('opensketch_profile_username', username.trim());
    localStorage.setItem('opensketch_profile_profession', profession.trim());
    localStorage.setItem('opensketch_profile_email', email.trim());
    showToast('✓ Seus dados de perfil foram salvos com sucesso!');
  };

  // "Baixar meus dados" - downloads real data from all modules in a clean human-readable HTML format
  const handleDownloadMyData = () => {
    const clients = AppStorage.getClients(context.type);
    const documents = AppStorage.getDocuments(context.type);
    const metas = AppStorage.getMetas(context.type);
    const ads = AppStorage.getAds();

    const dateStr = new Date().toLocaleString('pt-BR');

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Meus Dados — OPENsketch</title>
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
    <h1>Relatório de Dados do Usuário — opensketch (ESCORP IDS)</h1>
    <div class="header-info">
      <div><strong>Nome do Usuário:</strong> ${escapeHtml(fullName)} (${escapeHtml(username)})</div>
      <div><strong>E-mail:</strong> ${escapeHtml(email)}</div>
      <div><strong>Profissão:</strong> ${escapeHtml(profession)}</div>
      <div><strong>Data da Exportação:</strong> ${escapeHtml(dateStr)}</div>
      <div><strong>Ambiente:</strong> ${isCorporate ? 'Minha Empresa' : 'Meu Trabalho'}</div>
    </div>

    <h2>1. Meus Clientes Cadastrados (${clients.length})</h2>
    ${
      clients.length === 0
        ? '<p>Nenhum cliente cadastrado.</p>'
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

    <h2>2. Meus Anúncios e Divulgações (${ads.length})</h2>
    ${
      ads.length === 0
        ? '<p>Nenhum anúncio cadastrado.</p>'
        : `<table>
            <thead>
              <tr>
                <th>Título da Ideia</th>
                <th>Formato</th>
                <th>Ideia de Legenda / Roteiro</th>
                <th>Última Atualização</th>
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
          <th>Ciclo / Período</th>
          <th>Prazo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${escapeHtml(metas.goalTitle || 'Meta Geral de Atividades')}</strong></td>
          <td><strong style="color: #059669; font-size: 16px;">${Math.min(
            100,
            Math.round((metas.realizadoTotal / (metas.metaTotal || 100)) * 100)
          )}%</strong></td>
          <td>${escapeHtml(metas.cycleName)}</td>
          <td>${escapeHtml(metas.deadline)}</td>
        </tr>
      </tbody>
    </table>

    <h2>4. Meus Arquivos na Biblioteca (${documents.length})</h2>
    ${
      documents.length === 0
        ? '<p>Nenhum arquivo na biblioteca.</p>'
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
    a.download = `meus-dados-opensketch-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Arquivo "meus-dados-opensketch.html" baixado com sucesso!');
  };

  const supportEmail = 'escorpsystems@gmail.com';
  const supportSubject = 'Suporte opensketch — Solicitação de Ajuda';
  const supportBody = `Olá, equipe de suporte do opensketch!\n\nPreciso de ajuda com a plataforma. Seguem os detalhes:\n\n- Ambiente utilizado (Meu Trabalho ou Minha Empresa): \n- O que está acontecendo / Minha dúvida: \n\nAguardo retorno. Obrigado(a)!`;
  const supportGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(supportEmail)}&su=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`;

  // Dynamic theme colors
  const bgColor = isLight ? '#F8FAFC' : '#121417';
  const cardBg = isLight ? '#FFFFFF' : '#1C1E22';
  const borderColor = isLight ? '#E2E8F0' : '#272C34';
  const textColor = isLight ? '#0F172A' : '#D9DEE4';
  const mutedText = isLight ? '#64748B' : '#8A96A3';
  const inputBg = isLight ? '#F1F5F9' : '#121417';

  return (
    <div style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Toast Notification */}
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

      {/* Hidden file inputs for cover and photo */}
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

      {/* ================= 1. CABEÇALHO VISUAL: CAPA + FOTO DE PERFIL ================= */}
      <div style={{ position: 'relative', marginBottom: '70px' }}>
        {/* Banner de Capa */}
        <div
          style={{
            width: '100%',
            height: '200px',
            borderRadius: '16px',
            border: `1px solid ${borderColor}`,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: '#1E242C',
            backgroundImage: coverImage
              ? `url(${coverImage})`
              : 'linear-gradient(135deg, #1C232B 0%, #2C4257 60%, #3D5A73 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 4px 18px rgba(0,0,0,0.2)',
          }}
        >
          {/* Botão de Alterar Capa */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            title="Escolha uma imagem do seu computador para a capa"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              backgroundColor: 'rgba(18, 20, 23, 0.75)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
          >
            <span>📷</span>
            <span>Alterar Capa</span>
          </button>
        </div>

        {/* Foto de Perfil sobreposta à capa */}
        <div
          style={{
            position: 'absolute',
            bottom: '-45px',
            left: '32px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '18px',
          }}
        >
          {/* Círculo do Avatar */}
          <div
            style={{
              width: '104px',
              height: '104px',
              borderRadius: '50%',
              backgroundColor: '#3D5A73',
              border: `4px solid ${cardBg}`,
              boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt="Foto de Perfil"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#FFFFFF' }}>
                {fullName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Botão de Trocar Foto e Identificação */}
          <div style={{ marginBottom: '4px' }}>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              title="Escolha uma foto do seu computador"
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <span>📷</span>
              <span>Trocar Foto de Perfil</span>
            </button>
          </div>
        </div>
      </div>

      {/* Identificação Principal do Usuário */}
      <div style={{ marginBottom: '28px', paddingLeft: '8px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 700, color: textColor }}>
          {fullName}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#3D5A73', fontWeight: 600 }}>{username}</span>
          <span style={{ color: mutedText }}>•</span>
          <span style={{ fontSize: '14px', color: mutedText }}>{profession}</span>
          <span style={{ color: mutedText }}>•</span>
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: isCorporate ? 'rgba(61, 90, 115, 0.2)' : 'rgba(16, 185, 129, 0.15)',
              color: isCorporate ? '#3D5A73' : '#10B981',
              fontWeight: 600,
            }}
          >
            {isCorporate ? 'Ambiente Minha Empresa' : 'Ambiente Meu Trabalho'}
          </span>
        </div>
      </div>

      {/* Grid Principal de Conteúdo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        {/* ================= 2. CAMPOS PESSOAIS EDITÁVEIS ================= */}
        <div
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 600, color: textColor }}>
              Meus Dados Pessoais
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: mutedText }}>
              Mantenha suas informações atualizadas para identificação no sistema.
            </p>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Nome Completo */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
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

              {/* Nome de Usuário */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@seunome"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
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

              {/* Profissão / Área de Atuação */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  Profissão / Área de Atuação
                </label>
                <input
                  type="text"
                  required
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Ex: Consultor, Arquiteto, Advogado, Vendedor..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
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

              {/* E-mail de Contato */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: mutedText, marginBottom: '6px' }}>
                  E-mail de Contato
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
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

              {/* Botão Salvar Alterações */}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3D5A73',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 10px rgba(61,90,115,0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>💾</span>
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Coluna Direita: Aparência, Baixar Dados e Suporte */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ================= 3. ALTERNÂNCIA DE CORES (MODO ESCURO / MODO CLARO) ================= */}
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: textColor }}>
              Aparência do Sistema
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: mutedText }}>
              Alterne entre o tema escuro e claro conforme o seu conforto visual.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Opção Modo Escuro */}
              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme('dark')}
                style={{
                  padding: '14px 16px',
                  backgroundColor: !isLight ? '#121417' : '#F1F5F9',
                  border: !isLight ? '2px solid #3D5A73' : `1px solid ${borderColor}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>🌙</span>
                  <strong style={{ fontSize: '14px', color: !isLight ? '#FFFFFF' : '#0F172A' }}>
                    Modo Escuro
                  </strong>
                </div>
                <span style={{ fontSize: '11px', color: mutedText }}>
                  Tons suaves e descanso visual
                </span>
              </button>

              {/* Opção Modo Claro */}
              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme('light')}
                style={{
                  padding: '14px 16px',
                  backgroundColor: isLight ? '#F8FAFC' : '#121417',
                  border: isLight ? '2px solid #2563EB' : `1px solid ${borderColor}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>☀️</span>
                  <strong style={{ fontSize: '14px', color: isLight ? '#0F172A' : '#D9DEE4' }}>
                    Modo Claro
                  </strong>
                </div>
                <span style={{ fontSize: '11px', color: mutedText }}>
                  Alto contraste e leitura nítida
                </span>
              </button>
            </div>
          </div>

          {/* ================= 4. BOTÃO BAIXAR MEUS DADOS ================= */}
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: textColor }}>
              Cópia dos Meus Dados
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: mutedText, lineHeight: '1.4' }}>
              Baixe a qualquer momento um arquivo legível e organizado com todos os seus clientes, anúncios, metas e biblioteca.
            </p>

            <button
              type="button"
              onClick={handleDownloadMyData}
              style={{
                width: '100%',
                padding: '12px 18px',
                backgroundColor: isLight ? '#F1F5F9' : '#121417',
                border: `1px solid ${isLight ? '#CBD5E1' : '#3D5A73'}`,
                color: textColor,
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <span>📥</span>
              <span>Baixar meus dados</span>
            </button>
          </div>

          {/* ================= 5. CANAL DE SUPORTE DIRETO POR E-MAIL ================= */}
          <div
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: textColor }}>
              Precisa de Ajuda? Fale com a Gente
            </h2>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: mutedText, lineHeight: '1.4' }}>
              Nossa equipe está pronta para te atender e tirar qualquer dúvida sobre o uso do OPENsketch.
            </p>

            <div
              style={{
                backgroundColor: inputBg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>✉️</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: textColor }}>
                  {supportEmail}
                </span>
              </div>
            </div>

            <a
              href={supportGmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '36px',
                padding: '0 16px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                borderRadius: '7px',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
            >
              <span>✉️</span>
              <span>Falar com o Suporte</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
