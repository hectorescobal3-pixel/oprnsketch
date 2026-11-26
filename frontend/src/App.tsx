import React, { useState, useEffect } from 'react';
import { PlatformSplashScreen } from './components/PlatformSplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { EnvironmentSelectionScreen } from './components/EnvironmentSelectionScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { HeaderNavigation, WorkspaceContext } from './components/HeaderNavigation';
import { Sidebar, NavigationModuleId } from './components/Sidebar';
import { HomeOperationsCenter } from './components/HomeOperationsCenter';
import { SplitViewScreen } from './components/SplitViewScreen';
import { EnvironmentTransitionOverlay } from './components/EnvironmentTransitionOverlay';
import { PublicLegalPage } from './components/LegalModal';
import { LandingPage, PublicPageRoute, PlanType } from './components/LandingPage';
import { UpgradeCheckoutModal } from './components/UpgradeCheckoutModal';
import { PixPaymentModal, PixPaymentData } from './components/PixPaymentModal';
import {
  SubscriptionPlan,
  applyAuthenticatedPlanState,
  clearCachedOwnerState,
  clearCachedPlanForUid,
  createAnonymousPagBankCheckout,
  getCachedOwnerUnlockState,
  getCachedPlanForUid,
  initDefaultFreeUserPlan,
  isMasterOwnerEmail,
  subscribeUserPlanRealtime,
} from './services/user-plan-service';
import {
  getFirebaseAuthClient,
  signOutFirebase,
  subscribeFirebaseAuthState,
  syncWorkspaceSummaryToFirestore,
} from './services/firebase-client';

// Import Native Independent Views for each Module (Eliminating all generic placeholders)
import { ClientesView } from './views/ClientesView';
import { AnunciosView } from './views/AnunciosView';
import { MetasObjetivosView } from './views/MetasObjetivosView';
import { BibliotecaView } from './views/BibliotecaView';
import { PerfilView } from './views/PerfilView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { ProspeccaoView } from './views/ProspeccaoView';
import { FinanceiroView } from './views/FinanceiroView';

import { ExtractedInvoiceData } from './types/invoice';
import { AppStorage } from './services/app-storage';
import {
  validateAndParseUserSession,
  validateAndParseWorkspaceContext,
} from './security/session-validator';
import './styles/design-tokens.css';

const MOCK_INVOICE_DATA: ExtractedInvoiceData = {
  invoice_number: 'NFC-e 000.419.823',
  issuer_name: 'REDE DE SUPRIMENTOS TECNICOS LTDA',
  issuer_tax_id: '18.492.012/0001-84',
  issued_at: '2026-11-17',
  total_amount: 147.80,
  currency: 'BRL',
  confidence_score: 0.98,
  items: [
    {
      item_index: 1,
      description: 'Cabo de Rede Patch Cord Cat6 2.5m Blindado',
      quantity: 2,
      unit_price: 24.90,
      total_price: 49.80,
      sku_code: 'CAB-CAT6-25M',
    },
    {
      item_index: 2,
      description: 'Fita Termo-retrátil Industrial 12mm Prata',
      quantity: 1,
      unit_price: 38.00,
      total_price: 38.00,
      sku_code: 'FIT-TERMO-12MM',
    },
    {
      item_index: 3,
      description: 'Organizador de Cabos Espiral 50mm 5 Metros',
      quantity: 1,
      unit_price: 60.00,
      total_price: 60.00,
      sku_code: 'ORG-ESP-50MM',
    },
  ],
};

