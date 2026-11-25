import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceContext } from '../components/HeaderNavigation';
import { AppStorage, LibraryDocument, LibraryCategory } from '../services/app-storage';
import { isSafeMediaUrl, sanitizePlainText } from '../security/sanitizer';
import { AiConversationalService } from '../services/ai-conversational-service';
import { SubscriptionPlan } from '../services/user-plan-service';

const READY_PLAYBOOKS = [
  {
    id: 'pb-objecao',
    title: 'Quebra de Objeção: "Vou Pensar"',
    agent: 'Lana • Vendas',
    text: 'Perfeito! Só para eu te ajudar a decidir com clareza: o que falta validar hoje — é o investimento, o prazo de entrega ou algum detalhe técnico? Posso ajustar um ponto agora mesmo.',
  },
  {
    id: 'pb-preco',
    title: 'Defesa de Preço Sem Queimar Margem',
    agent: 'Lana • Vendas + Mike',
    text: 'Nosso valor já inclui implementação completa, acompanhamento dedicado e garantia de entrega. Em vez de reduzir o escopo, consigo manter o valor cheio e facilitar a entrada para você começar ainda esta semana.',
  },
  {
    id: 'pb-proposta',
    title: 'Follow-up Executivo Pós-Proposta',
    agent: 'Lana • Vendas',
    text: 'Olá! Passando para confirmar se a proposta ficou clara. Se aprovarmos hoje, já reservamos a agenda de implantação para esta semana. Posso enviar o link de fechamento?',
  },
];

interface BibliotecaViewProps {
  context: WorkspaceContext;
  userPlan?: SubscriptionPlan;
  isOwner?: boolean;
  onRequestUpgrade?: (requiredPlan: 'essential_monthly' | 'pro_lifetime', featureName: string) => void;
}

