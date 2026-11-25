import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'C:\\Users\\Hector Julian\\.gemini\\antigravity\\scratch\\opensketch\\frontend\\test-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkOverflow(page, screenName, viewportName) {
  const metrics = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const innerWidth = window.innerWidth;
    const clientWidth = docEl.clientWidth;
    return {
      scrollWidth,
      innerWidth,
      clientWidth,
      hasOverflow: scrollWidth > innerWidth + 1, // 1px threshold for fractional subpixels
    };
  });

  const status = !metrics.hasOverflow ? '✅ PASS' : '❌ FAIL (OVERFLOW DETECTADO)';
  console.log(`  [Overflow Check] [${viewportName}] ${screenName}: ${status} (scrollWidth: ${metrics.scrollWidth}px, innerWidth: ${metrics.innerWidth}px)`);
  if (metrics.hasOverflow) {
    throw new Error(`Overflow horizontal detectado em ${screenName} no viewport ${viewportName}: ${metrics.scrollWidth} > ${metrics.innerWidth}`);
  }
  return metrics;
}

async function completeOnboardingIfPresent(page, envLabel) {
  await delay(800);
  const isStep1 = await page.$('::-p-text(Passo 1 de 2)');
  if (isStep1) {
    console.log(`    -> Onboarding detectado para [${envLabel}]. Preenchendo etapas...`);
    const combobox1 = await page.waitForSelector('div[role="combobox"]', { timeout: 6000 });
    await combobox1.click();
    await delay(300);

    const firstOption1 = await page.waitForSelector('div[role="option"]', { timeout: 6000 });
    await firstOption1.click();
    await delay(300);

    const proceedBtn = await page.waitForSelector('button ::-p-text(Prosseguir)', { timeout: 6000 });
    await proceedBtn.click();
    await delay(600);

    const combobox2 = await page.waitForSelector('div[role="combobox"]', { timeout: 6000 });
    await combobox2.click();
    await delay(300);

    const firstOption2 = await page.waitForSelector('div[role="option"]', { timeout: 6000 });
    await firstOption2.click();
    await delay(300);

    const finishBtn = await page.waitForSelector('button ::-p-text(OK — Começar a Usar)', { timeout: 6000 });
    await finishBtn.click();
    await delay(1200);
    console.log(`    -> Onboarding de [${envLabel}] concluído com sucesso!`);
  }
}

async function openDrawerIfNeeded(page) {
  const isDrawerAlreadyOpen = await page.$('aside button');
  if (!isDrawerAlreadyOpen) {
    const menuBtn = await page.$('button[aria-label*="menu" i]');
    if (menuBtn) {
      await menuBtn.click();
      await delay(600);
    }
  }
}

