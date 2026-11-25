import React, { useState } from 'react';
import { WorkspaceContext } from './HeaderNavigation';
import { SubscriptionPlan } from '../services/user-plan-service';

interface EnvironmentSelectionScreenProps {
  onSelectEnvironment: (context: WorkspaceContext) => void;
  userEmail: string;
  userPlan?: SubscriptionPlan;
  isOwner?: boolean;
  onRequestUpgrade?: (requiredPlan: 'essential_monthly' | 'pro_lifetime', featureName: string) => void;
}

export const EnvironmentSelectionScreen: React.FC<EnvironmentSelectionScreenProps> = ({
  onSelectEnvironment,
  userEmail,
  userPlan = 'free',
  isOwner = false,
  onRequestUpgrade,
}) => {
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const isCorporateLocked = !isOwner && userPlan !== 'pro_lifetime';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#121417',
        color: '#D9DEE4',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Top Header Logo */}
      <div style={{ position: 'absolute', top: '32px', left: '40px' }}>
        <img
          src="/assets/opensketch-logo.svg"
          alt="opensketch"
          style={{ height: '32px', width: 'auto' }}
        />
      </div>

      <div style={{ position: 'absolute', top: '36px', right: '40px', fontSize: '13px', color: '#8A96A3' }}>
        {userEmail}
      </div>

      {/* Title & Headline */}
      <div style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '580px' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
            color: '#D9DEE4',
          }}
        >
          Selecione o seu Ambiente de Trabalho
        </h1>
        <p style={{ margin: 0, fontSize: '15px', color: '#8A96A3', lineHeight: 1.5 }}>
          Escolha o espaço que deseja acessar agora. Seus dados, clientes e arquivos são 100% isolados entre os dois ambientes:
        </p>
        {planNotice && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 91, 120, 0.2)',
              border: '1px solid #4A7296',
              color: '#F8FAFC',
              fontSize: '13px',
            }}
          >
            {planNotice}
          </div>
        )}
      </div>

      {/* Two Independent Environment Cards (Reference: Page 2 Bottom) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 360px))',
          justifyContent: 'center',
          gap: '24px',
          maxWidth: '780px',
          width: '100%',
        }}
      >
        {/* ================= CARD 1: MEU TRABALHO (INDIVIDUAL) ================= */}
        <div
          style={{
            backgroundColor: '#1C1E22',
            border: '1px solid #272C34',
            borderRadius: '16px',
            padding: '36px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#64748B';
            e.currentTarget.style.transform = 'translateY(-3px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#272C34';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onClick={() => onSelectEnvironment({ type: 'PERSONAL' })}
        >
          {/* Luminous Orb Icon (Individual Silver/Slate) */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(217, 222, 228, 0.45) 0%, rgba(100, 116, 139, 0.2) 60%, transparent 80%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 0 28px rgba(217, 222, 228, 0.15)',
            }}
          >
            <span style={{ fontSize: '36px' }}>👤</span>
          </div>

          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: '#D9DEE4' }}>
            Meu Trabalho
          </h2>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#8A96A3',
              backgroundColor: '#121417',
              border: '1px solid #272C34',
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '16px',
            }}
          >
            Foco Individual
          </span>

          <p
            style={{
              margin: '0 0 28px 0',
              fontSize: '14px',
              color: '#8A96A3',
              lineHeight: 1.5,
              minHeight: '44px',
            }}
          >
            Organize seus clientes, anotações, arquivos e vendas individuais em um espaço só seu.
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectEnvironment({ type: 'PERSONAL' });
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#272C34',
              color: '#D9DEE4',
              border: '1px solid #3D5A73',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Acessar Meu Trabalho
          </button>
        </div>

        {/* ================= CARD 2: MINHA EMPRESA (CORPORATIVO) ================= */}
        <div
          style={{
            backgroundColor: '#1C1E22',
            border: isCorporateLocked ? '1px solid #334155' : '1px solid #2C4257',
            borderRadius: '16px',
            padding: '36px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            cursor: isCorporateLocked ? 'not-allowed' : 'pointer',
            opacity: isCorporateLocked ? 0.65 : 1,
          }}
          onMouseEnter={(e) => {
            if (isCorporateLocked) return;
            e.currentTarget.style.borderColor = '#3D5A73';
            e.currentTarget.style.boxShadow = '0 0 28px rgba(61, 90, 115, 0.35)';
            e.currentTarget.style.transform = 'translateY(-3px)';
          }}
          onMouseLeave={(e) => {
            if (isCorporateLocked) return;
            e.currentTarget.style.borderColor = '#2C4257';
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onClick={() => {
            if (isCorporateLocked) {
              if (onRequestUpgrade) {
                onRequestUpgrade('pro_lifetime', 'Ambiente Minha Empresa');
              } else {
                setPlanNotice(
                  'O ambiente Minha Empresa está bloqueado neste plano. Faça upgrade para o Plano Completo Vitalício para liberar.'
                );
              }
              return;
            }
            onSelectEnvironment({
              type: 'CORPORATE',
              organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              organizationName: 'Empresa Matriz Ltda',
              role: 'ADMIN',
            });
          }}
        >
          {/* Luminous Orb Icon (Corporate Deep Slate Blue) */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(61, 90, 115, 0.7) 0%, rgba(44, 66, 87, 0.3) 60%, transparent 80%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 0 28px rgba(61, 90, 115, 0.3)',
            }}
          >
            <span style={{ fontSize: '36px' }}>🏢</span>
          </div>

          <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 600, color: '#D9DEE4' }}>
            Minha Empresa
          </h2>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#3D5A73',
              backgroundColor: '#161E28',
              border: '1px solid #3D5A73',
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '16px',
            }}
          >
            Foco Corporativo (com Prospecção)
          </span>

          <p
            style={{
              margin: '0 0 28px 0',
              fontSize: '14px',
              color: '#8A96A3',
              lineHeight: 1.5,
              minHeight: '44px',
            }}
          >
            Gerencie sua equipe, prospecção comercial, clientes e metas da sua empresa.
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isCorporateLocked) {
                if (onRequestUpgrade) {
                  onRequestUpgrade('pro_lifetime', 'Ambiente Minha Empresa');
                } else {
                  setPlanNotice(
                    'O ambiente Minha Empresa está bloqueado neste plano. Faça upgrade para o Plano Completo Vitalício para liberar.'
                  );
                }
                return;
              }
              onSelectEnvironment({
                type: 'CORPORATE',
                organizationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                organizationName: 'Empresa Matriz Ltda',
                role: 'ADMIN',
              });
            }}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isCorporateLocked ? '#263244' : '#3D5A73',
              color: isCorporateLocked ? '#94A3B8' : '#D9DEE4',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {isCorporateLocked ? '🔒 Desbloquear no Vitalício' : 'Acessar Minha Empresa'}
          </button>
        </div>
      </div>
    </div>
  );
};
