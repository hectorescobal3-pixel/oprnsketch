import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceContext } from './HeaderNavigation';
import { AppStorage } from '../services/app-storage';
import { AiConversationalService, ChatAttachment, AgentUsedMetadata } from '../services/ai-conversational-service';
import { NavigationModuleId } from './Sidebar';
import { SubscriptionPlan } from '../services/user-plan-service';

const FREE_AI_DAILY_LIMIT = 5;

function getFreeAiDailyStorageKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return AppStorage.getKey(`free_ai_daily_${today}`, 'PERSONAL');
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
  agentUsed?: AgentUsedMetadata | null;
  toolAction?: {
    label: string;
    action: () => void;
  };
}

interface HomeOperationsCenterProps {
  context: WorkspaceContext;
  userName?: string;
  onFileReceived: (file: File) => Promise<void>;
  uploadProgress: number;
  onLoadDemoInvoice: () => void;
  onNavigateModule?: (id: NavigationModuleId) => void;
  userPlan?: SubscriptionPlan;
  isOwner?: boolean;
  onRequestUpgrade?: (requiredPlan: 'essential_monthly' | 'pro_lifetime', featureName: string) => void;
}

export const HomeOperationsCenter: React.FC<HomeOperationsCenterProps> = ({
  context,
  userName,
  onFileReceived,
  uploadProgress,
  onLoadDemoInvoice,
  onNavigateModule,
  userPlan = 'free',
  isOwner = false,
  onRequestUpgrade,
}) => {
  const [promptQuery, setPromptQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const isFreePlan = !isOwner && userPlan === 'free';
  const [freeDailyUsed, setFreeDailyUsed] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(getFreeAiDailyStorageKey());
      return Math.max(0, Number(raw) || 0);
    } catch {
      return 0;
    }
  });
  const freeDailyRemaining = Math.max(0, FREE_AI_DAILY_LIMIT - freeDailyUsed);
  const isFreeLimitReached = isFreePlan && freeDailyRemaining <= 0;

  // Estado de anexo (Foto ou Documento)
  const [pendingAttachment, setPendingAttachment] = useState<(ChatAttachment & { previewUrl?: string }) | null>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);

  const isCorporate = context.type === 'CORPORATE';
  const activeProfile = AppStorage.getProfile(context.type);
  const displayUserName = (activeProfile.fullName || userName || '').trim();
  const activeProfession = (activeProfile.profession || '').trim();

  // Fecha menu de anexo ao clicar fora
  useEffect(() => {
    const handleOutside = (ev: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(ev.target as Node)) {
        setIsAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Sessão efêmera: inicia sempre zerado ao montar ou trocar ambiente
  useEffect(() => {
    AppStorage.getChatMessages(context.type); // Limpa qualquer resíduo legado
    setMessages([]);
    setPromptQuery('');
    setIsThinking(false);
    setPendingAttachment(null);
    setAttachError(null);
  }, [context.type]);

  const persistMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  };

  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setIsAttachMenuOpen(false);
    setAttachError(null);
    if (!file) return;

    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);
    if (!ALLOWED.has(file.type)) {
      setAttachError('Formato não suportado. Selecione foto (JPG, PNG, WebP) ou documento (PDF, TXT).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAttachError('O arquivo excede o limite máximo de 5 MB.');
      return;
    }

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        reader.readAsDataURL(file);
      });

      let previewText: string | undefined = undefined;
      if (file.type === 'text/plain') {
        previewText = await file.text();
      }

      setPendingAttachment({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        previewText,
        previewUrl: file.type.startsWith('image/') ? base64Data : undefined,
      });
    } catch {
      setAttachError('Não foi possível carregar o arquivo selecionado.');
    }
  };

  // Listen to global Ctrl+V paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handlePastedImage(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handlePastedImage = (file: File) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: `📎 [Nota Fiscal ou Recibo colado: ${file.name || 'foto_da_nota.png'}]`,
      timestamp: time,
    };

    const aiMsg: ChatMessage = {
      id: (Math.random() + 1).toString(),
      sender: 'assistant',
      text: `Recebi a sua nota fiscal! A imagem está pronta para você conferir os dados e os valores com calma lado a lado.`,
      timestamp: time,
      toolAction: {
        label: '🔍 Abrir e Conferir Nota Fiscal',
        action: () => onFileReceived(file),
      },
    };

    const updated = [...messages, userMsg, aiMsg];
    persistMessages(updated);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawQuery = textToSend !== undefined ? textToSend : promptQuery;
    const attachmentToSend = textToSend === undefined ? pendingAttachment : null;
    if (!rawQuery.trim() && !attachmentToSend) return;

    if (isFreeLimitReached) {
      onRequestUpgrade?.('essential_monthly', 'Copiloto IA Ilimitado');
      return;
    }

    if (isFreePlan) {
      const nextCount = freeDailyUsed + 1;
      setFreeDailyUsed(nextCount);
      try {
        localStorage.setItem(getFreeAiDailyStorageKey(), String(nextCount));
      } catch {
        // ignore storage errors
      }
    }

    const query = rawQuery.trim() || (attachmentToSend ? `Analise o anexo: ${attachmentToSend.fileName}` : '');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: query,
      timestamp: time,
      attachmentName: attachmentToSend?.fileName,
    };

    const currentWithUser = [...messages, userMsg];
    persistMessages(currentWithUser);
    setPromptQuery('');
    setPendingAttachment(null);
    setAttachError(null);
    setIsThinking(true);

    try {
      // Motor Conversacional Real: Coleta dados dinâmicos do ambiente ativo e gera resposta contextual
      const aiResponse = await AiConversationalService.generateResponse(
        query,
        context.type,
        currentWithUser.map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp,
        })),
        attachmentToSend || undefined
      );

      let toolAction: { label: string; action: () => void } | undefined = undefined;

      if (aiResponse.toolAction) {
        if (aiResponse.toolAction.actionType === 'OPEN_DEMO_INVOICE') {
          toolAction = {
            label: aiResponse.toolAction.label,
            action: onLoadDemoInvoice,
          };
        } else if (onNavigateModule) {
          switch (aiResponse.toolAction.actionType) {
            case 'NAVIGATE_CLIENTES':
              toolAction = {
                label: aiResponse.toolAction.label,
                action: () => onNavigateModule('clientes'),
              };
              break;
            case 'NAVIGATE_METAS':
              toolAction = {
                label: aiResponse.toolAction.label,
                action: () => onNavigateModule('metas'),
              };
              break;
            case 'NAVIGATE_ANUNCIOS':
              toolAction = {
                label: aiResponse.toolAction.label,
                action: () => onNavigateModule('anuncios'),
              };
              break;
            case 'NAVIGATE_BIBLIOTECA':
              toolAction = {
                label: aiResponse.toolAction.label,
                action: () => onNavigateModule('biblioteca'),
              };
              break;
            case 'NAVIGATE_PROSPECCAO':
              if (isCorporate) {
                toolAction = {
                  label: aiResponse.toolAction.label,
                  action: () => onNavigateModule('prospeccao'),
                };
              }
              break;
          }
        }
      }

      const aiReply: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: aiResponse.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentUsed: aiResponse.agentUsed || null,
        toolAction,
      };

      persistMessages([...currentWithUser, aiReply]);
    } catch (err) {
      console.error('OPENsketch AI Error:', err);
      const fallbackReply: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: 'Desculpe, tive uma instabilidade momentânea ao processar sua resposta. Como posso te ajudar com seus clientes, metas ou anúncios?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      persistMessages([...currentWithUser, fallbackReply]);
    } finally {
      setIsThinking(false);
    }
  };

  // Helper para renderizar texto formatado sem asteriscos crus (markdown limpo com negrito e tópicos)
  const renderFormattedMessage = (text: string) => {
    const lines = text.split('\n');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {lines.map((line, lineIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lineIdx} style={{ height: '4px' }} />;
          }

          const isHeading = trimmed.startsWith('#');
          const isBullet = !isHeading && (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* '));
          const numberMatch = !isHeading && !isBullet ? trimmed.match(/^(\d+)[\.\)]\s+/) : null;

          const content = isHeading
            ? trimmed.replace(/^#+\s*/, '')
            : isBullet
            ? trimmed.replace(/^[•\-\*]\s*/, '')
            : numberMatch
            ? trimmed.slice(numberMatch[0].length)
            : trimmed;

          const elements: React.ReactNode[] = [];
          const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
          let lastIdx = 0;
          let match: RegExpExecArray | null;

          while ((match = regex.exec(content)) !== null) {
            if (match.index > lastIdx) {
              elements.push(content.substring(lastIdx, match.index).replace(/\*\*/g, '').replace(/__/g, ''));
            }
            const token = match[0];
            if (token.startsWith('**') && token.endsWith('**')) {
              elements.push(
                <strong key={`${lineIdx}-${match.index}`} style={{ fontWeight: 600, color: '#FFFFFF' }}>
                  {token.slice(2, -2).replace(/\*\*/g, '')}
                </strong>
              );
            } else if (token.startsWith('*') && token.endsWith('*')) {
              elements.push(
                <em key={`${lineIdx}-${match.index}`} style={{ fontStyle: 'italic', color: '#CBD5E1' }}>
                  {token.slice(1, -1)}
                </em>
              );
            }
            lastIdx = regex.lastIndex;
          }

          if (lastIdx < content.length) {
            elements.push(content.substring(lastIdx).replace(/\*\*/g, '').replace(/__/g, ''));
          }

          if (isHeading) {
            return (
              <div
                key={lineIdx}
                style={{
                  fontWeight: 700,
                  fontSize: '16px',
                  color: '#FFFFFF',
                  marginTop: '8px',
                  marginBottom: '2px',
                }}
              >
                {elements}
              </div>
            );
          }

          if (isBullet) {
            return (
              <div
                key={lineIdx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  paddingLeft: '4px',
                  lineHeight: 1.55,
                }}
              >
                <span style={{ color: '#3D5A73', fontSize: '14px', lineHeight: '22px', flexShrink: 0 }}>•</span>
                <div style={{ flex: 1 }}>{elements}</div>
              </div>
            );
          }

          if (numberMatch) {
            return (
              <div
                key={lineIdx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  paddingLeft: '4px',
                  lineHeight: 1.55,
                }}
              >
                <span
                  style={{
                    color: '#93C5FD',
                    fontWeight: 600,
                    fontSize: '14px',
                    lineHeight: '22px',
                    flexShrink: 0,
                  }}
                >
                  {numberMatch[1]}.
                </span>
                <div style={{ flex: 1 }}>{elements}</div>
              </div>
            );
          }

          return (
            <p key={lineIdx} style={{ margin: 0, lineHeight: 1.55 }}>
              {elements}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#121417',
        color: '#D9DEE4',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ================= CONVERSATIONAL CANVAS (LIMPO E AMIGÁVEL 50+) ================= */}
      <div
        className="responsive-view-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {messages.length === 0 ? (
          /* Empty State: Centered Greeting & AI Orb */
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              margin: 'auto 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Luminous Glowing Monogram Orb */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(61, 90, 115, 0.6) 0%, rgba(44, 66, 87, 0.25) 50%, transparent 75%)',
                boxShadow: '0 0 32px rgba(61, 90, 115, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <img
                src="/assets/opensketch-monogram.svg"
                alt="Assistente opensketch"
                style={{ width: '44px', height: '44px' }}
              />
            </div>

            {/* Greeting Headline Personalizada */}
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 600,
                color: '#D9DEE4',
                margin: '0 0 10px 0',
                letterSpacing: '-0.02em',
              }}
            >
              {displayUserName ? `Olá, ${displayUserName}!` : 'Olá!'}
            </h1>

            <p style={{ margin: '0 0 32px 0', fontSize: '15px', color: '#8A96A3', maxWidth: '580px', lineHeight: 1.6 }}>
              {activeProfession ? (
                <>
                  Sou seu copiloto especialista em <strong style={{ color: '#D9DEE4' }}>{activeProfession}</strong>. Estou aqui para orientar suas metas, acompanhar seus clientes, analisar anúncios e sugerir estratégias práticas.
                </>
              ) : (
                'Sou seu copiloto inteligente. Estou aqui para orientar suas metas, acompanhar seus clientes, analisar anúncios e sugerir estratégias práticas.'
              )}
            </p>

            {/* Sugestões Claras e Estratégicas de Vendas */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                width: '100%',
                maxWidth: '640px',
                marginBottom: '24px',
              }}
            >
              <button
                onClick={() => handleSendMessage('Como posso melhorar minhas metas e vender mais?')}
                style={friendlyPillStyle}
              >
                <span style={{ fontSize: '18px' }}>🎯</span>
                <span>Como melhorar minhas metas?</span>
              </button>

              <button
                onClick={() => handleSendMessage('O que devo priorizar hoje no meu trabalho?')}
                style={friendlyPillStyle}
              >
                <span style={{ fontSize: '18px' }}>📋</span>
                <span>O que devo priorizar hoje?</span>
              </button>

              <button
                onClick={() => handleSendMessage('Me traga as informações sobre os clientes cadastrados')}
                style={friendlyPillStyle}
              >
                <span style={{ fontSize: '18px' }}>👤</span>
                <span>Meus clientes cadastrados</span>
              </button>

              <button
                onClick={() => handleSendMessage('Resuma meus clientes, metas e anúncios')}
                style={friendlyPillStyle}
              >
                <span style={{ fontSize: '18px' }}>📊</span>
                <span>Panorama geral do meu espaço</span>
              </button>
            </div>
          </div>
        ) : (
          /* Conversation Message Stream */
          <div style={{ maxWidth: '780px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '16px 20px',
                    borderRadius: '14px',
                    backgroundColor: msg.sender === 'user' ? '#24282E' : '#1C1E22',
                    border: `1px solid ${msg.sender === 'user' ? '#3D5A73' : '#272C34'}`,
                    color: '#D9DEE4',
                    fontSize: '15px',
                    lineHeight: 1.6,
                  }}
                >
                  {msg.sender === 'assistant' && msg.agentUsed && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 9px',
                        marginBottom: '10px',
                        borderRadius: '6px',
                        backgroundColor: '#16191E',
                        border: '1px solid #2C4257',
                        fontSize: '11.5px',
                        color: '#93C5FD',
                        fontWeight: 600,
                      }}
                    >
                      <span>{msg.agentUsed.emoji}</span>
                      <span>
                        {msg.agentUsed.badge || `${msg.agentUsed.displayName || msg.agentUsed.name} • ${msg.agentUsed.categoryLabel}`}
                      </span>
                    </div>
                  )}
                  {msg.attachmentName && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        marginBottom: '8px',
                        borderRadius: '6px',
                        backgroundColor: '#16191E',
                        border: '1px solid #3D5A73',
                        fontSize: '12px',
                        color: '#93C5FD',
                        fontWeight: 600,
                      }}
                    >
                      <span>📎</span>
                      <span>{msg.attachmentName}</span>
                    </div>
                  )}
                  {renderFormattedMessage(msg.text)}

                  {msg.toolAction && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #272C34' }}>
                      <button
                        onClick={msg.toolAction.action}
                        style={{
                          padding: '10px 18px',
                          backgroundColor: '#3D5A73',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {msg.toolAction.label}
                      </button>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: '#5C6670', marginTop: '4px', padding: '0 6px' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isThinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8A96A3', fontSize: '14px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3D5A73' }} />
                <span>Consultando ferramentas e formulando resposta...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= BARRA DE DIGITAÇÃO AMIGÁVEL ================= */}
      <div
        style={{
          padding: '14px 16px 20px 16px',
          backgroundColor: '#121417',
          borderTop: '1px solid #1C1E22',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* Hidden inputs for Photo & Document */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleAttachmentSelect}
        />
        <input
          ref={docInputRef}
          type="file"
          accept="application/pdf,text/plain"
          style={{ display: 'none' }}
          onChange={handleAttachmentSelect}
        />

        {/* Preview Chip / Miniatura do Anexo + Erro de Anexo */}
        {(pendingAttachment || attachError) && (
          <div style={{ maxWidth: '780px', width: '100%', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {attachError && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(225, 29, 72, 0.14)',
                  border: '1px solid #E11D48',
                  color: '#FDA4AF',
                  fontSize: '12px',
                }}
              >
                {attachError}
              </div>
            )}
            {pendingAttachment && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: 'fit-content',
                  maxWidth: '100%',
                  backgroundColor: '#1C1E22',
                  border: '1px solid #3D5A73',
                  borderRadius: '10px',
                  padding: '6px 12px',
                }}
              >
                {pendingAttachment.previewUrl ? (
                  <img
                    src={pendingAttachment.previewUrl}
                    alt={pendingAttachment.fileName}
                    style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '18px' }}>📄</span>
                )}
                <span
                  style={{
                    fontSize: '13px',
                    color: '#D9DEE4',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '280px',
                  }}
                >
                  {pendingAttachment.fileName}
                </span>
                <button
                  type="button"
                  aria-label="Remover anexo"
                  onClick={() => setPendingAttachment(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8A96A3',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contador discreto de consultas gratuitas / Convite de Upgrade */}
        {isFreePlan && (
          <div
            style={{
              maxWidth: '780px',
              width: '100%',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              padding: isFreeLimitReached ? '12px 16px' : '6px 12px',
              borderRadius: '10px',
              backgroundColor: isFreeLimitReached ? 'rgba(234, 88, 12, 0.12)' : 'rgba(59, 91, 120, 0.14)',
              border: isFreeLimitReached ? '1px solid rgba(249, 115, 22, 0.45)' : '1px solid #263447',
              fontSize: '12px',
              color: isFreeLimitReached ? '#FED7AA' : '#94A3B8',
            }}
          >
            <span>
              {isFreeLimitReached
                ? `Você atingiu o limite de ${FREE_AI_DAILY_LIMIT} consultas gratuitas de hoje no Copiloto IA.`
                : `✨ Plano Gratuito • ${freeDailyRemaining} de ${FREE_AI_DAILY_LIMIT} consultas de IA restantes hoje`}
            </span>
            <button
              type="button"
              onClick={() => onRequestUpgrade?.('essential_monthly', 'Copiloto IA Ilimitado')}
              style={{
                padding: isFreeLimitReached ? '7px 14px' : '4px 10px',
                borderRadius: '8px',
                border: isFreeLimitReached ? '1px solid #FB923C' : '1px solid #3B5B78',
                backgroundColor: isFreeLimitReached ? '#EA580C' : 'transparent',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isFreeLimitReached ? 'Desbloquear Uso Ilimitado' : 'Ter uso ilimitado'}
            </button>
          </div>
        )}

        <div
          style={{
            maxWidth: '780px',
            width: '100%',
            backgroundColor: '#1C1E22',
            border: '1px solid #272C34',
            borderRadius: '16px',
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            position: 'relative',
          }}
        >
          {/* Botão Funcional de Anexo (+ / Clipe) com Popover Discreto */}
          <div ref={attachMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((prev) => !prev)}
              title="Anexar foto ou documento"
              aria-label="Anexar foto ou documento"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: isAttachMenuOpen ? '#27323F' : '#16191E',
                border: '1px solid #272C34',
                color: '#D9DEE4',
                fontSize: '18px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>

            {isAttachMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: 0,
                  width: '210px',
                  backgroundColor: '#1C1E22',
                  border: '1px solid #3D5A73',
                  borderRadius: '10px',
                  padding: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  zIndex: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#D9DEE4',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>🖼️</span>
                  <span>Foto (JPG, PNG, WebP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#D9DEE4',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>📄</span>
                  <span>Documento (PDF, TXT)</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Input Field */}
          <input
            type="text"
            placeholder="Digite sua dúvida ou mensagem aqui..."
            value={promptQuery}
            onChange={(e) => setPromptQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#D9DEE4',
              fontSize: '15px',
              outline: 'none',
            }}
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={(!promptQuery.trim() && !pendingAttachment) || isThinking}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: promptQuery.trim() || pendingAttachment ? '#3D5A73' : '#24282E',
              color: promptQuery.trim() || pendingAttachment ? '#FFFFFF' : '#5C6670',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: promptQuery.trim() || pendingAttachment ? 'pointer' : 'default',
              transition: 'background 0.15s ease',
              fontSize: '16px',
            }}
          >
            ➔
          </button>
        </div>
      </div>
    </div>
  );
};

const friendlyPillStyle: React.CSSProperties = {
  backgroundColor: '#1C1E22',
  border: '1px solid #272C34',
  color: '#D9DEE4',
  padding: '14px 18px',
  borderRadius: '12px',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.15s ease',
};
