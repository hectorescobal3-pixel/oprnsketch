import React, { useEffect, useState } from 'react';

interface PlatformSplashScreenProps {
  onInitializationComplete: () => void;
}

export const PlatformSplashScreen: React.FC<PlatformSplashScreenProps> = ({
  onInitializationComplete,
}) => {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // 1. Fade-in
    const tFadeIn = setTimeout(() => setOpacity(1), 50);
    // 2. Fade-out
    const tFadeOut = setTimeout(() => setOpacity(0), 1100);
    // 3. Complete and unmount
    const tComplete = setTimeout(() => onInitializationComplete(), 1450);

    return () => {
      clearTimeout(tFadeIn);
      clearTimeout(tFadeOut);
      clearTimeout(tComplete);
    };
  }, [onInitializationComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: opacity,
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'all',
      }}
    >
      {/* Soft circular aura glow (referência visual pág 1) */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217, 222, 228, 0.22) 0%, rgba(61, 90, 115, 0.15) 45%, rgba(0, 0, 0, 0) 70%)',
            filter: 'blur(32px)',
            pointerEvents: 'none',
          }}
        />

        {/* Central Monogram Logo */}
        <div
          style={{
            width: '90px',
            height: '90px',
            position: 'relative',
            zIndex: 2,
            filter: 'drop-shadow(0 0 20px rgba(217, 222, 228, 0.4))',
          }}
        >
          <img
            src="/assets/opensketch-monogram.svg"
            alt="opensketch"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
