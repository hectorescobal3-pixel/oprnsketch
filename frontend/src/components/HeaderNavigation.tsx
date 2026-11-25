import React, { useState, useRef, useEffect } from 'react';
import { SubscriptionPlan } from '../services/user-plan-service';

export type WorkspaceContext = {
  type: 'PERSONAL' | 'CORPORATE';
  organizationId?: string;
  organizationName?: string;
  role?: 'ADMIN' | 'OPERATOR' | 'VIEWER';
};

interface HeaderNavigationProps {
  currentContext: WorkspaceContext;
  onSwitchContext?: (newContext: WorkspaceContext) => void;
  userEmail: string;
  displayName?: string;
  onNavigateHome?: () => void;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
  userPlan?: SubscriptionPlan;
  isOwner?: boolean;
  onRequestUpgrade?: (requiredPlan: 'essential_monthly' | 'pro_lifetime', featureName: string) => void;
}

function formatUserIdentity(displayName: string | undefined, userEmail: string): string {
  const cleanName = (displayName || '').trim();
  if (cleanName) return cleanName;
  if (userEmail && userEmail.endsWith('@celular.opensketch.app')) {
    const digits = userEmail.split('@')[0].replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return digits || userEmail;
  }
  return userEmail;
}

export const HeaderNavigation: React.FC<HeaderNavigationProps> = ({
  currentContext,
  onSwitchContext,
  userEmail,
  displayName,
  onNavigateHome,
  onLogout,
  onToggleMobileMenu,
  userPlan = 'free',
  isOwner = false,
  onRequestUpgrade,
}) => {
  const isCorporate = currentContext.type === 'CORPORATE';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: '#121417',
        borderBottom: '1px solid #1C1E22',
        borderLeft: isCorporate ? '4px solid #3D5A73' : '4px solid #64748B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Posicionamento Fixo e Obrigatório da Logo - Clicável para retornar ao "Início" */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Abrir menu de navegação"
            title="Abrir Menu de Módulos"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
              backgroundColor: '#1C1E22',
              border: '1px solid #272C34',
              borderRadius: '8px',
              color: '#D9DEE4',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
        )}
        <div
          onClick={onNavigateHome}
          title="Clique para ir para o Início"
          role="button"
          tabIndex={0}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'background-color 0.2s ease, transform 0.15s ease',
            userSelect: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1C1E22';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onNavigateHome?.();
            }
          }}
        >
          <img
            src="/assets/opensketch-logo.svg"
            alt="opensketch"
            style={{
              height: '32px',
              width: 'auto',
              display: 'block',
            }}
          />
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '22px', backgroundColor: '#272C34' }} />

        {/* Dynamic Context Badge & Quick Environment Switcher */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setIsMenuOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isCorporate ? '#1C1E22' : '#16191E',
              border: `1px solid ${isCorporate ? '#3D5A73' : '#272C34'}`,
              padding: '5px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#D9DEE4',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = isCorporate ? '#60A5FA' : '#34D399';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = isCorporate ? '#3D5A73' : '#272C34';
            }}
            title="Clique para alternar o ambiente de trabalho"
          >
            <span>{isCorporate ? '🏢' : '👤'}</span>
            <span>
              {isCorporate
                ? `${currentContext.organizationName || 'Minha Empresa'}`
                : 'Meu Trabalho'}
            </span>
            <span style={{ fontSize: '10px', color: '#8A96A3', transform: isMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
          </div>

          {/* Dropdown Menu Flutuante */}
          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '240px',
                backgroundColor: '#1C1E22',
                border: '1px solid #334155',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                zIndex: 100,
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ padding: '6px 10px', fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Alternar Ambiente
              </div>

              {/* Opção Meu Trabalho */}
              {(isOwner || userPlan === 'pro_lifetime' || !isCorporate) && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onSwitchContext && isCorporate && (isOwner || userPlan === 'pro_lifetime')) {
                    onSwitchContext({ type: 'PERSONAL' });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !isCorporate ? '#27323F' : 'transparent',
                  color: !isCorporate ? '#FFFFFF' : '#94A3B8',
                  fontWeight: !isCorporate ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (isCorporate) e.currentTarget.style.backgroundColor = '#232932';
                }}
                onMouseLeave={(e) => {
                  if (isCorporate) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>👤</span>
                <span>Meu Trabalho (Individual)</span>
                {!isCorporate && <span style={{ marginLeft: 'auto', color: '#10B981', fontSize: '12px' }}>✓</span>}
              </button>
              )}

              {/* Opção Minha Empresa */}
              {(isOwner || userPlan === 'pro_lifetime' || (userPlan === 'essential_monthly' && isCorporate)) && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (!isOwner && userPlan !== 'pro_lifetime' && userPlan !== 'essential_monthly' && onRequestUpgrade) {
                    onRequestUpgrade('pro_lifetime', 'Ambiente Minha Empresa');
                    return;
                  }
                  if (onSwitchContext && !isCorporate) {
                    onSwitchContext({
                      type: 'CORPORATE',
                      organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                      organizationName: 'Minha Empresa',
                      role: 'ADMIN',
                    });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isCorporate ? '#27323F' : 'transparent',
                  color: isCorporate ? '#FFFFFF' : '#94A3B8',
                  fontWeight: isCorporate ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!isCorporate) e.currentTarget.style.backgroundColor = '#232932';
                }}
                onMouseLeave={(e) => {
                  if (!isCorporate) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>🏢</span>
                <span>Minha Empresa (Corporativo)</span>
                {isCorporate && <span style={{ marginLeft: 'auto', color: '#60A5FA', fontSize: '12px' }}>✓</span>}
              </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Right Side: Clean User Info & Logout (Switcher movido exclusivamente para Configurações) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#D9DEE4', fontWeight: 500 }}>
            {formatUserIdentity(displayName, userEmail)}
          </span>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Encerrar Sessão"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #272C34',
                color: '#8A96A3',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#E11D48';
                e.currentTarget.style.color = '#E11D48';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#272C34';
                e.currentTarget.style.color = '#8A96A3';
              }}
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
