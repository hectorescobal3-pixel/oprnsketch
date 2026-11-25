import React, { useState } from 'react';
import { LegalModal, LegalTab } from './LegalModal';
import {
  sendPasswordResetFirebase,
  signInWithEmailFirebase,
  signInWithGoogleFirebase,
} from '../services/firebase-client';

interface AuthScreenProps {
  onLoginSuccess: (user: { uid?: string; email: string; name: string }) => void;
  onNavigateHome?: () => void;
  onNavigateRegister?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onNavigateHome,
  onNavigateRegister,
}) => {
  // Estados de Autenticação
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados do Fluxo "Esqueci Minha Senha"
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Formatação automática amigável para telefone brasileiro (DDD) 9XXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setPhone(formatted);
    setErrorMessage(null);
  };

  // Login com Google (Firebase Auth + fallback seguro)
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const fbUser = await signInWithGoogleFirebase();
      setIsLoading(false);
      onLoginSuccess({
        uid: fbUser.uid,
        email: fbUser.email,
        name: fbUser.name,
      });
      return;
    } catch (err: any) {
      const code = String(err?.code || err?.message || '');
      if (code !== 'FIREBASE_NOT_CONFIGURED') {
        setIsLoading(false);
        if (code.includes('popup-closed-by-user')) {
          setErrorMessage('Login com Google cancelado. Tente novamente.');
        } else {
          setErrorMessage('Não foi possível autenticar com o Google. Verifique se o provedor Google está ativo no Firebase.');
        }
        return;
      }
    }

    setIsLoading(false);
    setErrorMessage('Firebase Auth não configurado neste ambiente.');
  };

  // Login com Celular ou E-mail e Senha
  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (loginMethod === 'phone') {
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        setErrorMessage('Por favor, informe um número de celular válido com DDD.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('Por favor, digite sua senha de acesso (mínimo 6 caracteres).');
        return;
      }

      setIsLoading(true);
      try {
        const phoneEmail = `${cleanDigits}@celular.opensketch.app`;
        const fbUser = await signInWithEmailFirebase(phoneEmail, password);
        setIsLoading(false);
        onLoginSuccess({
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.name || 'Usuário Celular',
        });
      } catch {
        setIsLoading(false);
        setErrorMessage('Celular ou senha incorretos.');
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Por favor, digite um endereço de e-mail válido.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('Por favor, digite sua senha de acesso (mínimo 6 caracteres).');
        return;
      }

      setIsLoading(true);
      try {
        const fbUser = await signInWithEmailFirebase(email.trim(), password);
        setIsLoading(false);
        onLoginSuccess({
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.name,
        });
      } catch (err: any) {
        setIsLoading(false);
        const code = String(err?.code || '');
        if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
          setErrorMessage(
            'E-mail ou senha inválidos. Se você já entrou com o Google nesta conta (sem senha cadastrada), clique em "Continuar com o Google" ou use "Esqueci minha senha".'
          );
        } else {
          setErrorMessage('Não foi possível entrar agora. Tente novamente.');
        }
      }
    }
  };

  // Envio de Instruções de Redefinição de Senha
  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryInput.trim() || !recoveryInput.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido cadastrado.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await sendPasswordResetFirebase(recoveryInput.trim());
      setIsLoading(false);
      setRecoverySuccess(true);
    } catch {
      setIsLoading(false);
      setErrorMessage('Não foi possível enviar o e-mail de recuperação. Verifique o endereço informado.');
    }
  };

  return (
    <div
      className="auth-screen-container"
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#121417',
        color: '#D9DEE4',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ================= PAINEL ESQUERDO: APRESENTAÇÃO INSTITUCIONAL & DEPOIMENTO ================= */}
      <div
        className="auth-left-panel"
        style={{
          flex: '1 1 50%',
          backgroundColor: '#090B0E',
          borderRight: '1px solid #1E293B',
          padding: '48px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grade de fundo sutil */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.06,
            backgroundImage: `radial-gradient(#3B5B78 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        {/* Logotipo Superior opensketch */}
        <div style={{ zIndex: 2 }}>
          <img
            src="/assets/opensketch-logo.svg"
            alt="opensketch"
            style={{ height: '36px', width: 'auto', display: 'block' }}
          />
        </div>

        {/* Ondas vetoriais estilizadas em Azul-Ardósia */}
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '-15%',
            width: '130%',
            height: '380px',
            pointerEvents: 'none',
            opacity: 0.24,
          }}
        >
          <svg viewBox="0 0 900 450" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <path d="M0 400 C300 370, 520 200, 900 80" stroke="#3B5B78" strokeWidth="1.5" />
            <path d="M0 420 C320 390, 550 230, 900 110" stroke="#4A7296" strokeWidth="1.2" />
            <path d="M0 440 C340 410, 570 260, 900 140" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="6 6" />
            <path d="M0 380 C280 340, 490 160, 900 40" stroke="#3B5B78" strokeWidth="2" />
          </svg>
        </div>

        {/* Mensagem Institucional Oficial ESCORP I.D.S. */}
        <div style={{ zIndex: 2, maxWidth: '480px' }}>
          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: '19px',
              fontWeight: 400,
              lineHeight: 1.6,
              color: '#E2E8F0',
              fontStyle: 'normal',
            }}
          >
            “Mais do que um caderno, o parceiro inteligente que orienta seus negócios e sua experiência no dia a dia.”
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '24px', height: '2px', backgroundColor: '#4A7296' }} />
            <div style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.02em' }}>
              <span style={{ color: '#FFFFFF', fontWeight: 700 }}>ESCORP I.D.S.</span>
              <span style={{ color: '#64748B', margin: '0 8px' }}>—</span>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>Sua visão, nosso resultado.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= PAINEL DIREITO: TELA DE LOGIN MINIMALISTA EM PORTUGUÊS ================= */}
      <div
        className="auth-right-panel"
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '48px 32px',
          backgroundColor: '#11151C',
          position: 'relative',
        }}
      >
        {/* Link < Início no Topo */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '48px',
            fontSize: '14px',
            color: '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            transition: 'color 0.15s ease',
          }}
          onClick={() => {
            if (isForgotPassword) {
              setIsForgotPassword(false);
              setRecoverySuccess(false);
              setErrorMessage(null);
            } else if (onNavigateHome) {
              onNavigateHome();
            }
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F8FAFC')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>‹</span> Início
        </div>

        <div style={{ width: '100%', maxWidth: '390px' }}>
          {/* ================= FLUXO 1: RECUPERAR SENHA ================= */}
          {isForgotPassword ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h1
                  style={{
                    fontSize: '26px',
                    fontWeight: 700,
                    color: '#D9DEE4',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Recuperar Senha
                </h1>
                <p style={{ margin: 0, fontSize: '14px', color: '#8A96A3', lineHeight: 1.5 }}>
                  Informe seu e-mail ou celular cadastrado para receber as instruções de acesso.
                </p>
              </div>

              {recoverySuccess ? (
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10B981',
                    borderRadius: '10px',
                    padding: '20px',
                    textAlign: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>✓</span>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#FFFFFF', fontWeight: 600 }}>
                    Instruções Enviadas!
                  </h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#A7F3D0', lineHeight: 1.5 }}>
                    Enviamos um link de redefinição para <strong>{recoveryInput}</strong>. Verifique sua caixa de entrada ou SMS para continuar.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendRecovery}>
                  {errorMessage && (
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #EF4444',
                        borderRadius: '8px',
                        color: '#FCA5A5',
                        fontSize: '13px',
                        marginBottom: '16px',
                        textAlign: 'center',
                      }}
                    >
                      {errorMessage}
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#CBD5E1',
                        marginBottom: '8px',
                      }}
                    >
                      E-mail ou Celular cadastrado
                    </label>
                    <input
                      id="recovery-input"
                      name="recovery-identifier"
                      autoComplete="username"
                      type="text"
                      placeholder="seu.email@exemplo.com ou (DDD) 9XXXX-XXXX"
                      value={recoveryInput}
                      onChange={(e) => {
                        setRecoveryInput(e.target.value);
                        setErrorMessage(null);
                      }}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '13px 16px',
                        backgroundColor: '#0D0E11',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#1E252F',
                      color: '#FFFFFF',
                      border: '1px solid #3D5A73',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) e.currentTarget.style.backgroundColor = '#27323F';
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) e.currentTarget.style.backgroundColor = '#1E252F';
                    }}
                  >
                    {isLoading ? 'Enviando...' : 'Enviar Instruções'}
                  </button>
                </form>
              )}

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setRecoverySuccess(false);
                    setErrorMessage(null);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#93C5FD',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  ← Voltar para a tela de login
                </button>
              </div>
            </div>
          ) : (
            /* ================= FLUXO 2: TELA PRINCIPAL DE LOGIN ================= */
            <div>
              {/* Título e Subtítulo em Português */}
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#D9DEE4',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Entrar na sua conta
                </h1>
                <p style={{ margin: 0, fontSize: '14px', color: '#8A96A3' }}>
                  Acesse ou crie seu perfil no opensketch
                </p>
              </div>

              {/* Mensagem de Erro */}
              {errorMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #EF4444',
                    borderRadius: '8px',
                    color: '#FCA5A5',
                    fontSize: '13px',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* 1. Botão Principal: Continuar com o Google (Fundo Claro de Alto Contraste) */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '13px 16px',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(255,255,255,0.15)',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'Conectando...' : 'Continuar com o Google'}</span>
              </button>

              {/* Divisor "OU" */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '22px 0',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                <div style={{ flex: 1, height: '1px', backgroundColor: '#272C34' }} />
                <span style={{ padding: '0 12px' }}>OU</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#272C34' }} />
              </div>

              {/* Seletor em Pílulas: Celular ou E-mail */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  backgroundColor: '#0D0E11',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid #272C34',
                  marginBottom: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('phone');
                    setErrorMessage(null);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: loginMethod === 'phone' ? '#1E252F' : 'transparent',
                    border: loginMethod === 'phone' ? '1px solid #3D5A73' : '1px solid transparent',
                    color: loginMethod === 'phone' ? '#FFFFFF' : '#8A96A3',
                    fontSize: '13px',
                    fontWeight: loginMethod === 'phone' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>📱</span>
                  <span>Celular</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('email');
                    setErrorMessage(null);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: loginMethod === 'email' ? '#1E252F' : 'transparent',
                    border: loginMethod === 'email' ? '1px solid #3D5A73' : '1px solid transparent',
                    color: loginMethod === 'email' ? '#FFFFFF' : '#8A96A3',
                    fontSize: '13px',
                    fontWeight: loginMethod === 'email' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>✉️</span>
                  <span>E-mail</span>
                </button>
              </div>

              {/* Formulário de Acesso por Celular ou E-mail */}
              <form onSubmit={handleCredentialLogin}>
                {loginMethod === 'phone' ? (
                  /* Campo Celular */
                  <div style={{ marginBottom: '14px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#CBD5E1',
                        marginBottom: '6px',
                        textAlign: 'left',
                      }}
                    >
                      Número de Celular (com DDD)
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#0D0E11',
                        border: '1px solid #272C34',
                        borderRadius: '8px',
                        padding: '0 14px',
                      }}
                    >
                      <span style={{ color: '#64748B', fontSize: '14px', marginRight: '8px' }}>🇧🇷</span>
                      <input
                        id="login-phone"
                        name="phone"
                        autoComplete="tel"
                        type="tel"
                        placeholder="(DDD) 9XXXX-XXXX"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 0',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  /* Campo E-mail */
                  <div style={{ marginBottom: '14px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#CBD5E1',
                        marginBottom: '6px',
                        textAlign: 'left',
                      }}
                    >
                      Endereço de E-mail
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#0D0E11',
                        border: '1px solid #272C34',
                        borderRadius: '8px',
                        padding: '0 14px',
                      }}
                    >
                      <span style={{ color: '#64748B', fontSize: '14px', marginRight: '8px' }}>@</span>
                      <input
                        id="login-email"
                        name="email"
                        autoComplete="username"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        value={email}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\s+/g, '');
                          const atParts = val.split('@');
                          const cleaned = atParts.length > 2 ? `${atParts[0]}@${atParts[1]}` : val;
                          setEmail(cleaned);
                          setErrorMessage(null);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 0',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Campo Senha */}
                <div style={{ marginBottom: '8px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '6px',
                      textAlign: 'left',
                    }}
                  >
                    Senha de Acesso
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#0D0E11',
                      border: '1px solid #272C34',
                      borderRadius: '8px',
                      padding: '0 14px',
                    }}
                  >
                    <span style={{ color: '#64748B', fontSize: '14px', marginRight: '8px' }}>🔒</span>
                    <input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMessage(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#8A96A3',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '4px',
                      }}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Link Esqueci Minha Senha */}
                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setRecoveryInput(loginMethod === 'phone' ? phone : email);
                      setErrorMessage(null);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#93C5FD',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {/* Botão de Ação: Entrar */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '13px',
                    backgroundColor: '#1E252F',
                    color: '#FFFFFF',
                    border: '1px solid #3D5A73',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) e.currentTarget.style.backgroundColor = '#27323F';
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) e.currentTarget.style.backgroundColor = '#1E252F';
                  }}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              {/* Link de Navegação para a Rota de Cadastro (/cadastro) */}
              <div style={{ textAlign: 'center', marginTop: '18px' }}>
                <span style={{ fontSize: '13px', color: '#8A96A3' }}>
                  Ainda não tem conta?{' '}
                </span>
                <button
                  type="button"
                  onClick={onNavigateRegister}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#38BDF8',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Criar conta
                </button>
              </div>

              {/* Rodapé Legal */}
              <p
                style={{
                  marginTop: '28px',
                  fontSize: '12px',
                  color: '#64748B',
                  textAlign: 'center',
                  lineHeight: 1.5,
                }}
              >
                Ao continuar, você concorda com os{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalTab('termos')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#93C5FD',
                    textDecoration: 'underline',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Termos de Uso
                </button>{' '}
                e a{' '}
                <button
                  type="button"
                  onClick={() => setLegalModalTab('privacidade')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#93C5FD',
                    textDecoration: 'underline',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Política de Privacidade
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      <LegalModal
        isOpen={legalModalTab !== null}
        initialTab={legalModalTab || 'privacidade'}
        onClose={() => setLegalModalTab(null)}
      />
    </div>
  );
};
