import React, { useEffect, useState } from 'react';

interface EnvironmentTransitionOverlayProps {
  targetEnvironmentName: string;
  onTransitionComplete: () => void;
}

export const EnvironmentTransitionOverlay: React.FC<EnvironmentTransitionOverlayProps> = ({
  targetEnvironmentName,
  onTransitionComplete,
}) => {
  const [phase, setPhase] = useState<'entering' | 'pulsing' | 'exiting'>('entering');

  useEffect(() => {
    // 1. Enter and start pulse
    const t1 = setTimeout(() => setPhase('pulsing'), 100);
    // 2. Start exit fade
    const t2 = setTimeout(() => setPhase('exiting'), 650);
    // 3. Complete and unmount
    const t3 = setTimeout(() => onTransitionComplete(), 850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onTransitionComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#121417',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase === 'exiting' ? 0 : 1,
        transition: 'opacity 0.2s ease-in-out',
        pointerEvents: 'all',
      }}
    >
      {/* Monogram Logo with Glow */}
      <div
        style={{
          width: '96px',
          height: '96px',
          transform: phase === 'pulsing' ? 'scale(1.08)' : 'scale(0.95)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: 'drop-shadow(0 0 24px rgba(61, 90, 115, 0.6))',
          marginBottom: '24px',
        }}
      >
        <img
          src="/assets/opensketch-monogram.svg"
          alt="Transição opensketch"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Target Title */}
      <h3
        style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: 600,
          color: '#D9DEE4',
          letterSpacing: '-0.01em',
        }}
      >
        Alternando para {targetEnvironmentName}
      </h3>

      {/* Technical Subtitle */}
      <span
        style={{
          fontSize: '12px',
          color: '#8A96A3',
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 8px #10B981',
          }}
        />
        Ativando Bounded Context Corporativo • PostgreSQL RLS Tenant Scoped
      </span>
    </div>
  );
};
