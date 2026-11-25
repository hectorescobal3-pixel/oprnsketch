import React, { useEffect, useState } from 'react';
import { LegalModal, LegalTab } from './LegalModal';
import {
  registerWithEmailFirebase,
  signInWithGoogleFirebase,
} from '../services/firebase-client';
import { completePaidActivation, validatePaidActivation } from '../services/user-plan-service';

interface RegisterScreenProps {
  onRegisterSuccess: (user: { uid?: string; email: string; name: string }) => void;
  onNavigateLogin: () => void;
  onNavigateHome?: () => void;
  activationToken?: string | null;
  activationRef?: string | null;
  prefilledEmail?: string | null;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegisterSuccess,
  onNavigateLogin,
  onNavigateHome,
  activationToken = null,
  activationRef = null,
  prefilledEmail = null,
}) => {
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activationState, setActivationState] = useState<{
    checked: boolean;
    valid: boolean;
    plan?: 'essential_monthly' | 'pro_lifetime';
    resolvedToken?: string;
    notice?: string;
  }>({ checked: false, valid: false });

  useEffect(() => {
    if (!activationToken && !activationRef) return;
    let cancelled = false;
    validatePaidActivation({ token: activationToken, ref: activationRef }).then((res) => {
      if (cancelled) return;
      if (res.valid) {
        if (res.name) setFullName(res.name);
        if (res.email) setEmail(res.email);
        setActivationState({
          checked: true,
          valid: true,
          plan: res.plan,
          resolvedToken: res.activationToken || activationToken || undefined,
          notice: `Pagamento confirmado (${
            res.plan === 'pro_lifetime' ? 'Plano Completo Vitalício' : 'Plano Essencial Mensal'
          }). Defina sua senha abaixo para liberar o acesso imediato.`,
        });
      } else {
        setActivationState({
          checked: true,
          valid: false,
          notice: res.message,
        });
        setErrorMessage(res.message || 'Link de ativação inválido ou já utilizado.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activationToken, activationRef]);

  // Cadastro com Google (Firebase Auth)
  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fbUser = await signInWithGoogleFirebase();
      if (activationToken || activationRef || activationState.resolvedToken) {
        await completePaidActivation({
          token: activationState.resolvedToken || activationToken,
          ref: activationRef,
          uid: fbUser.uid,
          email: fbUser.email,
        });
      }
      setIsLoading(false);
      onRegisterSuccess({
        uid: fbUser.uid,
        email: fbUser.email,
        name: fbUser.name,
      });
    } catch (err: any) {
      setIsLoading(false);
      const code = String(err?.code || '');
      if (code.includes('popup-closed-by-user')) {
        setErrorMessage('Cadastro com Google cancelado. Tente novamente.');
      } else if (err?.message && !code.startsWith('auth/')) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Não foi possível autenticar com o Google. Verifique sua conexão ou tente com e-mail e senha.');
      }
    }
  };

  // Cadastro com Formulário Completo (Firebase Auth)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Por favor, crie uma senha com pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setIsLoading(true);
    try {
      const fbUser = await registerWithEmailFirebase(fullName.trim(), email.trim(), password);
      if (activationToken || activationRef || activationState.resolvedToken) {
        await completePaidActivation({
          token: activationState.resolvedToken || activationToken,
          ref: activationRef,
          uid: fbUser.uid,
          email: fbUser.email,
        });
      }
      setIsLoading(false);
      if (rememberPassword) {
        try {
          localStorage.setItem('opensketch_remember_user', email.trim());
        } catch (_) {}
      }
      onRegisterSuccess({
        uid: fbUser.uid,
        email: fbUser.email,
        name: fbUser.name,
      });
    } catch (err: any) {
      setIsLoading(false);
      const code = String(err?.code || '');
      if (code.includes('email-already-in-use')) {
        setErrorMessage('Este e-mail já está cadastrado. Clique em "Entrar" abaixo para acessar sua conta.');
      } else if (code.includes('weak-password')) {
        setErrorMessage('A senha precisa ter pelo menos 6 caracteres.');
      } else if (err?.message && !code.startsWith('auth/')) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Não foi possível concluir o cadastro agora. Verifique os dados e tente novamente.');
      }
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
      {/* ================= PAINEL ESQUERDO: APRESENTAÇÃO INSTITUCIONAL ESCORP I.D.S. ================= */}
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
        {/* Grade sutil de fundo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.05,
            backgroundImage: `radial-gradient(#3D5A73 1px, transparent 1px)`,
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

        {/* Ondas vetoriais estilizadas */}
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '-15%',
            width: '130%',
            height: '380px',
            pointerEvents: 'none',
            opacity: 0.16,
          }}
        >
          <svg viewBox="0 0 900 450" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <path d="M0 400 C300 370, 520 200, 900 80" stroke="#3D5A73" strokeWidth="1.5" />
            <path d="M0 420 C320 390, 550 230, 900 110" stroke="#4A6D8C" strokeWidth="1.2" />
            <path d="M0 440 C340 410, 570 260, 900 140" stroke="#D9DEE4" strokeWidth="0.8" strokeDasharray="6 6" />
            <path d="M0 380 C280 340, 490 160, 900 40" stroke="#2C4257" strokeWidth="2" />
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

      {/* ================= PAINEL DIREITO: FORMULÁRIO DE CADASTRO (/CADASTRO) ================= */}
      <div
        className="auth-right-panel"
        style={{
          flex: '1 1 50%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 32px',
          backgroundColor: '#11151C',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Link < Início no Topo */}
        <div
          style={{
            position: 'absolute',
            top: '32px',
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
          onClick={onNavigateHome || onNavigateLogin}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F8FAFC')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>‹</span> Início
        </div>

        <div style={{ width: '100%', maxWidth: '390px', marginTop: '16px', marginBottom: '16px' }}>
          {/* Título e Subtítulo */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#D9DEE4',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Criar sua conta
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#8A96A3' }}>
              Preencha seus dados para começar no opensketch
            </p>
          </div>

          {/* Mensagem de Erro / Validação */}
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
                lineHeight: 1.4,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* 1. Botão Continuar com o Google no Topo */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
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
              margin: '18px 0',
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

          {/* Formulário de Cadastro */}
          <form onSubmit={handleSubmit}>
            {/* Campo 1: Seu Nome */}
            <div style={{ marginBottom: '12px' }}>
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
                Seu Nome
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
                <span style={{ color: '#64748B', fontSize: '14px', marginRight: '8px' }}>👤</span>
                <input
                  id="register-fullname"
                  name="name"
                  autoComplete="name"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrorMessage(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Campo 2: E-mail */}
            <div style={{ marginBottom: '12px' }}>
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
                E-mail
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
                  id="register-email"
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
                    padding: '11px 0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Campo 3: Senha */}
            <div style={{ marginBottom: '12px' }}>
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
                Senha
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
                  id="register-password"
                  name="new-password"
                  autoComplete="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Crie sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 0',
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

            {/* Campo 4: Confirmar Senha */}
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
                Confirmar Senha
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
                  id="register-confirm-password"
                  name="confirm-password"
                  autoComplete="new-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha novamente"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 0',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  title={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#8A96A3',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px',
                  }}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Checkbox: Lembrar minha senha */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setRememberPassword((prev) => !prev)}
            >
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={() => {}} // tratado no onClick do container
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#38BDF8',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 500 }}>
                Lembrar minha senha
              </span>
            </div>

            {/* Botão Principal: Criar Conta */}
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
              {isLoading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          {/* Link de Retorno: Já tem uma conta? Entrar */}
          <div style={{ textAlign: 'center', marginTop: '18px' }}>
            <span style={{ fontSize: '13px', color: '#8A96A3' }}>
              Já tem uma conta?{' '}
            </span>
            <button
              type="button"
              onClick={onNavigateLogin}
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
              Entrar
            </button>
          </div>

          {/* Rodapé Legal */}
          <p
            style={{
              marginTop: '22px',
              fontSize: '12px',
              color: '#94A3B8',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Ao continuar, você concorda com nossos{' '}
            <button
              type="button"
              onClick={() => setLegalModalTab('termos')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#4A7296',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Termos de Uso
            </button>{' '}
            e{' '}
            <button
              type="button"
              onClick={() => setLegalModalTab('privacidade')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#4A7296',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Política de Privacidade
            </button>
            .
          </p>
        </div>
      </div>

      {legalModalTab && (
        <LegalModal isOpen={true} initialTab={legalModalTab} onClose={() => setLegalModalTab(null)} />
      )}
    </div>
  );
};