export const App: React.FC = () => {
  // 0. Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('opensketch_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // 0. Public Legal Routes (/privacidade e /termos — acessíveis sem login para validação OAuth)
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath === '/privacidade' || currentPath === '/privacidade/') {
      return <PublicLegalPage initialTab="privacidade" />;
    }
    if (currentPath === '/termos' || currentPath === '/termos/') {
      return <PublicLegalPage initialTab="termos" />;
    }
  }

  // 1. Initial Splash Screen State
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // 1.1 Roteamento Público: '/', '/recursos', '/blog', '/planos', '/entrar', '/cadastro', '/criar-conta', '/ativar-conta', '/privacidade', '/termos'
  type AppPublicRoute =
    | PublicPageRoute
    | '/entrar'
    | '/cadastro'
    | '/criar-conta'
    | '/ativar-conta'
    | '/privacidade'
    | '/termos';

  const normalizePublicRoute = (pathname: string): AppPublicRoute => {
    const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
    if (clean === '/como-funciona') {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/blog');
      }
      return '/blog';
    }
    if (
      clean === '/recursos' ||
      clean === '/blog' ||
      clean === '/planos' ||
      clean === '/entrar' ||
      clean === '/cadastro' ||
      clean === '/criar-conta' ||
      clean === '/ativar-conta' ||
      clean === '/privacidade' ||
      clean === '/termos'
    ) {
      return clean;
    }
    return '/';
  };

  const [publicRoute, setPublicRoute] = useState<AppPublicRoute>(() => {
    return typeof window !== 'undefined' ? normalizePublicRoute(window.location.pathname) : '/';
  });

  // 2. Authentication State with Persistence across Page Reloads (F5) & Defense in Depth
  const [currentUser, setCurrentUser] = useState<{ uid?: string; email: string; name: string } | null>(() => {
    const raw = localStorage.getItem('opensketch_current_user');
    const validated = validateAndParseUserSession(raw);
    if (!validated) {
      AppStorage.setActiveUserUid('anon');
      return null;
    }
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      const uid = typeof parsed?.uid === 'string' && parsed.uid ? parsed.uid : getFirebaseAuthClient()?.currentUser?.uid;
      AppStorage.setActiveUserUid(uid || validated.email.toLowerCase());
      return uid ? { ...validated, uid } : validated;
    } catch {
      AppStorage.setActiveUserUid(validated.email.toLowerCase());
      return validated;
    }
  });

  const [isOwner, setIsOwner] = useState<boolean>(() => {
    if (getCachedOwnerUnlockState()) return true;
    return isMasterOwnerEmail(currentUser?.email) || isMasterOwnerEmail(getFirebaseAuthClient()?.currentUser?.email);
  });
  const [userPlan, setUserPlan] = useState<SubscriptionPlan>(() => {
    if (
      getCachedOwnerUnlockState() ||
      isMasterOwnerEmail(currentUser?.email) ||
      isMasterOwnerEmail(getFirebaseAuthClient()?.currentUser?.email)
    ) {
      return 'pro_lifetime';
    }
    try {
      const raw = localStorage.getItem('opensketch_current_user');
      const parsed = raw ? JSON.parse(raw) : null;
      const uid = typeof parsed?.uid === 'string' && parsed.uid ? parsed.uid : getFirebaseAuthClient()?.currentUser?.uid;
      return getCachedPlanForUid(uid) || 'free';
    } catch {
      return 'free';
    }
  });

  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    highlightPlan: 'essential_monthly' | 'pro_lifetime';
    featureName: string | null;
  }>({
    isOpen: false,
    highlightPlan: 'pro_lifetime',
    featureName: null,
  });

  const openUpgradeModal = (
    highlightPlan: 'essential_monthly' | 'pro_lifetime' = 'pro_lifetime',
    featureName: string | null = null
  ) => {
    setUpgradeModal({ isOpen: true, highlightPlan, featureName });
  };

  const [landingCheckoutLoading, setLandingCheckoutLoading] = useState<PlanType | null>(null);
  const [landingCheckoutError, setLandingCheckoutError] = useState<string | null>(null);
  const [landingPixData, setLandingPixData] = useState<PixPaymentData | null>(null);

  const handleLandingPlanSelect = async (plan: PlanType) => {
    setLandingCheckoutError(null);
    if (plan === 'gratuito') {
      try {
        localStorage.removeItem('opensketch_pending_checkout_plan');
      } catch {}
      navigatePublic('/cadastro');
      return;
    }

    const mapped: 'essential_monthly' | 'pro_lifetime' =
      plan === 'essencial' ? 'essential_monthly' : 'pro_lifetime';

    setLandingCheckoutLoading(plan);
    try {
      const result = await createAnonymousPagBankCheckout(mapped);
      if (result.pixCopyPaste) {
        setLandingPixData({
          plan: result.plan,
          amountCents: result.amountCents,
          referenceId: result.referenceId,
          orderId: result.orderId || result.checkoutId,
          pixCopyPaste: result.pixCopyPaste,
          pixQrCodeUrl: result.pixQrCodeUrl || null,
          pixExpiresAt: result.pixExpiresAt || null,
        });
        return;
      }
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      const msg = result.message || 'Não foi possível gerar o pagamento PIX no PagBank.';
      setLandingCheckoutError(msg);
      if (typeof window !== 'undefined') window.alert(msg);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao iniciar o checkout do PagBank.';
      setLandingCheckoutError(msg);
      if (typeof window !== 'undefined') window.alert(msg);
    } finally {
      setLandingCheckoutLoading(null);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setPublicRoute(normalizePublicRoute(window.location.pathname));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigatePublic = (route: AppPublicRoute) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', route);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPublicRoute(route);
  };

  // Sincronização imediata via Firebase Auth onAuthStateChanged -> UID + POST /api/users/me/init
  useEffect(() => {
    const unsubscribeAuth = subscribeFirebaseAuthState(async (fbUser) => {
      if (!fbUser) {
        AppStorage.setActiveUserUid('anon');
        return;
      }
      AppStorage.setActiveUserUid(fbUser.uid);
      setCurrentUser((prev) => {
        if (prev?.uid && prev.uid !== fbUser.uid) {
          setIsEnvironmentSelected(false);
          setIsOnboardingActive(false);
          setActiveModule('inicio');
          setChatResetKey((k) => k + 1);
        }
        if (prev?.uid === fbUser.uid && prev?.email === fbUser.email) return prev;
        const nextUser = {
          email: fbUser.email || prev?.email || '',
          name: prev?.name || fbUser.name || '',
          uid: fbUser.uid,
        };
        try {
          localStorage.setItem('opensketch_current_user', JSON.stringify(nextUser));
        } catch {}
        return nextUser;
      });
      const cachedForUid = getCachedPlanForUid(fbUser.uid);
      if (cachedForUid && cachedForUid !== 'free') {
        setUserPlan(cachedForUid);
      }
      const isActivatingPaid =
        typeof window !== 'undefined' &&
        (window.location.pathname.includes('/criar-conta') || window.location.pathname.includes('/ativar-conta')) &&
        (window.location.search.includes('token=') || window.location.search.includes('ref='));
      if (isActivatingPaid) return;
      try {
        const res = await fetch('/api/users/me/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(fbUser.idToken ? { Authorization: `Bearer ${fbUser.idToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ email: fbUser.email, name: fbUser.name }),
        });
        if (res.ok) {
          const data = await res.json();
          const applied = applyAuthenticatedPlanState({ ...data, uid: data.uid || fbUser.uid });
          const ownerActive = Boolean(applied.isOwner || applied.role === 'owner');
          setIsOwner(ownerActive);
          setUserPlan(ownerActive ? 'pro_lifetime' : applied.plan);
          if (ownerActive) {
            try {
              localStorage.removeItem('opensketch_user_plan');
              localStorage.removeItem('opensketch_ai_quota_snapshot');
              localStorage.removeItem('opensketch_pending_checkout_plan');
            } catch {}
          }
        }
      } catch {
        // Fallback silencioso caso offline
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Listener em tempo real (Firestore onSnapshot + SSE) em users/{uid}
  useEffect(() => {
    if (!currentUser?.email) return;
    const resolvedUid = currentUser.uid || getFirebaseAuthClient()?.currentUser?.uid;
    const targetUid = resolvedUid || currentUser.email.toLowerCase();
    initDefaultFreeUserPlan({
      uid: resolvedUid,
      email: currentUser.email,
      name: currentUser.name,
    }).then((doc) => {
      const ownerActive = Boolean(doc.isOwner || doc.role === 'owner');
      setIsOwner(ownerActive);
      const nextPlan = ownerActive ? 'pro_lifetime' : doc.plan;
      setUserPlan((prev) => {
        if (nextPlan === 'free' && prev !== 'free' && !resolvedUid) {
          return prev;
        }
        return nextPlan;
      });
    });
    const unsubscribe = subscribeUserPlanRealtime(targetUid, (doc) => {
      const ownerActive = Boolean(doc.isOwner || doc.role === 'owner');
      const resolved = ownerActive ? 'pro_lifetime' : doc.plan;
      setIsOwner(ownerActive);
      setUserPlan((prev) => {
        if (prev !== resolved && resolved !== 'free') {
          setUpgradeModal((m) => ({ ...m, isOpen: false }));
          showToast(
            ownerActive
              ? '✓ Acesso Owner Master ativo! Todos os módulos e cota ilimitada liberados.'
              : resolved === 'pro_lifetime'
              ? '✓ Plano Completo Vitalício confirmado! Todos os módulos foram desbloqueados.'
              : '✓ Plano Essencial Mensal confirmado! Módulos extras de Meu Trabalho desbloqueados.'
          );
        }
        return resolved;
      });
    }, currentUser.email);
    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.email]);

  const saveUserSession = (user: { uid?: string; email: string; name: string } | null) => {
    if (user) {
      const validated = validateAndParseUserSession(JSON.stringify(user));
      if (validated) {
        const sessionObj = user.uid ? { ...validated, uid: user.uid } : validated;
        AppStorage.setActiveUserUid(user.uid || validated.email.toLowerCase());
        setCurrentUser(sessionObj);
        localStorage.setItem('opensketch_current_user', JSON.stringify(sessionObj));
      } else {
        AppStorage.setActiveUserUid('anon');
        setCurrentUser(null);
        localStorage.removeItem('opensketch_current_user');
      }
    } else {
      clearCachedPlanForUid(currentUser?.uid);
      AppStorage.clearAllLocalSessionData();
      AppStorage.setActiveUserUid('anon');
      setCurrentUser(null);
      localStorage.removeItem('opensketch_current_user');
      localStorage.removeItem('opensketch_environment_selected');
      localStorage.removeItem('opensketch_active_context');
    }
  };

  // 3. Environment Selection & Onboarding States with Persistence
  const [isEnvironmentSelected, setIsEnvironmentSelected] = useState<boolean>(() => {
    try {
      return localStorage.getItem('opensketch_environment_selected') === 'true';
    } catch {
      return false;
    }
  });
  const [context, setContext] = useState<WorkspaceContext>(() => {
    return validateAndParseWorkspaceContext(localStorage.getItem('opensketch_active_context'));
  });

  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(() => {
    try {
      const activeCtx = validateAndParseWorkspaceContext(localStorage.getItem('opensketch_active_context'));
      const envSelected = localStorage.getItem('opensketch_environment_selected') === 'true';
      if (envSelected && activeCtx) {
        return !AppStorage.isOnboardingCompleted(activeCtx.type);
      }
      return false;
    } catch {
      return false;
    }
  });

  const saveWorkspaceContext = (ctx: WorkspaceContext) => {
    const validated = validateAndParseWorkspaceContext(JSON.stringify(ctx));
    setContext(validated);
    localStorage.setItem('opensketch_active_context', JSON.stringify(validated));
    localStorage.setItem('opensketch_environment_selected', 'true');
    setIsEnvironmentSelected(true);
    setChatResetKey((k) => k + 1);
  };

  // 4. Navigation & Transition State
  const [activeModule, setActiveModule] = useState<NavigationModuleId>('inicio');
  const [chatResetKey, setChatResetKey] = useState<number>(0);

  useEffect(() => {
    if (!currentUser || isOwner) return;
    if (userPlan !== 'pro_lifetime' && context.type !== 'PERSONAL') {
      saveWorkspaceContext({ type: 'PERSONAL' });
    } else if (userPlan === 'free' && !isEnvironmentSelected) {
      localStorage.setItem('opensketch_environment_selected', 'true');
      setIsEnvironmentSelected(true);
    }
    if (userPlan === 'free' && activeModule === 'prospeccao') {
      setActiveModule('inicio');
    }
  }, [currentUser, isOwner, userPlan, context.type, isEnvironmentSelected, activeModule]);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [pendingContext, setPendingContext] = useState<WorkspaceContext | null>(null);

  // 4.1 Responsive Mobile Navigation State
  const [isMobileView, setIsMobileView] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileView(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 5. Ingestion & Split-View State
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [activeDocumentUrl, setActiveDocumentUrl] = useState<string | null>(null);
  const [activeExtraction, setActiveExtraction] = useState<ExtractedInvoiceData | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Storage Warning & Offline Resilience Listeners
  useEffect(() => {
    const handleStorageWarning = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>;
      if (customEvent.detail?.message) {
        setNotification(`⚠️ ${customEvent.detail.message}`);
        setTimeout(() => setNotification(null), 6500);
      }
    };
    const handleOffline = () => {
      showToast('⚡ Modo Offline: Você está sem conexão com a internet, mas seus dados locais e navegação continuam funcionando normalmente.');
    };
    const handleOnline = () => {
      showToast('✓ Conexão com a internet restabelecida.');
    };
    window.addEventListener('opensketch:storage-warning', handleStorageWarning);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('opensketch:storage-warning', handleStorageWarning);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  /**
   * ENVIRONMENT SWITCHING & ONBOARDING RULE:
   * - Transition to "Minha Empresa": Executes animated logo/fade transition overlay.
   * - Return to "Meu Trabalho": Direct and immediate without animation overlay.
   * - Intercepts first access if onboarding has not been completed for that profile.
   */
  const handleSelectEnvironment = (selectedContext: WorkspaceContext) => {
    if (selectedContext.type === 'CORPORATE') {
      setPendingContext(selectedContext);
      setIsTransitioning(true);
    } else {
      saveWorkspaceContext(selectedContext);
      if (!AppStorage.isOnboardingCompleted('PERSONAL')) {
        setIsOnboardingActive(true);
      } else {
        setIsOnboardingActive(false);
        setActiveModule('inicio');
        showToast('Ambiente ativo: Meu Trabalho (Individual)');
      }
    }
  };

  const handleSwitchContext = (newContext: WorkspaceContext) => {
    if (newContext.type === 'CORPORATE') {
      setPendingContext(newContext);
      setIsTransitioning(true);
    } else {
      saveWorkspaceContext(newContext);
      if (activeModule === 'prospeccao') {
        setActiveModule('inicio');
      }
      if (!AppStorage.isOnboardingCompleted('PERSONAL')) {
        setIsOnboardingActive(true);
      } else {
        setIsOnboardingActive(false);
        showToast('Ambiente ativo: Meu Trabalho (Individual)');
      }
    }
  };

  const handleTransitionOverlayFinished = () => {
    const targetCtx = pendingContext || { type: 'CORPORATE' as const };
    saveWorkspaceContext(targetCtx);
    setPendingContext(null);
    setIsTransitioning(false);

    if (!AppStorage.isOnboardingCompleted(targetCtx.type)) {
      setIsOnboardingActive(true);
    } else {
      setIsOnboardingActive(false);
      setActiveModule('inicio');
      showToast('Ambiente ativo: Minha Empresa (Corporativo)');
    }
  };

  const handleDeactivateCurrentProfile = () => {
    const currentType = context.type;
    const otherType = currentType === 'CORPORATE' ? 'PERSONAL' : 'CORPORATE';
    const currentLabel = currentType === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho';
    const otherLabel = otherType === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho';

    // Limpa os dados locais e onboarding do ambiente atual
    AppStorage.clearEnvironmentData(currentType);

    // Verifica se o outro perfil já está ativo e inicializado
    const isOtherActive = AppStorage.isOnboardingCompleted(otherType);

    if (isOtherActive) {
      saveWorkspaceContext({ type: otherType });
      setActiveModule('inicio');
      setIsOnboardingActive(false);
      showToast(`Perfil ${currentLabel} encerrado. Você está operando agora em ${otherLabel}.`);
    } else {
      localStorage.removeItem('opensketch_environment_selected');
      localStorage.removeItem('opensketch_active_context');
      setIsEnvironmentSelected(false);
      setIsOnboardingActive(false);
      setActiveModule('inicio');
      showToast(`Perfil ${currentLabel} encerrado. Escolha um ambiente para continuar.`);
    }
  };

  const handleTerminateFullAccount = () => {
    AppStorage.clearAllUserData();
    saveUserSession(null);
    setIsEnvironmentSelected(false);
    setIsOnboardingActive(false);
    setActiveModule('inicio');
    navigatePublic('/');
  };

  // Document upload / paste intake simulation
  const handleFileReceived = async (file: File) => {
    setUploadProgress(25);
    const timer = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 25));
    }, 120);

    await new Promise((res) => setTimeout(res, 850));
    clearInterval(timer);
    setUploadProgress(100);

    const imageUrl = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : '/assets/opensketch-brand-reference.jpg';

    setTimeout(() => {
      setActiveDocumentUrl(imageUrl);
      setActiveExtraction(MOCK_INVOICE_DATA);
      setUploadProgress(0);
      showToast('Nota fiscal extraída via Google Gemini 1.5. Abrindo Split-View...');
    }, 250);
  };

  const handleLoadDemoInvoice = () => {
    setActiveDocumentUrl('/assets/opensketch-brand-reference.jpg');
    setActiveExtraction(MOCK_INVOICE_DATA);
    showToast('Nota demonstrativa aberta no Split-View.');
  };

  const handleConfirmSale = async (data: ExtractedInvoiceData) => {
    await new Promise((res) => setTimeout(res, 500));

    // Save document to Biblioteca
    AppStorage.addDocument(context.type, {
      id: `ARQ-${Date.now().toString().slice(-5)}`,
      fileName: `Comprovante_${data.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}.png`,
      category: 'IMAGE',
      mimeType: 'image/png',
      fileSizeBytes: 284100,
      uploadedAt: new Date().toLocaleString('pt-BR'),
      description: `Comprovante registrado para ${data.issuer_name || 'Diversos'}.`,
      aiAccessible: true,
    });

    // Update Realized Revenue in Metas & Objetivos
    AppStorage.addRealizedRevenue(context.type, data.total_amount, 'Vendas Diretas de Produtos');

    if (currentUser?.uid || currentUser?.email) {
      syncWorkspaceSummaryToFirestore(currentUser.uid || currentUser.email.toLowerCase(), context.type, {
        lastSaleInvoice: data.invoice_number,
        lastSaleAmount: data.total_amount,
      });
    }

    showToast(
      `Venda ${data.invoice_number} (R$ ${data.total_amount.toFixed(2)}) confirmada sob escopo ${
        context.type === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho'
      }! Catalogado na Biblioteca e Metas atualizadas.`
    );
    setActiveDocumentUrl(null);
    setActiveExtraction(null);
  };

  const activeProfile = AppStorage.getProfile(context.type);
  const activeDisplayName = (activeProfile.fullName || currentUser?.name || '').trim();

  // Render the corresponding native view component strictly decoupling all modules
  const renderActiveModuleView = () => {
    switch (activeModule) {
      case 'inicio':
        return (
          <HomeOperationsCenter
            key={`home-${context.type}-${chatResetKey}`}
            context={context}
            userName={activeDisplayName}
            onFileReceived={handleFileReceived}
            uploadProgress={uploadProgress}
            onLoadDemoInvoice={handleLoadDemoInvoice}
            onNavigateModule={(id) => setActiveModule(id)}
            userPlan={userPlan}
            isOwner={isOwner}
            onRequestUpgrade={openUpgradeModal}
          />
        );
      case 'clientes':
        return <ClientesView context={context} />;
      case 'anuncios':
        return <AnunciosView context={context} />;
      case 'metas':
        return <MetasObjetivosView context={context} />;
      case 'biblioteca':
        return (
          <BibliotecaView
            context={context}
            userPlan={userPlan}
            isOwner={isOwner}
            onRequestUpgrade={openUpgradeModal}
          />
        );
      case 'perfil':
      case 'configuracoes':
        return (
          <ConfiguracoesView
            context={context}
            onSwitchContext={handleSwitchContext}
            theme={theme}
            onToggleTheme={(newTheme) => {
              setTheme(newTheme);
              localStorage.setItem('opensketch_theme', newTheme);
            }}
            userEmail={currentUser?.email || 'usuario@opensketch.app'}
            isOwner={isOwner}
            onDeactivateCurrentProfile={handleDeactivateCurrentProfile}
            onTerminateFullAccount={handleTerminateFullAccount}
          />
        );
      case 'prospeccao':
        if (!isOwner && userPlan === 'free') {
          return (
            <div
              style={{
                flex: 1,
                padding: '48px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#D9DEE4',
              }}
            >
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</span>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px' }}>
                Prospecção & Mercado B2B
              </h2>
              <p style={{ maxWidth: '480px', color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                Desbloqueie a busca de empresas B2B e geração de scripts com IA assinando o <strong>Plano Essencial (R$ 39,99/mês)</strong> ou o <strong>Plano Completo Vitalício (R$ 119,99)</strong>.
              </p>
              <button
                type="button"
                onClick={() => openUpgradeModal('essential_monthly', 'Prospecção & Mercado B2B')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2C4863',
                  color: '#FFFFFF',
                  border: '1px solid #4A7296',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Desbloquear Módulo Agora
              </button>
            </div>
          );
        }
        return <ProspeccaoView />;
      case 'financeiro':
        if (!isOwner && userPlan !== 'pro_lifetime' && context.type === 'CORPORATE') {
          return (
            <div
              style={{
                flex: 1,
                padding: '48px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#D9DEE4',
              }}
            >
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</span>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px' }}>
                Centro de Inteligência Financeira & Margem
              </h2>
              <p style={{ maxWidth: '480px', color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
                Recurso exclusivo do ambiente <strong>Minha Empresa</strong> no <strong>Plano Completo Vitalício (R$ 119,99 pagamento único)</strong>.
              </p>
              <button
                type="button"
                onClick={() => openUpgradeModal('pro_lifetime', 'Centro de Inteligência Financeira & Margem')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2C4863',
                  color: '#FFFFFF',
                  border: '1px solid #4A7296',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Desbloquear no Plano Vitalício
              </button>
            </div>
          );
        }
        return <FinanceiroView context={context} />;
      default:
        return (
          <HomeOperationsCenter
            context={context}
            onFileReceived={handleFileReceived}
            uploadProgress={uploadProgress}
            onLoadDemoInvoice={handleLoadDemoInvoice}
            userPlan={userPlan}
            isOwner={isOwner}
            onRequestUpgrade={openUpgradeModal}
          />
        );
    }
  };

  // 0. Public Legal Routes (/privacidade e /termos — acessíveis sem login para validação OAuth)
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath === '/privacidade' || currentPath === '/privacidade/') {
      return <PublicLegalPage initialTab="privacidade" />;
    }
    if (currentPath === '/termos' || currentPath === '/termos/') {
      return <PublicLegalPage initialTab="termos" />;
    }
  }

  // 1. Initial Splash Screen
  if (isInitializing) {
    return (
      <PlatformSplashScreen
        onInitializationComplete={() => setIsInitializing(false)}
      />
    );
  }

  // 2. Public Vitrine / Authentication Screens (quando não autenticado)
  if (!currentUser) {
    if (publicRoute === '/privacidade') {
      return <PublicLegalPage initialTab="privacidade" />;
    }
    if (publicRoute === '/termos') {
      return <PublicLegalPage initialTab="termos" />;
    }
    if (publicRoute === '/cadastro' || publicRoute === '/criar-conta' || publicRoute === '/ativar-conta') {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const activationToken = searchParams?.get('token');
      const activationRef = searchParams?.get('ref');
      const prefilledEmail = searchParams?.get('email');
      return (
        <RegisterScreen
          activationToken={activationToken}
          activationRef={activationRef}
          prefilledEmail={prefilledEmail}
          onRegisterSuccess={(user) => {
            saveUserSession(user);
            initDefaultFreeUserPlan(user).then((doc) => setUserPlan(doc.plan));
            handleSelectEnvironment({ type: 'PERSONAL' });
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
              const pending = localStorage.getItem('opensketch_pending_checkout_plan');
              if (pending === 'essential_monthly' || pending === 'pro_lifetime') {
                localStorage.removeItem('opensketch_pending_checkout_plan');
                openUpgradeModal(pending, null);
              }
            }
          }}
          onNavigateLogin={() => navigatePublic('/entrar')}
          onNavigateHome={() => navigatePublic('/')}
        />
      );
    }

    if (publicRoute === '/entrar') {
      return (
        <AuthScreen
          onLoginSuccess={(user) => {
            saveUserSession(user);
            initDefaultFreeUserPlan(user).then((doc) => setUserPlan(doc.plan));
            handleSelectEnvironment({ type: 'PERSONAL' });
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
              const pending = localStorage.getItem('opensketch_pending_checkout_plan');
              if (pending === 'essential_monthly' || pending === 'pro_lifetime') {
                localStorage.removeItem('opensketch_pending_checkout_plan');
                openUpgradeModal(pending, null);
              }
            }
          }}
          onNavigateHome={() => navigatePublic('/')}
          onNavigateRegister={() => navigatePublic('/cadastro')}
        />
      );
    }

    const landingRoute: PublicPageRoute =
      publicRoute === '/recursos' || publicRoute === '/blog' || publicRoute === '/planos'
        ? publicRoute
        : '/';

    return (
      <>
        <LandingPage
          currentRoute={landingRoute}
          onNavigate={navigatePublic}
          onSelectPlan={handleLandingPlanSelect}
          checkoutLoadingPlan={landingCheckoutLoading}
          checkoutError={landingCheckoutError}
        />
        <PixPaymentModal
          isOpen={Boolean(landingPixData)}
          data={landingPixData}
          isAnonymous={true}
          onClose={() => setLandingPixData(null)}
          onActivationConfirmed={(activationToken, email) => {
            setLandingPixData(null);
            const qs = new URLSearchParams({ token: activationToken });
            if (email) qs.set('email', email);
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', `/criar-conta?${qs.toString()}`);
            }
            setPublicRoute('/criar-conta');
          }}
        />
      </>
    );
  }

  // 3. Guided Onboarding (Passo 3: Questionário de 2 passos exibido APENAS NO PRIMEIRO ACESSO do perfil)
  if (isOnboardingActive) {
    return (
      <OnboardingScreen
        context={context}
        userEmail={currentUser.email}
        onComplete={() => {
          setIsOnboardingActive(false);
          setIsEnvironmentSelected(true);
          setActiveModule('inicio');
          showToast(
            `✓ Perfil configurado com sucesso! Bem-vindo ao ${
              context.type === 'CORPORATE' ? 'Minha Empresa' : 'Meu Trabalho'
            }.`
          );
        }}
        onBackToEnvironmentSelection={() => {
          setIsOnboardingActive(false);
          setIsEnvironmentSelected(false);
        }}
      />
    );
  }

  // 4. Environment Selection Screen (Passo 2: Escolha entre Meu Trabalho e Minha Empresa)
  // Usuário no Plano Gratuito entra direto em "Meu Trabalho" no Simulador de Comissão
  if (!isEnvironmentSelected && (isOwner || userPlan !== 'free')) {
    return (
      <>
        {isTransitioning && (
          <EnvironmentTransitionOverlay
            targetEnvironmentName="Minha Empresa"
            onTransitionComplete={handleTransitionOverlayFinished}
          />
        )}
        <EnvironmentSelectionScreen
          userEmail={currentUser.email}
          userPlan={userPlan}
          isOwner={isOwner}
          onRequestUpgrade={(reqPlan, feature) => openUpgradeModal(reqPlan, feature)}
          onSelectEnvironment={(selectedContext) => {
            handleSelectEnvironment(selectedContext);
          }}
        />
        <UpgradeCheckoutModal
          isOpen={upgradeModal.isOpen}
          currentPlan={userPlan}
          initialHighlightPlan={upgradeModal.highlightPlan}
          lockedFeatureName={upgradeModal.featureName}
          userName={currentUser.name}
          onClose={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
        />
      </>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: theme === 'light' ? '#F3F4F6' : '#121417',
        color: theme === 'light' ? '#111827' : '#D9DEE4',
        overflow: 'hidden',
        transition: 'background-color 0.25s ease, color 0.25s ease',
      }}
    >
      {/* ================= 1. TOPBAR COM LOGO FIXA NO CANTO SUPERIOR ESQUERDO ================= */}
      <HeaderNavigation
        currentContext={context}
        onSwitchContext={handleSwitchContext}
        userEmail={currentUser.email}
        displayName={activeDisplayName}
        userPlan={userPlan}
        isOwner={isOwner}
        onRequestUpgrade={(reqPlan, feature) => openUpgradeModal(reqPlan, feature)}
        onNavigateHome={() => {
          setChatResetKey((k) => k + 1);
          setActiveModule('inicio');
          setIsMobileMenuOpen(false);
        }}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        onLogout={() => {
          signOutFirebase();
          AppStorage.clearAllLocalSessionData();
          AppStorage.setActiveUserUid('anon');
          clearCachedOwnerState();
          clearCachedPlanForUid(currentUser?.uid);
          setIsOwner(false);
          setUserPlan('free');
          setIsOnboardingActive(false);
          setIsEnvironmentSelected(false);
          setActiveModule('inicio');
          setChatResetKey((k) => k + 1);
          saveUserSession(null);
          navigatePublic('/');
        }}
      />

      {/* ================= 2. TRANSIÇÃO ANIMADA DA LOGO (EXCLUSIVA PARA "MINHA EMPRESA") ================= */}
      {isTransitioning && (
        <EnvironmentTransitionOverlay
          targetEnvironmentName="Minha Empresa"
          onTransitionComplete={handleTransitionOverlayFinished}
        />
      )}

      {/* Floating Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1C1E22',
            border: '1px solid #3D5A73',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            color: '#D9DEE4',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚡</span>
          <span>{notification}</span>
        </div>
      )}

      {/* ================= 3. SPLIT-VIEW FULLSCREEN WHEN A DOCUMENT IS BEING REVIEWED ================= */}
      {activeDocumentUrl && activeExtraction ? (
        <SplitViewScreen
          documentImageUrl={activeDocumentUrl}
          initialData={activeExtraction}
          onConfirmSale={handleConfirmSale}
          onCancel={() => {
            setActiveDocumentUrl(null);
            setActiveExtraction(null);
            showToast('Conferência cancelada.');
          }}
        />
      ) : (
        /* ================= 4. RESPONSIVE GRID (DESKTOP SIDEBAR + MOBILE DRAWER + WORK AREA) ================= */
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Column 1: Left Sidebar (Desktop fixed, Mobile sliding drawer) */}
          {(!isMobileView || isMobileMenuOpen) && (
            <div
              style={
                isMobileView
                  ? {
                      position: 'fixed',
                      top: '60px',
                      left: 0,
                      bottom: 0,
                      width: '280px',
                      zIndex: 300,
                      boxShadow: '4px 0 24px rgba(0,0,0,0.8)',
                    }
                  : { display: 'flex' }
              }
            >
              <Sidebar
                currentEnvironment={context.type}
                activeModule={activeModule}
                displayName={activeDisplayName}
                userPlan={userPlan}
                isOwner={isOwner}
                onRequestUpgrade={(reqPlan, feature) => openUpgradeModal(reqPlan, feature)}
                onSelectModule={(id) => {
                  if (id === 'inicio') {
                    setChatResetKey((k) => k + 1);
                  }
                  setActiveModule(id);
                  if (isMobileView) setIsMobileMenuOpen(false);
                }}
              />
            </div>
          )}

          {/* Backdrop Overlay for Mobile Drawer */}
          {isMobileView && isMobileMenuOpen && (
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                top: '60px',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(3px)',
                zIndex: 299,
              }}
            />
          )}

          {/* Column 2: Expansive Right Dynamic Work Area (100% on Mobile) */}
          <main style={{ flex: 1, display: 'flex', overflow: 'hidden', backgroundColor: '#121417', width: '100%' }}>
            {renderActiveModuleView()}
          </main>
        </div>
      )}

      <UpgradeCheckoutModal
        isOpen={upgradeModal.isOpen}
        currentPlan={userPlan}
        initialHighlightPlan={upgradeModal.highlightPlan}
        lockedFeatureName={upgradeModal.featureName}
        userName={currentUser.name}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
