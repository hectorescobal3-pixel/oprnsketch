import React from 'react';
import { SubscriptionPlan } from '../services/user-plan-service';

export type NavigationModuleId =
  | 'inicio'
  | 'clientes'
  | 'prospeccao'
  | 'financeiro'
  | 'anuncios'
  | 'metas'
  | 'biblioteca'
  | 'perfil'
  | 'configuracoes';

export interface ModuleItem {
  id: NavigationModuleId;
  label: string;
  icon: string;
  isExclusiveCorporate?: boolean;
  requiredPlan?: 'essential_monthly' | 'pro_lifetime';
  badgeLabel?: string;
}

interface SidebarProps {
  currentEnvironment: 'PERSONAL' | 'CORPORATE';
  activeModule: NavigationModuleId;
  onSelectModule: (id: NavigationModuleId) => void;
  displayName?: string;
  userPlan?: SubscriptionPlan;
  isOwner?: boolean;
  onRequestUpgrade?: (requiredPlan: 'essential_monthly' | 'pro_lifetime', featureName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentEnvironment,
  activeModule,
  onSelectModule,
  displayName,
  userPlan = 'free',
  isOwner = false,
  onRequestUpgrade,
}) => {
  // Módulos de "Meu Trabalho" (3 base gratuitos + 2 extras com cadeado no plano free)
  const personalModules: ModuleItem[] = [
    { id: 'inicio', label: 'Início', icon: '🏠' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    {
      id: 'prospeccao',
      label: 'Prospecção & Mercado B2B',
      icon: '🚀',
      requiredPlan: 'essential_monthly',
      badgeLabel: 'PRO / Essencial',
    },
    {
      id: 'financeiro',
      label: 'Comissão & Desconto',
      icon: '📊',
    },
    { id: 'anuncios', label: 'Anúncios', icon: '📢' },
    { id: 'metas', label: 'Metas e Objetivos', icon: '🎯' },
    {
      id: 'biblioteca',
      label: 'Biblioteca & Playbooks Comerciais',
      icon: '📚',
    },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
  ];

  // Módulos de "Minha Empresa" (inclui Centro de Inteligência Financeira & Margem)
  const corporateModules: ModuleItem[] = [
    { id: 'inicio', label: 'Início', icon: '🏠' },
    { id: 'clientes', label: 'Clientes', icon: '👥' },
    {
      id: 'prospeccao',
      label: 'Prospecção & Mercado B2B',
      icon: '🚀',
      isExclusiveCorporate: true,
      requiredPlan: 'essential_monthly',
      badgeLabel: 'CORP',
    },
    {
      id: 'financeiro',
      label: 'Centro de Inteligência Financeira & Margem',
      icon: '📊',
      isExclusiveCorporate: true,
      requiredPlan: 'pro_lifetime',
      badgeLabel: 'VITALÍCIO',
    },
    { id: 'anuncios', label: 'Anúncios', icon: '📢' },
    { id: 'metas', label: 'Metas e Objetivos', icon: '🎯' },
    {
      id: 'biblioteca',
      label: 'Biblioteca & Playbooks Comerciais',
      icon: '📚',
    },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
  ];

  const isModuleLocked = (mod: ModuleItem): boolean => {
    if (isOwner || userPlan === 'pro_lifetime') return false;
    if (userPlan === 'free') {
      return mod.id === 'prospeccao';
    }
    if (userPlan === 'essential_monthly') {
      return currentEnvironment === 'CORPORATE' && mod.requiredPlan === 'pro_lifetime';
    }
    return true;
  };

  const modules = currentEnvironment === 'CORPORATE' ? corporateModules : personalModules;

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#121417',
        borderRight: '1px solid #1C1E22',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px 12px',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <div>
        {/* Environment Tag */}
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '16px',
            backgroundColor: currentEnvironment === 'CORPORATE' ? '#1C1E22' : '#16191E',
            border: `1px solid ${currentEnvironment === 'CORPORATE' ? '#2C4257' : '#272C34'}`,
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: currentEnvironment === 'CORPORATE' ? '#93C5FD' : '#D9DEE4',
              marginBottom: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={displayName?.trim() || (currentEnvironment === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho')}
          >
            {currentEnvironment === 'CORPORATE' ? '🏢 ' : '👤 '}
            {displayName?.trim() || (currentEnvironment === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho')}
          </div>
          <div style={{ fontSize: '11px', color: '#8A96A3', fontWeight: 500 }}>
            {modules.filter((m) => !isModuleLocked(m)).length} Módulos Ativos
          </div>
        </div>

        {/* Modules List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {modules.map((mod) => {
            const locked = isModuleLocked(mod);
            const isActive = !locked && activeModule === mod.id;

            return (
              <button
                key={mod.id}
                onClick={() => {
                  if (locked && mod.requiredPlan && onRequestUpgrade) {
                    onRequestUpgrade(mod.requiredPlan, mod.label);
                    return;
                  }
                  onSelectModule(mod.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: isActive ? '#1C1E22' : 'transparent',
                  color: isActive ? '#D9DEE4' : locked ? '#64748B' : '#8A96A3',
                  border: isActive ? '1px solid #272C34' : '1px solid transparent',
                  borderLeft: isActive ? '3px solid #3D5A73' : '3px solid transparent',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                  opacity: locked ? 0.86 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = '#16191E';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <span style={{ fontSize: '15px', flexShrink: 0 }}>{locked ? '🔒' : mod.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.label}</span>
                </div>

                {(locked || mod.isExclusiveCorporate) && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      backgroundColor: locked ? '#1E293B' : '#2C4257',
                      color: locked ? '#94A3B8' : '#D9DEE4',
                      borderRadius: '4px',
                      border: locked ? '1px solid #3B5B78' : '1px solid #3D5A73',
                      flexShrink: 0,
                    }}
                  >
                    {locked ? mod.badgeLabel || 'PRO' : 'CORP'}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid #1C1E22',
          fontSize: '11px',
          color: '#5C6670',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>v0.1 • ESCORP</span>
        <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          Online
        </span>
      </div>
    </aside>
  );
};