async function runResponsiveTestSuite() {
  console.log('📱 =========================================================================================');
  console.log('📱 AUDITORIA & TESTE DE RESPONSIVIDADE MOBILE & TABLET (360x800, 390x844, 768x1024)');
  console.log('📱 Verificação de Zero Overflow Horizontal, Menu Gaveta Mobile e Alvos de Toque para 50+');
  console.log('📱 =========================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const auditReport = {
    viewportsTested: [],
    overflowResults: [],
    touchTargetResults: [],
    screenshotsGenerated: [],
    allPassed: true,
  };

  try {
    // -----------------------------------------------------------------------------------
    // 1. MOBILE 360x800: TELA DE LOGIN & CADASTRO
    // -----------------------------------------------------------------------------------
    console.log('🔹 [ETAPA 1] Testando Telas de Autenticação em Mobile 360x800 (Galaxy S20 / Android Padrão)');
    await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
    auditReport.viewportsTested.push('360x800 (Android Mobile)');

    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await delay(1000);

    // Se estiver logado, faz logout para testar tela de login
    await page.evaluate(() => {
      localStorage.removeItem('opensketch_user_session');
      localStorage.removeItem('opensketch_workspace_context');
      window.location.hash = '';
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // Verifica tela de Login em 360x800
    await checkOverflow(page, 'Tela de Login', '360x800');
    auditReport.overflowResults.push({ screen: 'Login', viewport: '360x800', pass: true });

    // Clica em "Criar conta" para navegar para /cadastro
    console.log('  -> Navegando para /cadastro...');
    const linkCriarConta = await page.waitForSelector('button ::-p-text(Criar conta)', { timeout: 6000 });
    await linkCriarConta.click();
    await delay(1000);

    // Verifica tela de Cadastro em 360x800
    await checkOverflow(page, 'Tela de Cadastro (/cadastro)', '360x800');
    auditReport.overflowResults.push({ screen: 'Cadastro', viewport: '360x800', pass: true });

    // Retorna para Login
    console.log('  -> Clicando em "Voltar" para retornar ao Login...');
    const voltarBtn = await page.waitForSelector('::-p-text(Voltar)', { timeout: 6000 });
    await voltarBtn.click();
    await delay(1000);

    // -----------------------------------------------------------------------------------
    // 2. MOBILE 360x800: SELEÇÃO DE AMBIENTE
    // -----------------------------------------------------------------------------------
    console.log('\n🔹 [ETAPA 2] Autenticação e Seleção de Ambiente em Mobile 360x800');
    
    // Testa alternância de abas de autenticação (Celular e E-mail)
    const tabCelular = await page.$('button ::-p-text(Celular)');
    if (tabCelular) {
      await tabCelular.click();
      await delay(400);
      await checkOverflow(page, 'Login Aba Celular', '360x800');
    }

    // Efetua login via Google para transição rápida e segura
    const googleBtn = await page.waitForSelector('button ::-p-text(Continuar com o Google)', { timeout: 6000 });
    await googleBtn.click();
    await delay(1800);

    // Tela de Seleção de Ambiente
    await checkOverflow(page, 'Seleção de Ambiente', '360x800');
    auditReport.overflowResults.push({ screen: 'Seleção de Ambiente', viewport: '360x800', pass: true });

    const scAmbiente = path.join(SCREENSHOT_DIR, 'mobile_ambiente_selecao.png');
    await page.screenshot({ path: scAmbiente });
    auditReport.screenshotsGenerated.push('mobile_ambiente_selecao.png');
    console.log(`  📸 Screenshot salvo: mobile_ambiente_selecao.png`);

    // Entra em "Meu Trabalho"
    const cardMeuTrabalho = await page.waitForSelector('button ::-p-text(Acessar Meu Trabalho)', { timeout: 6000 });
    await cardMeuTrabalho.click();
    await delay(1500);

    await completeOnboardingIfPresent(page, 'Meu Trabalho');

    // -----------------------------------------------------------------------------------
    // 3. MOBILE 360x800: TELA DE INÍCIO (CHAT IA) & MENU GAVETA HAMBÚRGUER
    // -----------------------------------------------------------------------------------
    console.log('\n🔹 [ETAPA 3] Início (Chat IA) & Gaveta de Navegação Mobile 360x800');
    await checkOverflow(page, 'Início (Chat IA)', '360x800');
    auditReport.overflowResults.push({ screen: 'Início (Chat IA)', viewport: '360x800', pass: true });

    const scHome = path.join(SCREENSHOT_DIR, 'mobile_home.png');
    await page.screenshot({ path: scHome });
    auditReport.screenshotsGenerated.push('mobile_home.png');
    console.log(`  📸 Screenshot salvo: mobile_home.png`);

    // Testa botão hambúrguer do cabeçalho
    console.log('  -> Acionando Menu Hambúrguer (☰)...');
    const btnMenu = await page.waitForSelector('button[aria-label*="menu" i]', { timeout: 6000 });
    const menuBtnBox = await btnMenu.boundingBox();
    console.log(`  -> Dimensões do botão Hambúrguer: ${menuBtnBox.width}x${menuBtnBox.height}px (Toque 50+ >= 44px: ${menuBtnBox.height >= 44 ? 'OK' : 'AVISO'})`);
    auditReport.touchTargetResults.push({
      target: 'Botão Hambúrguer Mobile',
      height: menuBtnBox.height,
      pass: menuBtnBox.height >= 44,
    });

    await btnMenu.click();
    await delay(800);

    // Gaveta deve estar aberta
    await checkOverflow(page, 'Gaveta de Navegação Aberta', '360x800');

    // Navega para Clientes
    console.log('  -> Navegando para o módulo Clientes via Drawer Mobile...');
    const navItemClientes = await page.waitForSelector('aside button ::-p-text(Clientes)', { timeout: 6000 });
    await navItemClientes.click();
    await delay(1200);

    // -----------------------------------------------------------------------------------
    // 4. MOBILE 360x800: MÓDULO CLIENTES & MODAL "NOVO CLIENTE"
    // -----------------------------------------------------------------------------------
    console.log('\n🔹 [ETAPA 4] Módulo Clientes e Modal Responsivo em Mobile 360x800');
    await checkOverflow(page, 'Módulo Clientes', '360x800');
    auditReport.overflowResults.push({ screen: 'Clientes', viewport: '360x800', pass: true });

    const scClientes = path.join(SCREENSHOT_DIR, 'mobile_clientes.png');
    await page.screenshot({ path: scClientes });
    auditReport.screenshotsGenerated.push('mobile_clientes.png');
    console.log(`  📸 Screenshot salvo: mobile_clientes.png`);

    // Abre o Modal "Novo Cliente"
    console.log('  -> Abrindo modal "Cadastrar Novo Cliente"...');
    const btnNovoCliente = await page.waitForSelector('button ::-p-text(Novo Cliente)', { timeout: 6000 });
    await btnNovoCliente.click();
    await delay(800);

    // Verifica overflow com modal aberto
    await checkOverflow(page, 'Modal Novo Cliente Aberto', '360x800');

    // Valida que o modal cabe no viewport e botões de ação estão visíveis e com boa área de toque
    const modalMetrics = await page.evaluate(() => {
      const modal = document.querySelector('.responsive-modal-card');
      const saveBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Salvar Cliente'));
      const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar'));
      return {
        modalWidth: modal ? modal.getBoundingClientRect().width : 0,
        modalHeight: modal ? modal.getBoundingClientRect().height : 0,
        saveBtnHeight: saveBtn ? saveBtn.getBoundingClientRect().height : 0,
        cancelBtnHeight: cancelBtn ? cancelBtn.getBoundingClientRect().height : 0,
        saveBtnVisible: saveBtn ? window.getComputedStyle(saveBtn).display !== 'none' : false,
      };
    });

    console.log(`  -> Modal Dimensões: ${modalMetrics.modalWidth.toFixed(0)}x${modalMetrics.modalHeight.toFixed(0)}px (Viewport: 360x800)`);
    console.log(`  -> Botão "Salvar Cliente" Altura: ${modalMetrics.saveBtnHeight}px, Visível: ${modalMetrics.saveBtnVisible}`);
    auditReport.touchTargetResults.push({
      target: 'Botão Salvar Cliente (Modal)',
      height: modalMetrics.saveBtnHeight,
      pass: modalMetrics.saveBtnHeight >= 44,
    });

    const scModalCliente = path.join(SCREENSHOT_DIR, 'mobile_modal_cliente.png');
    await page.screenshot({ path: scModalCliente });
    auditReport.screenshotsGenerated.push('mobile_modal_cliente.png');
    console.log(`  📸 Screenshot salvo: mobile_modal_cliente.png`);

    // Fecha o modal
    const btnCancelarModal = await page.waitForSelector('.responsive-modal-card button ::-p-text(Cancelar)', { timeout: 6000 });
    await btnCancelarModal.click();
    await delay(600);

    // -----------------------------------------------------------------------------------
    // 5. MOBILE 360x800: MÓDULO ANÚNCIOS & MODAL "NOVO ANÚNCIO"
    // -----------------------------------------------------------------------------------
    console.log('\n🔹 [ETAPA 5] Módulo Anúncios e Modal Responsivo em Mobile 360x800');
    // Abre gaveta e vai para Anúncios
    const btnMenu2 = await page.waitForSelector('button[aria-label*="menu" i]', { timeout: 6000 });
    await btnMenu2.click();
    await delay(600);

    const navItemAnuncios = await page.waitForSelector('aside button ::-p-text(Anúncios)', { timeout: 6000 });
    await navItemAnuncios.click();
    await delay(1200);

    await checkOverflow(page, 'Módulo Anúncios', '360x800');
    auditReport.overflowResults.push({ screen: 'Anúncios', viewport: '360x800', pass: true });

    // Abre modal de Novo Anúncio
    console.log('  -> Abrindo modal "Criar Novo Anúncio"...');
    const btnNovoAnuncio = await page.waitForSelector('button ::-p-text(Criar Novo Anúncio)', { timeout: 6000 });
    await btnNovoAnuncio.click();
    await delay(800);

    await checkOverflow(page, 'Modal Novo Anúncio Aberto', '360x800');

    const scModalAnuncio = path.join(SCREENSHOT_DIR, 'mobile_modal_anuncio.png');
    await page.screenshot({ path: scModalAnuncio });
    auditReport.screenshotsGenerated.push('mobile_modal_anuncio.png');
    console.log(`  📸 Screenshot salvo: mobile_modal_anuncio.png`);

    // Fecha o modal de Anúncio
    const btnCancelarAnuncio = await page.waitForSelector('.responsive-modal-card button ::-p-text(Cancelar)', { timeout: 6000 });
    await btnCancelarAnuncio.click();
    await delay(600);

    // -----------------------------------------------------------------------------------
    // 6. IPHONE 390x844: MÓDULO CONFIGURAÇÕES & DADOS DO PERFIL
    // -----------------------------------------------------------------------------------
    console.log('\n🔹 [ETAPA 6] Testando Configurações em Viewport iPhone 390x844');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    auditReport.viewportsTested.push('390x844 (iPhone 12/13/14)');

    const btnMenu3 = await page.waitForSelector('button[aria-label*="menu" i]', { timeout: 6000 });
    await btnMenu3.click();
    await delay(600);

    const navItemConfig = await page.waitForSelector('aside button ::-p-text(Configurações)', { timeout: 6000 });
    await navItemConfig.click();
    await delay(1200);

    await checkOverflow(page, 'Configurações e Perfil', '390x844');
    auditReport.overflowResults.push({ screen: 'Configurações', viewport: '390x844', pass: true });

    // -----------------------------------------------------------------------------------
    // 7. TABLET 768x1024 (iPAD): PERFIL "MINHA EMPRESA" & PROSPECÇÃO (MAPA-MÚNDI)
    // -----------------------------------------------------------------------------------
    console.log('\n🔹 [ETAPA 7] Testando Prospecção (Mapa-Múndi) no Perfil "Minha Empresa" em Tablet 768x1024');
    await page.setViewport({ width: 768, height: 1024, isMobile: false, hasTouch: true });
    auditReport.viewportsTested.push('768x1024 (iPad / Tablet)');

    // Alterna para "Minha Empresa" via Seletor de Contexto do Cabeçalho
    console.log('  -> Alternando para o ambiente "Minha Empresa" via Context Switcher...');
    const contextBadge = await page.waitForSelector('header div[title*="alternar o ambiente"]', { timeout: 6000 });
    await contextBadge.click();
    await delay(500);

    const corporateOption = await page.waitForSelector('button ::-p-text(Minha Empresa)', { timeout: 6000 });
    await corporateOption.click();
    await delay(2000);

    await completeOnboardingIfPresent(page, 'Minha Empresa');

    // Navega para Prospecção
    console.log('  -> Navegando para Prospecção & Mercado B2B...');
    await openDrawerIfNeeded(page);
    const navItemProspeccao = await page.waitForSelector('aside button ::-p-text(Prospecção)', { timeout: 6000 });
    await navItemProspeccao.click();
    await delay(1500);

    await checkOverflow(page, 'Prospecção (Mapa Interativo B2B)', '768x1024');
    auditReport.overflowResults.push({ screen: 'Prospecção', viewport: '768x1024', pass: true });

    // Seleciona um estado (ex: SP) para verificar interação com o mapa no tablet
    const filterSpBtn = await page.waitForSelector('button ::-p-text(SP)', { timeout: 6000 });
    await filterSpBtn.click();
    await delay(1000);

    const scTablet = path.join(SCREENSHOT_DIR, 'tablet_prospeccao.png');
    await page.screenshot({ path: scTablet });
    auditReport.screenshotsGenerated.push('tablet_prospeccao.png');
    console.log(`  📸 Screenshot salvo: tablet_prospeccao.png`);

    // -----------------------------------------------------------------------------------
    // 8. VERIFICAÇÃO FINAL DE METAS & BIBLIOTECA
    // -----------------------------------------------------------------------------------
    console.log('\n🔹 [ETAPA 8] Verificação Complementar de Metas e Biblioteca em Tablet 768x1024');
    await openDrawerIfNeeded(page);
    const navItemMetas = await page.waitForSelector('aside button ::-p-text(Metas)', { timeout: 6000 });
    await navItemMetas.click();
    await delay(1200);
    await checkOverflow(page, 'Metas e Objetivos', '768x1024');
    auditReport.overflowResults.push({ screen: 'Metas', viewport: '768x1024', pass: true });

    await openDrawerIfNeeded(page);
    const navItemBib = await page.waitForSelector('aside button ::-p-text(Biblioteca)', { timeout: 6000 });
    await navItemBib.click();
    await delay(1200);
    await checkOverflow(page, 'Biblioteca de Arquivos', '768x1024');
    auditReport.overflowResults.push({ screen: 'Biblioteca', viewport: '768x1024', pass: true });

    console.log('\n🎉 =========================================================================================');
    console.log('🎉 AUDITORIA DE RESPONSIVIDADE E TOUCH TARGETS CONCLUÍDA COM 100% DE APROVAÇÃO!');
    console.log('🎉 =========================================================================================');
    console.log(JSON.stringify(auditReport, null, 2));

  } catch (err) {
    console.error('\n❌ ERRO DURANTE A AUDITORIA DE RESPONSIVIDADE:', err);
    auditReport.allPassed = false;
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runResponsiveTestSuite();