export const BibliotecaView: React.FC<BibliotecaViewProps> = ({
  context,
  userPlan = 'free',
  isOwner = false,
  onRequestUpgrade,
}) => {
  const isFreeReadOnly = !isOwner && userPlan === 'free';
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | LibraryCategory>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null);

  // Rename & Preview Modal State
  const [docToRename, setDocToRename] = useState<LibraryDocument | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Playbooks Comerciais & IA State
  const [playbookTopic, setPlaybookTopic] = useState('');
  const [generatedPlaybook, setGeneratedPlaybook] = useState<string | null>(null);
  const [isGeneratingPlaybook, setIsGeneratingPlaybook] = useState(false);

  const handleGeneratePlaybook = async () => {
    if (isFreeReadOnly) {
      onRequestUpgrade?.('essential_monthly', 'Criar Novos Playbooks na Biblioteca');
      return;
    }
    const topic = playbookTopic.trim();
    if (!topic) return;
    setIsGeneratingPlaybook(true);
    try {
      const res = await AiConversationalService.generateResponse(
        `Lana • Vendas, crie um script comercial pronto e objetivo (para copiar e enviar) sobre: ${topic}`,
        context.type,
        []
      );
      setGeneratedPlaybook(res.text);
    } finally {
      setIsGeneratingPlaybook(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    setDocuments(AppStorage.getDocuments(context.type));
  }, [context.type]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getCategoryLabel = (cat: LibraryCategory): string => {
    switch (cat) {
      case 'IMAGE':
        return 'Imagem / Fotografia';
      case 'VIDEO':
        return 'Vídeo';
      case 'PDF':
        return 'Documento PDF';
      default:
        return 'Arquivo';
    }
  };

  const getCategoryIcon = (cat: LibraryCategory): string => {
    switch (cat) {
      case 'IMAGE':
        return '🖼️';
      case 'VIDEO':
        return '🎬';
      case 'PDF':
        return '📕';
      default:
        return '📄';
    }
  };

  // ================= ABERTURA SEGURA EM MODAL REACT NATIVO =================
  const openDedicatedViewer = (doc: LibraryDocument) => {
    setPreviewDoc(doc);
  };

  const handleDownloadDocument = (doc: LibraryDocument) => {
    if (!isSafeMediaUrl(doc.contentDataUrl)) {
      showToast('⚠️ Conteúdo original indisponível localmente. Faça novo envio do arquivo.');
      return;
    }
    const a = document.createElement('a');
    a.href = doc.contentDataUrl!;
    a.download = sanitizePlainText(doc.fileName) || 'arquivo';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ================= UPLOAD DE ARQUIVOS (ÚNICO OU MÚLTIPLO) =================
  const handleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let processed = 0;
    const addedDocs: LibraryDocument[] = [];
    let invalidCount = 0;

    Array.from(files).forEach((file) => {
      // Validate category: exclusively IMAGE, VIDEO, or PDF
      let category: LibraryCategory | null = null;
      if (file.type.startsWith('image/')) {
        category = 'IMAGE';
      } else if (file.type.startsWith('video/')) {
        category = 'VIDEO';
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        category = 'PDF';
      }

      if (!category) {
        invalidCount++;
        processed++;
        if (processed === files.length) {
          finishUpload(addedDocs, invalidCount);
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;

        const newDoc: LibraryDocument = {
          id: `ARQ-${Math.floor(100 + Math.random() * 900)}`,
          fileName: file.name,
          category,
          mimeType: file.type || (category === 'PDF' ? 'application/pdf' : category === 'VIDEO' ? 'video/mp4' : 'image/png'),
          fileSizeBytes: file.size,
          uploadedAt: new Date().toLocaleString('pt-BR'),
          description: `Arquivo ${getCategoryLabel(category).toLowerCase()} adicionado pelo usuário.`,
          contentDataUrl: dataUrl,
          aiAccessible: true,
        };

        const updated = AppStorage.addDocument(context.type, newDoc);
        addedDocs.push(newDoc);
        processed++;

        if (processed === files.length) {
          setDocuments(updated);
          finishUpload(addedDocs, invalidCount);
        }
      };

      reader.onerror = () => {
        processed++;
        if (processed === files.length) {
          finishUpload(addedDocs, invalidCount);
        }
      };

      // For images and PDFs, read as Data URL
      if (category === 'IMAGE' || category === 'PDF') {
        reader.readAsDataURL(file);
      } else {
        // For video files, we can read as data URL if small, or keep lightweight
        if (file.size < 10 * 1024 * 1024) {
          reader.readAsDataURL(file);
        } else {
          const newDoc: LibraryDocument = {
            id: `ARQ-${Math.floor(100 + Math.random() * 900)}`,
            fileName: file.name,
            category: 'VIDEO',
            mimeType: file.type || 'video/mp4',
            fileSizeBytes: file.size,
            uploadedAt: new Date().toLocaleString('pt-BR'),
            description: `Vídeo enviado pelo usuário em formato ${file.type || 'mp4'}.`,
            aiAccessible: true,
          };
          const updated = AppStorage.addDocument(context.type, newDoc);
          addedDocs.push(newDoc);
          processed++;
          if (processed === files.length) {
            setDocuments(updated);
            finishUpload(addedDocs, invalidCount);
          }
        }
      }
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const finishUpload = (added: LibraryDocument[], invalid: number) => {
    setIsUploading(false);
    if (added.length > 0) {
      showToast(`${added.length} arquivo(s) adicionado(s) com sucesso à Biblioteca!`);
    }
    if (invalid > 0) {
      alert(
        `${invalid} arquivo(s) foram ignorados. A Biblioteca aceita exclusivamente Imagens, Vídeos e Documentos PDF.`
      );
    }
  };

  // ================= AÇÕES: BAIXAR, RENOMEAR, EXCLUIR E ALTERNAR IA =================
  const handleDownload = (doc: LibraryDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (doc.contentDataUrl) {
      const a = document.createElement('a');
      a.href = doc.contentDataUrl;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Download de "${doc.fileName}" iniciado.`);
    } else {
      const content = `OPENsketch Arquivo: ${doc.fileName}\nID: ${doc.id}\nTipo: ${doc.mimeType}\nTamanho: ${formatFileSize(
        doc.fileSizeBytes
      )}\nData: ${doc.uploadedAt}\n\nDescrição: ${doc.description || 'N/A'}`;
      const blob = new Blob([content], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Download de "${doc.fileName}" iniciado.`);
    }
  };

  const handleOpenRename = (doc: LibraryDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocToRename(doc);
    setNewFileName(doc.fileName);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToRename || !newFileName.trim()) return;

    const updated = AppStorage.updateDocument(context.type, docToRename.id, {
      fileName: newFileName.trim(),
    });
    setDocuments(updated);
    showToast(`Arquivo renomeado para "${newFileName.trim()}".`);
    setDocToRename(null);
  };

  const handleDelete = (doc: LibraryDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o arquivo "${doc.fileName}" da biblioteca?`)) {
      const updated = AppStorage.deleteDocument(context.type, doc.id);
      setDocuments(updated);
      showToast(`Arquivo "${doc.fileName}" removido.`);
    }
  };

  const handleToggleAiAccess = (doc: LibraryDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = doc.aiAccessible !== false;
    const updated = AppStorage.updateDocument(context.type, doc.id, {
      aiAccessible: !current,
    });
    setDocuments(updated);
    showToast(`Consulta da IA para "${doc.fileName}": ${!current ? 'Habilitada' : 'Desabilitada'}.`);
  };

  // ================= FILTROS E PESQUISA =================
  const filteredDocs = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesCategory;

    const matchesSearch =
      doc.fileName.toLowerCase().includes(term) ||
      doc.id.toLowerCase().includes(term) ||
      doc.category.toLowerCase().includes(term) ||
      getCategoryLabel(doc.category).toLowerCase().includes(term) ||
      (doc.description && doc.description.toLowerCase().includes(term));

    return matchesCategory && matchesSearch;
  });

  const countAll = documents.length;
  const countImages = documents.filter((d) => d.category === 'IMAGE').length;
  const countVideos = documents.filter((d) => d.category === 'VIDEO').length;
  const countPdfs = documents.filter((d) => d.category === 'PDF').length;

  return (
    <div className="responsive-view-container" style={{ flex: 1, overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            backgroundColor: '#1C1E22',
            border: '1px solid #10B981',
            borderRadius: '10px',
            padding: '14px 20px',
            color: '#D9DEE4',
            fontSize: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
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

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #1C1E22',
          paddingBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#D9DEE4' }}>
              Biblioteca
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: context.type === 'CORPORATE' ? '#3D5A73' : '#8A96A3',
                backgroundColor: '#1C1E22',
                border: '1px solid #272C34',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {context.type === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#8A96A3' }}>
            Armazenamento e visualização de imagens, vídeos e documentos PDF autorizados para consulta da IA.
          </p>
        </div>

        {/* Botão Principal: Adicionar arquivos (envio único ou múltiplo) */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            style={{ display: 'none' }}
            disabled={isUploading}
            onChange={handleFilesUpload}
          />
          <button
            onClick={() => {
              if (isFreeReadOnly) {
                onRequestUpgrade?.('essential_monthly', 'Adicionar Arquivos na Biblioteca');
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
            style={{
              padding: '12px 22px',
              backgroundColor: '#3D5A73',
              color: '#D9DEE4',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isUploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 16px rgba(61,90,115,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: '16px' }}>{isUploading ? '⏳' : '+'}</span>
            <span>{isUploading ? 'Adicionando...' : 'Adicionar arquivos'}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips (Exclusively 3 Groups + All) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory('ALL')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: selectedCategory === 'ALL' ? 600 : 400,
            backgroundColor: selectedCategory === 'ALL' ? '#3D5A73' : '#1C1E22',
            color: selectedCategory === 'ALL' ? '#FFFFFF' : '#8A96A3',
            border: selectedCategory === 'ALL' ? '1px solid #4A6D8C' : '1px solid #272C34',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>📁 Todos os Arquivos</span>
          <span style={{ fontSize: '11px', opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
            {countAll}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('IMAGE')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: selectedCategory === 'IMAGE' ? 600 : 400,
            backgroundColor: selectedCategory === 'IMAGE' ? '#10B981' : '#1C1E22',
            color: selectedCategory === 'IMAGE' ? '#FFFFFF' : '#8A96A3',
            border: selectedCategory === 'IMAGE' ? '1px solid #059669' : '1px solid #272C34',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🖼️ Imagens e Fotografias</span>
          <span style={{ fontSize: '11px', opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
            {countImages}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('VIDEO')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: selectedCategory === 'VIDEO' ? 600 : 400,
            backgroundColor: selectedCategory === 'VIDEO' ? '#3D5A73' : '#1C1E22',
            color: selectedCategory === 'VIDEO' ? '#FFFFFF' : '#8A96A3',
            border: selectedCategory === 'VIDEO' ? '1px solid #4A6D8C' : '1px solid #272C34',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🎬 Vídeos</span>
          <span style={{ fontSize: '11px', opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
            {countVideos}
          </span>
        </button>

        <button
          onClick={() => setSelectedCategory('PDF')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: selectedCategory === 'PDF' ? 600 : 400,
            backgroundColor: selectedCategory === 'PDF' ? '#D97706' : '#1C1E22',
            color: selectedCategory === 'PDF' ? '#FFFFFF' : '#8A96A3',
            border: selectedCategory === 'PDF' ? '1px solid #B45309' : '1px solid #272C34',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>📕 Documentos PDF</span>
          <span style={{ fontSize: '11px', opacity: 0.8, backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: '10px' }}>
            {countPdfs}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#1C1E22',
          border: '1px solid #272C34',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
        }}
      >
        <span style={{ color: '#8A96A3', fontSize: '16px' }}>🔍</span>
        <input
          type="text"
          placeholder="Pesquisar arquivos por nome, ID ou tipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            color: '#D9DEE4',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#8A96A3',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕ Limpar
          </button>
        )}
        <span style={{ fontSize: '13px', color: '#8A96A3' }}>
          {filteredDocs.length} de {documents.length} arquivo(s)
        </span>
      </div>

      {/* Documents Table with Interactivity and Hover */}
      <div
        className="table-responsive-wrapper"
        style={{
          backgroundColor: '#1C1E22',
          border: '1px solid #272C34',
          borderRadius: '12px',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #272C34', backgroundColor: '#16191E', color: '#8A96A3' }}>
              <th style={{ padding: '14px 18px', width: '100px' }}>ID</th>
              <th style={{ padding: '14px 18px' }}>Nome do Arquivo</th>
              <th style={{ padding: '14px 18px', width: '170px' }}>Categoria</th>
              <th style={{ padding: '14px 18px', width: '120px' }}>Tamanho</th>
              <th style={{ padding: '14px 18px', width: '150px' }}>Data de Inclusão</th>
              <th style={{ padding: '14px 18px', width: '130px' }}>Consulta IA</th>
              <th style={{ padding: '14px 18px', textAlign: 'right', width: '230px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#8A96A3' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                  <div style={{ fontSize: '15px', fontWeight: 500, color: '#D9DEE4' }}>
                    Nenhum arquivo encontrado
                  </div>
                  <div style={{ fontSize: '13px', marginTop: '4px' }}>
                    Utilize o botão "+ Adicionar arquivos" acima para carregar imagens, vídeos ou PDFs.
                  </div>
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const isHovered = hoveredDocId === doc.id;
                return (
                  <tr
                    key={doc.id}
                    onClick={() => openDedicatedViewer(doc)}
                    onMouseEnter={() => setHoveredDocId(doc.id)}
                    onMouseLeave={() => setHoveredDocId(null)}
                    title="Clique para abrir e visualizar este arquivo em uma nova aba dedicada"
                    style={{
                      borderBottom: '1px solid #22262C',
                      backgroundColor: isHovered ? '#1F242C' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    {/* ID */}
                    <td style={{ padding: '14px 18px', color: '#8A96A3', fontFamily: 'monospace', fontSize: '12px' }}>
                      {doc.id}
                    </td>

                    {/* Nome do Arquivo */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{getCategoryIcon(doc.category)}</span>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: isHovered ? '#FFFFFF' : '#D9DEE4',
                              transition: 'color 0.15s ease',
                            }}
                          >
                            {doc.fileName}
                          </div>
                          {doc.description && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#8A96A3',
                                maxWidth: '380px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {doc.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            doc.category === 'IMAGE'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : doc.category === 'VIDEO'
                              ? 'rgba(61, 90, 115, 0.25)'
                              : 'rgba(245, 158, 11, 0.15)',
                          color:
                            doc.category === 'IMAGE'
                              ? '#6EE7B7'
                              : doc.category === 'VIDEO'
                              ? '#93C5FD'
                              : '#FCD34D',
                          border: `1px solid ${
                            doc.category === 'IMAGE'
                              ? 'rgba(16, 185, 129, 0.3)'
                              : doc.category === 'VIDEO'
                              ? 'rgba(61, 90, 115, 0.4)'
                              : 'rgba(245, 158, 11, 0.3)'
                          }`,
                        }}
                      >
                        {getCategoryLabel(doc.category)}
                      </span>
                    </td>

                    {/* Tamanho */}
                    <td style={{ padding: '14px 18px', color: '#8A96A3', fontSize: '12px' }}>
                      {formatFileSize(doc.fileSizeBytes)}
                    </td>

                    {/* Data de Inclusão */}
                    <td style={{ padding: '14px 18px', color: '#8A96A3', fontSize: '12px' }}>
                      {doc.uploadedAt}
                    </td>

                    {/* Consulta IA Toggle */}
                    <td style={{ padding: '14px 18px' }}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleAiAccess(doc, e)}
                        title="Clique para alternar permissão de consulta pela IA"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: doc.aiAccessible !== false ? '#064E3B' : '#1E293B',
                          color: doc.aiAccessible !== false ? '#6EE7B7' : '#94A3B8',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <span>🤖</span>
                        <span>{doc.aiAccessible !== false ? 'Autorizado' : 'Restrito'}</span>
                      </button>
                    </td>

                    {/* Ações: Visualizar, Baixar, Renomear, Excluir */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {/* Visualizar (Nova Aba) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDedicatedViewer(doc);
                          }}
                          title="Abrir e visualizar em nova aba"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#3D5A73',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#D9DEE4',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          👁️ Visualizar
                        </button>

                        {/* Baixar */}
                        <button
                          type="button"
                          onClick={(e) => handleDownload(doc, e)}
                          title="Fazer download deste arquivo"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#121417',
                            border: '1px solid #272C34',
                            borderRadius: '6px',
                            color: '#D9DEE4',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          ⬇️
                        </button>

                        {/* Renomear */}
                        <button
                          type="button"
                          onClick={(e) => {
                            if (isFreeReadOnly) {
                              e.stopPropagation();
                              onRequestUpgrade?.('essential_monthly', 'Editar Arquivos na Biblioteca');
                              return;
                            }
                            handleOpenRename(doc, e);
                          }}
                          title="Renomear este arquivo"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#121417',
                            border: '1px solid #272C34',
                            borderRadius: '6px',
                            color: '#D9DEE4',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          ✏️
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(doc, e)}
                          title="Excluir arquivo da biblioteca"
                          style={{
                            padding: '6px 8px',
                            backgroundColor: '#1E1417',
                            border: '1px solid #E11D48',
                            borderRadius: '6px',
                            color: '#FDA4AF',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ================= PLAYBOOKS COMERCIAIS & SCRIPTS IA ================= */}
      <div
        style={{
          marginTop: '24px',
          backgroundColor: '#1C1E22',
          border: '1px solid #272C34',
          borderRadius: '12px',
          padding: '22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#F8FAFC' }}>
              📖 Playbooks Comerciais & Scripts Prontos (IA)
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#8A96A3' }}>
              Copie roteiros testados de negociação ou peça à Lana • Vendas um novo script personalizado.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          {READY_PLAYBOOKS.map((pb) => (
            <div
              key={pb.id}
              style={{
                backgroundColor: '#121417',
                border: '1px solid #272C34',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4A7296' }}>{pb.agent}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>{pb.title}</div>
              <p style={{ margin: 0, fontSize: '12px', color: '#CBD5E1', lineHeight: 1.5, flex: 1 }}>{pb.text}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(pb.text);
                  showToast('✓ Script copiado para a área de transferência!');
                }}
                style={{
                  alignSelf: 'flex-start',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #3B5B78',
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Copiar Script
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={playbookTopic}
            onChange={(e) => setPlaybookTopic(e.target.value)}
            placeholder="Descreva o cenário (ex: proposta para clínica odontológica que pediu prazo maior)"
            style={{
              flex: '1 1 260px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #272C34',
              backgroundColor: '#121417',
              color: '#F8FAFC',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            disabled={isGeneratingPlaybook || !playbookTopic.trim()}
            onClick={handleGeneratePlaybook}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid #4A7296',
              backgroundColor: '#2C4863',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isGeneratingPlaybook || !playbookTopic.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {isGeneratingPlaybook ? 'Gerando...' : 'Gerar Playbook com IA'}
          </button>
        </div>

        {generatedPlaybook && (
          <div
            style={{
              marginTop: '14px',
              backgroundColor: '#121417',
              border: '1px solid #3B5B78',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '13px',
              color: '#E2E8F0',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {generatedPlaybook}
          </div>
        )}
      </div>

      {/* ================= MODAL DE RENOMEAR ARQUIVO ================= */}
      {docToRename && (
        <div style={modalBackdropStyle} onClick={() => setDocToRename(null)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#D9DEE4' }}>
                Renomear Arquivo
              </h2>
              <button
                onClick={() => setDocToRename(null)}
                style={{ background: 'none', border: 'none', color: '#8A96A3', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#8A96A3' }}>
              Altere o nome de exibição do arquivo <strong>{docToRename.id}</strong> ({getCategoryLabel(docToRename.category)}).
            </p>

            <form onSubmit={handleSaveRename}>
              <div style={{ marginBottom: '20px' }}>
                <label style={modalLabelStyle}>Novo Nome do Arquivo</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  style={modalInputStyle}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDocToRename(null)}
                  style={modalCancelButtonStyle}
                >
                  Cancelar
                </button>
                <button type="submit" style={modalSubmitButtonStyle}>
                  Salvar Nome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL REACT NATIVO E SEGURO PARA PREVIEW DE MÍDIA ================= */}
      {previewDoc && (
        <div
          style={{ ...modalBackdropStyle, padding: '24px' }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1C1E22',
              border: '1px solid #3D5A73',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.75)',
            }}
          >
            <div
              style={{
                padding: '16px 22px',
                borderBottom: '1px solid #272C34',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                backgroundColor: '#16191E',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#D9DEE4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getCategoryIcon(previewDoc.category)} {sanitizePlainText(previewDoc.fileName)}
                </div>
                <div style={{ fontSize: '12px', color: '#8A96A3', marginTop: '2px' }}>
                  {getCategoryLabel(previewDoc.category)} • {formatFileSize(previewDoc.fileSizeBytes)} • Enviado em {previewDoc.uploadedAt}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isSafeMediaUrl(previewDoc.contentDataUrl) && (
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(previewDoc)}
                    style={modalSubmitButtonStyle}
                  >
                    ⬇ Baixar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  style={{ background: 'none', border: 'none', color: '#8A96A3', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0E1013',
                minHeight: '360px',
              }}
            >
              {!isSafeMediaUrl(previewDoc.contentDataUrl) ? (
                <div style={{ textAlign: 'center', color: '#8A96A3', maxWidth: '420px' }}>
                  <div style={{ fontSize: '42px', marginBottom: '12px' }}>📂</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#D9DEE4', marginBottom: '6px' }}>
                    Nenhuma mídia carregada localmente
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                    Este arquivo ainda não possui conteúdo binário disponível no armazenamento local. Envie o arquivo novamente para visualizar ou reproduzir.
                  </p>
                </div>
              ) : previewDoc.category === 'IMAGE' ? (
                <img
                  src={previewDoc.contentDataUrl}
                  alt={sanitizePlainText(previewDoc.fileName)}
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', objectFit: 'contain' }}
                />
              ) : previewDoc.category === 'VIDEO' ? (
                <video
                  src={previewDoc.contentDataUrl}
                  controls
                  playsInline
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', backgroundColor: '#000' }}
                >
                  Seu navegador não suporta a reprodução deste vídeo.
                </video>
              ) : (
                <iframe
                  title={sanitizePlainText(previewDoc.fileName)}
                  src={previewDoc.contentDataUrl}
                  sandbox=""
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px', backgroundColor: '#FFF' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalBoxStyle: React.CSSProperties = {
  backgroundColor: '#1C1E22',
  border: '1px solid #3D5A73',
  borderRadius: '16px',
  padding: '28px',
  maxWidth: '440px',
  width: '100%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: '#8A96A3',
  marginBottom: '6px',
};

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#121417',
  border: '1px solid #272C34',
  borderRadius: '6px',
  color: '#D9DEE4',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const modalCancelButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: 'transparent',
  border: '1px solid #272C34',
  color: '#8A96A3',
  borderRadius: '6px',
  fontSize: '13px',
  cursor: 'pointer',
};

const modalSubmitButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: '#3D5A73',
  border: 'none',
  color: '#D9DEE4',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 0 12px rgba(61,90,115,0.3)',
};
