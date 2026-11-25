import React, { useState, useEffect, useRef } from 'react';
import { WorkspaceContext } from '../components/HeaderNavigation';
import { AppStorage, ClientRecord } from '../services/app-storage';
import { sanitizePlainText, sanitizeEmail, sanitizePhone } from '../security/sanitizer';
import { formatCpfCnpj, sanitizeCpfCnpj, validateCpfCnpj } from '../security/cpf-cnpj-validator';
import { getCurrentFirebaseIdToken } from '../services/firebase-client';

interface ClientesViewProps {
  context: WorkspaceContext;
}

export const ClientesView: React.FC<ClientesViewProps> = ({ context }) => {
  const isCorporate = context.type === 'CORPORATE';
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for New / Edit Client & View Full Card
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [viewingClient, setViewingClient] = useState<ClientRecord | null>(null);

  // Exclusivamente os 4 campos essenciais amigáveis para 50+
  const [formName, setFormName] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  // Contexto opcional extraído via foto ou arquivo (para enriquecer Copiloto IA)
  const [formContext, setFormContext] = useState('');
  const [formOrigin, setFormOrigin] = useState<ClientRecord['origin']>('MANUAL');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{
    type: 'cpf_cnpj' | 'contact';
    message: string;
    existingClient: ClientRecord;
  } | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const findDuplicateClient = (docValue: string, phoneValue: string, emailValue: string, ignoreId?: string) => {
    const cleanDoc = sanitizeCpfCnpj(docValue);
    const cleanPhone = String(phoneValue || '').replace(/\D/g, '');
    const cleanEmail = sanitizeEmail(emailValue || '').trim().toLowerCase();

    if (cleanDoc) {
      const docMatch = clients.find((c) => {
        if (ignoreId && c.id === ignoreId) return false;
        if (!c.documentTaxId || c.documentTaxId === 'Não informado') return false;
        return sanitizeCpfCnpj(c.documentTaxId) === cleanDoc;
      });
      if (docMatch) {
        return {
          type: 'cpf_cnpj' as const,
          message: `Este CPF/CNPJ já está cadastrado para ${docMatch.name}`,
          existingClient: docMatch,
        };
      }
    }

    const contactMatch = clients.find((c) => {
      if (ignoreId && c.id === ignoreId) return false;
      const cPhone = String(c.phone || '').replace(/\D/g, '');
      const cEmail = String(c.email || '').trim().toLowerCase();
      const phoneDup = cleanPhone.length >= 8 && cPhone.length >= 8 && cPhone === cleanPhone;
      const emailDup = Boolean(cleanEmail && cleanEmail !== 'contato@cliente.com.br' && cEmail === cleanEmail);
      return phoneDup || emailDup;
    });

    if (contactMatch) {
      return {
        type: 'contact' as const,
        message: `Já existe um cadastro com este telefone/e-mail (${contactMatch.name})`,
        existingClient: contactMatch,
      };
    }

    return null;
  };

  // Carregar clientes do ambiente ativo
  useEffect(() => {
    setClients(AppStorage.getClients(context.type));
  }, [context.type]);

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormCpf('');
    setFormPhone('');
    setFormEmail('');
    setFormContext('');
    setFormOrigin('MANUAL');
    setExtractMessage(null);
    setDuplicateAlert(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: ClientRecord) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormCpf(client.documentTaxId && client.documentTaxId !== 'Não informado' ? formatCpfCnpj(client.documentTaxId) : '');
    setFormPhone(client.phone || '');
    setFormEmail(client.email.includes('@cliente.com.br') ? '' : client.email);
    setFormContext(client.notes || '');
    setFormOrigin(client.origin || (client.id.startsWith('CLI-CONV-') ? 'PROSPECCAO_B2B' : 'MANUAL'));
    setExtractMessage(null);
    setDuplicateAlert(null);
    setIsModalOpen(true);
  };

  const handleImportDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']);
    if (!ALLOWED_MIMES.has(file.type)) {
      setExtractMessage({ type: 'error', text: 'Formato não suportado. Use JPG, PNG, WEBP, PDF ou TXT.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setExtractMessage({ type: 'error', text: 'Arquivo muito grande. O limite máximo é de 5 MB.' });
      return;
    }

    setIsExtracting(true);
    setExtractMessage({ type: 'info', text: 'Analisando documento com segurança...' });

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
        reader.readAsDataURL(file);
      });

      const apiBase = ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '')
        .trim()
        .replace(/\/+$/, '');
      const idToken = await getCurrentFirebaseIdToken();
      const res = await fetch(`${apiBase}/api/clients/extract-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.fallback || !data.extracted) {
        setExtractMessage({
          type: 'info',
          text: data.message || 'Não foi possível extrair automaticamente. Preencha os campos manualmente.',
        });
        return;
      }

      const ext = data.extracted;
      if (ext.nome) setFormName(sanitizePlainText(ext.nome));
      let hasInvalidExtractedDoc = false;
      if (ext.cpf) {
        const formattedDoc = formatCpfCnpj(sanitizePlainText(ext.cpf));
        setFormCpf(formattedDoc);
        const docCheck = validateCpfCnpj(formattedDoc);
        if (docCheck.status !== 'valid' && docCheck.status !== 'empty') {
          hasInvalidExtractedDoc = true;
        }
      }
      if (ext.telefone) setFormPhone(sanitizePhone(ext.telefone));
      if (ext.email) setFormEmail(sanitizeEmail(ext.email));
      if (ext.contexto) setFormContext(sanitizePlainText(ext.contexto));
      setFormOrigin('DOCUMENTO_IA');

      const dupFromOcr = findDuplicateClient(
        ext.cpf ? formatCpfCnpj(sanitizePlainText(ext.cpf)) : '',
        ext.telefone ? sanitizePhone(ext.telefone) : '',
        ext.email ? sanitizeEmail(ext.email) : '',
        editingClient?.id
      );
      setDuplicateAlert(dupFromOcr);

      setExtractMessage(
        hasInvalidExtractedDoc
          ? {
              type: 'info',
              text: 'Dados extraídos! Atenção: o CPF/CNPJ lido parece incorreto ou incompleto — confira os dígitos antes de salvar.',
            }
          : {
              type: 'success',
              text: 'Dados e contexto extraídos! Confira os campos abaixo antes de salvar.',
            }
      );
    } catch {
      setExtractMessage({
        type: 'error',
        text: 'Erro de comunicação ao processar arquivo. Preencha manualmente.',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizePlainText(formName);
    if (!cleanName) {
      alert('Por favor, informe o Nome ou Razão Social do cliente.');
      return;
    }

    const duplicate = findDuplicateClient(formCpf, formPhone, formEmail, editingClient?.id);
    if (duplicate) {
      setDuplicateAlert(duplicate);
      return;
    }
    setDuplicateAlert(null);

    const cleanContext = sanitizePlainText(formContext.trim());

    const clientToSave: ClientRecord = {
      id: editingClient ? editingClient.id : `CLI-${Date.now().toString().slice(-4)}`,
      name: cleanName,
      documentTaxId: sanitizePlainText(formCpf.trim()) || 'Não informado',
      phone: sanitizePhone(formPhone.trim()) || undefined,
      email: sanitizeEmail(formEmail.trim()) || 'contato@cliente.com.br',
      totalInvoiced: editingClient ? editingClient.totalInvoiced : 0.0,
      invoicesCount: editingClient ? editingClient.invoicesCount : 0,
      status: editingClient ? editingClient.status : 'ATIVO',
      lastInvoiceDate: editingClient ? editingClient.lastInvoiceDate : new Date().toLocaleDateString('pt-BR'),
      segment: editingClient ? editingClient.segment : (isCorporate ? 'Corporativo' : 'Individual'),
      notes: cleanContext || undefined,
      origin: editingClient?.origin || formOrigin || 'MANUAL',
    };

    const updated = AppStorage.saveClient(context.type, clientToSave);
    setClients(updated);
    setIsModalOpen(false);
  };

  const handleDeleteClient = (clientId: string, clientName: string) => {
    if (window.confirm(`Deseja remover "${clientName}" da sua lista de clientes?`)) {
      const updated = AppStorage.deleteClient(context.type, clientId);
      setClients(updated);
    }
  };

  const filteredClients = clients.filter((cli) => {
    const term = searchTerm.toLowerCase();
    return (
      cli.name.toLowerCase().includes(term) ||
      (cli.documentTaxId && cli.documentTaxId.toLowerCase().includes(term)) ||
      (cli.phone && cli.phone.includes(term)) ||
      (cli.email && cli.email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="responsive-view-container" style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* Header amigável e despoluído */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          borderBottom: '1px solid #272C34',
          paddingBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: 600, color: '#D9DEE4' }}>
            Meus Clientes
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#8A96A3' }}>
            Gerencie sua lista de contatos e clientes cadastrados com rapidez e clareza.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            minHeight: '48px',
            padding: '12px 24px',
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
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Busca simples e direta */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#1C1E22',
            border: '1px solid #272C34',
            borderRadius: '12px',
            padding: '12px 20px',
            minHeight: '48px',
          }}
        >
          <span style={{ color: '#8A96A3', fontSize: '18px' }}>🔍</span>
          <input
            type="text"
            placeholder="Digite o nome, CPF, telefone ou e-mail para buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#D9DEE4',
              fontSize: '15px',
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
                fontSize: '14px',
                cursor: 'pointer',
                padding: '6px 10px',
              }}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista Limpa de Clientes: Exclusivamente Nome, CPF, Telefone/WhatsApp, E-mail e Ações */}
      <div
        className="table-responsive-wrapper"
        style={{
          backgroundColor: '#1C1E22',
          border: '1px solid #272C34',
          borderRadius: '14px',
          overflowX: 'auto',
          width: '100%',
        }}
      >
        {filteredClients.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8A96A3' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>👥</span>
            <div style={{ fontSize: '16px', color: '#D9DEE4', fontWeight: 600, marginBottom: '6px' }}>
              Nenhum cliente encontrado
            </div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Tente buscar por outro termo ou cadastre um novo cliente no botão acima.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #272C34', backgroundColor: '#16191E', color: '#8A96A3' }}>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Nome</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>CPF / CNPJ</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>Telefone / WhatsApp</th>
                <th style={{ padding: '16px 20px', fontWeight: 600 }}>E-mail</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => setViewingClient(client)}
                  title="Clique para abrir a ficha completa do cliente"
                  style={{
                    borderBottom: '1px solid #22262C',
                    transition: 'background 0.15s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#24282E')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '18px 20px', fontWeight: 600, color: '#D9DEE4' }}>
                    {client.name}
                  </td>
                  <td style={{ padding: '18px 20px', color: '#D9DEE4' }}>
                    {client.documentTaxId && client.documentTaxId !== 'Não informado' ? (
                      client.documentTaxId
                    ) : (
                      <span style={{ color: '#5C6670' }}>Não informado</span>
                    )}
                  </td>
                  <td style={{ padding: '18px 20px', color: '#D9DEE4' }}>
                    {client.phone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📞</span> {client.phone}
                      </span>
                    ) : (
                      <span style={{ color: '#5C6670' }}>Não informado</span>
                    )}
                  </td>
                  <td style={{ padding: '18px 20px', color: '#8A96A3' }}>
                    {client.email.includes('@cliente.com.br') ? (
                      <span style={{ color: '#5C6670' }}>—</span>
                    ) : (
                      client.email
                    )}
                  </td>
                  <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(client);
                        }}
                        style={{
                          height: '34px',
                          padding: '6px 14px',
                          backgroundColor: '#121417',
                          border: '1px solid #3D5A73',
                          borderRadius: '7px',
                          color: '#D9DEE4',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClient(client.id, client.name);
                        }}
                        style={{
                          height: '34px',
                          padding: '6px 14px',
                          backgroundColor: '#1E1417',
                          border: '1px solid #E11D48',
                          borderRadius: '7px',
                          color: '#FDA4AF',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= MODAL ENXUTO (EXCLUSIVAMENTE OS 4 CAMPOS ESSENCIAIS PARA 50+) ================= */}
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
            zIndex: 1000,
          }}
        >
          <input
            ref={importFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
            style={{ display: 'none' }}
            onChange={handleImportDocument}
          />
          <div
            className="responsive-modal-card"
            style={{
              backgroundColor: '#1C1E22',
              border: '1px solid #3D5A73',
              borderRadius: '16px',
              padding: '28px 24px',
              maxWidth: '480px',
              width: 'calc(100% - 24px)',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#D9DEE4' }}>
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8A96A3',
                  fontSize: '22px',
                  cursor: 'pointer',
                  minWidth: '44px',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Botão Compacto de Importação Inteligente (34px) */}
            <div style={{ marginBottom: '18px' }}>
              <button
                type="button"
                disabled={isExtracting}
                onClick={() => importFileRef.current?.click()}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: '#16191E',
                  border: '1px solid #3D5A73',
                  borderRadius: '7px',
                  color: '#93C5FD',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isExtracting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📎</span>
                <span>{isExtracting ? 'Extraindo dados...' : 'Importar de foto ou arquivo (IA)'}</span>
              </button>

              {extractMessage && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: 1.4,
                    backgroundColor:
                      extractMessage.type === 'success'
                        ? 'rgba(16, 185, 129, 0.14)'
                        : extractMessage.type === 'error'
                        ? 'rgba(225, 29, 72, 0.14)'
                        : 'rgba(61, 90, 115, 0.2)',
                    border: `1px solid ${
                      extractMessage.type === 'success'
                        ? '#10B981'
                        : extractMessage.type === 'error'
                        ? '#E11D48'
                        : '#3D5A73'
                    }`,
                    color:
                      extractMessage.type === 'success'
                        ? '#6EE7B7'
                        : extractMessage.type === 'error'
                        ? '#FDA4AF'
                        : '#CBD5E1',
                  }}
                >
                  {extractMessage.text}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitClient}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 1. Nome (Obrigatório) */}
                <div>
                  <label style={simpleLabelStyle}>
                    Nome <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    style={simpleInputStyle}
                  />
                </div>

                {/* 2. CPF / CNPJ Dual */}
                {(() => {
                  const docCheck = validateCpfCnpj(formCpf);
                  return (
                    <div>
                      <label
                        style={{
                          ...simpleLabelStyle,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>
                          CPF / CNPJ <span style={{ color: '#8A96A3', fontWeight: 400 }}>(Opcional)</span>
                        </span>
                        {docCheck.status === 'valid' && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#6EE7B7', whiteSpace: 'nowrap' }}>
                            ✓ {docCheck.message}
                          </span>
                        )}
                        {docCheck.status === 'invalid' && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#FCA5A5', whiteSpace: 'nowrap' }}>
                            ⚠ {docCheck.message}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formCpf}
                        onChange={(e) => {
                          setFormCpf(formatCpfCnpj(e.target.value));
                          if (duplicateAlert?.type === 'cpf_cnpj') setDuplicateAlert(null);
                        }}
                        placeholder="Ex: 000.000.000-00 ou 00.000.000/0000-00"
                        maxLength={18}
                        style={simpleInputStyle}
                      />
                    </div>
                  );
                })()}

                {/* 3. Telefone / WhatsApp */}
                <div>
                  <label style={simpleLabelStyle}>
                    Telefone / WhatsApp <span style={{ color: '#8A96A3', fontWeight: 400 }}>(Opcional)</span>
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => {
                      setFormPhone(e.target.value);
                      if (duplicateAlert?.type === 'contact') setDuplicateAlert(null);
                    }}
                    placeholder="Ex: (11) 98765-4321"
                    style={simpleInputStyle}
                  />
                </div>

                {/* 4. E-mail */}
                <div>
                  <label style={simpleLabelStyle}>
                    E-mail <span style={{ color: '#8A96A3', fontWeight: 400 }}>(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => {
                      setFormEmail(e.target.value);
                      if (duplicateAlert?.type === 'contact') setDuplicateAlert(null);
                    }}
                    placeholder="Ex: cliente@email.com"
                    style={simpleInputStyle}
                  />
                </div>

                {/* Bloco Discreto: Contexto / Observações Extraídas via Foto/Arquivo (para Copiloto IA) */}
                {formContext && (
                  <div
                    style={{
                      backgroundColor: '#16191E',
                      border: '1px solid #2C4257',
                      borderRadius: '10px',
                      padding: '12px 14px',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#93C5FD',
                        marginBottom: '6px',
                      }}
                    >
                      Contexto / Observações Extraídas <span style={{ color: '#8A96A3', fontWeight: 400 }}>(Editável • usado pelo Copiloto IA)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={formContext}
                      onChange={(e) => setFormContext(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#121417',
                        border: '1px solid #272C34',
                        borderRadius: '8px',
                        color: '#D9DEE4',
                        fontSize: '13px',
                        lineHeight: 1.45,
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                )}
              </div>

              {duplicateAlert && (
                <div
                  role="alert"
                  style={{
                    marginTop: '16px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(225, 29, 72, 0.12)',
                    border: '1px solid rgba(251, 113, 133, 0.45)',
                    color: '#FECDD3',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>⚠️ {duplicateAlert.message}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(duplicateAlert.existingClient)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #3D5A73',
                      backgroundColor: '#1E252F',
                      color: '#93C5FD',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Editar cadastro existente
                  </button>
                </div>
              )}

              {/* Botões Grandes e Claros com Alvos de Toque Confortáveis (50+) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    minHeight: '48px',
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    border: '1px solid #272C34',
                    color: '#8A96A3',
                    borderRadius: '10px',
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    minHeight: '48px',
                    padding: '12px 28px',
                    backgroundColor: '#3D5A73',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {editingClient ? 'Salvar Alterações' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: FICHA COMPLETA DO CLIENTE ================= */}
      {viewingClient && (
        <div
          onClick={() => setViewingClient(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '16px',
          }}
        >
          <div
            className="responsive-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1C1E22',
              border: '1px solid #3D5A73',
              borderRadius: '16px',
              padding: '26px 24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 36px rgba(0,0,0,0.65)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93C5FD', fontWeight: 700, marginBottom: '4px' }}>
                  Ficha Completa do Cliente
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
                  {viewingClient.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingClient(null)}
                aria-label="Fechar ficha"
                style={{
                  height: '34px',
                  width: '34px',
                  borderRadius: '7px',
                  border: '1px solid #272C34',
                  backgroundColor: 'transparent',
                  color: '#D9DEE4',
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div style={{ backgroundColor: '#16191E', border: '1px solid #272C34', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: '#8A96A3', fontWeight: 600, marginBottom: '4px' }}>CPF / CNPJ</div>
                <div style={{ fontSize: '14px', color: '#D9DEE4', fontWeight: 600 }}>
                  {viewingClient.documentTaxId || 'Não informado'}
                </div>
              </div>

              <div style={{ backgroundColor: '#16191E', border: '1px solid #272C34', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: '#8A96A3', fontWeight: 600, marginBottom: '4px' }}>Telefone / WhatsApp</div>
                <div style={{ fontSize: '14px', color: '#D9DEE4', fontWeight: 600 }}>
                  {viewingClient.phone || 'Não informado'}
                </div>
              </div>

              <div style={{ backgroundColor: '#16191E', border: '1px solid #272C34', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: '#8A96A3', fontWeight: 600, marginBottom: '4px' }}>E-mail</div>
                <div style={{ fontSize: '14px', color: '#D9DEE4', fontWeight: 500, wordBreak: 'break-word' }}>
                  {viewingClient.email.includes('@cliente.com.br') ? 'Não informado' : viewingClient.email}
                </div>
              </div>

              <div style={{ backgroundColor: '#16191E', border: '1px solid #272C34', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: '#8A96A3', fontWeight: 600, marginBottom: '4px' }}>Origem do Cadastro</div>
                <div style={{ fontSize: '13px', color: '#93C5FD', fontWeight: 600 }}>
                  {viewingClient.origin === 'DOCUMENTO_IA'
                    ? '📎 Foto / Arquivo (IA)'
                    : viewingClient.origin === 'PROSPECCAO_B2B' || viewingClient.id.startsWith('CLI-CONV-')
                    ? '🚀 Prospecção B2B'
                    : '✍️ Cadastro Manual'}
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#16191E', border: '1px solid #2C4257', borderRadius: '10px', padding: '14px 16px', marginBottom: '22px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#93C5FD', marginBottom: '6px' }}>
                Contexto / Observações
              </div>
              <div style={{ fontSize: '14px', color: viewingClient.notes ? '#D9DEE4' : '#8A96A3', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {viewingClient.notes || 'Nenhuma observação ou contexto adicional registrado para este cliente.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const target = viewingClient;
                  setViewingClient(null);
                  handleOpenEditModal(target);
                }}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: '#3D5A73',
                  border: 'none',
                  borderRadius: '7px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setViewingClient(null)}
                style={{
                  height: '34px',
                  padding: '6px 14px',
                  backgroundColor: 'transparent',
                  border: '1px solid #272C34',
                  borderRadius: '7px',
                  color: '#D9DEE4',
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
      )}
    </div>
  );
};

const simpleLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '15px',
  fontWeight: 600,
  color: '#D9DEE4',
  marginBottom: '8px',
};

const simpleInputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '48px',
  padding: '12px 16px',
  backgroundColor: '#121417',
  border: '1px solid #272C34',
  borderRadius: '10px',
  color: '#D9DEE4',
  fontSize: '15px',
  outline: 'none',
  boxSizing: 'border-box',
};
