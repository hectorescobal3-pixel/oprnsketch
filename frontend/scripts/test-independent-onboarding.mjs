import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'test-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('🏛️ =========================================================================');
  console.log('🏛️ TESTE E2E: ONBOARDING INDEPENDENTE POR PERFIL COM CAMPO ÚNICO MINIMALISTA');
  console.log('🏛️ =========================================================================\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Resetar storage para simular primeiro acesso de usuário novo
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      // Usuário autenticado, mas nenhum ambiente selecionado ou configurado
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: 'usuario@escorp.systems', name: 'Usuario Teste' }));
    });

    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // =========================================================================
    // ETAPA 1: TELA DE SELEÇÃO DE AMBIENTE INICIAL
    // =========================================================================
    console.log('🔹 [1. SELEÇÃO DE AMBIENTE] Usuário escolhe entrar em "Meu Trabalho"...');
    await page.evaluate(() => {
      const h2s = Array.from(document.querySelectorAll('h2'));
      const cardTitle = h2s.find((h) => h.textContent?.includes('Meu Trabalho'));
      if (cardTitle) {
        (cardTitle.closest('div[style*="cursor"]') || cardTitle.parentElement || cardTitle).click();
      }
    });
    await delay(1000);

    // =========================================================================
    // ETAPA 2: ONBOARDING CAMPO ÚNICO EM "MEU TRABALHO"
    // =========================================================================
    console.log('🔹 [2. ONBOARDING MEU TRABALHO] Inspecionando formulário minimalista de campo único...');
    const pageTitle = await page.$eval('h1', (h) => h.textContent?.trim() || '');
    console.log('   Título exibido:', pageTitle);

    if (!pageTitle.includes('Qual é a sua profissão ou área de atuação?')) {
      throw new Error(`FALHA: Título inesperado no onboarding: ${pageTitle}`);
    }

    // Verificar se existe o campo de profissão
    const inputField = await page.$('#profession-input');
    if (!inputField) {
      throw new Error('FALHA: Campo único #profession-input não encontrado!');
    }

    // Capturar screenshot do Onboarding Meu Trabalho
    const screenshotMeuTrabalho = path.join(SCREENSHOT_DIR, 'onboarding_meu_trabalho_single_field.png');
    await page.screenshot({ path: screenshotMeuTrabalho, fullPage: true });
    console.log(`   📸 Screenshot Onboarding Meu Trabalho salvo: ${screenshotMeuTrabalho}`);

    // Preencher "Corretor de Imóveis"
    console.log('   Preenchendo "Corretor de Imóveis" no campo único...');
    await inputField.type('Corretor de Imóveis');
    await delay(400);

    // Clicar em "Concluir e Acessar Meu Trabalho"
    const submitBtn1 = await page.$('form button[type="submit"]');
    if (submitBtn1) {
      await submitBtn1.click();
      await delay(1200);
    }

    // Validar se Meu Trabalho foi liberado
    const isMeuTrabalhoUnlocked = await page.evaluate(() => {
      const profile = JSON.parse(localStorage.getItem('opensketch_individual_perfil') || '{}');
      const corpProfile = JSON.parse(localStorage.getItem('opensketch_empresa_perfil') || '{}');
      return {
        personalProf: profile.profession,
        personalCompleted: profile.onboardingCompleted,
        corpProf: corpProfile.profession || null,
        corpCompleted: corpProfile.onboardingCompleted || false,
      };
    });
    console.log('   Estado da Persistência após Onboarding 1:', isMeuTrabalhoUnlocked);

    if (isMeuTrabalhoUnlocked.personalProf !== 'Corretor de Imóveis' || !isMeuTrabalhoUnlocked.personalCompleted) {
      throw new Error('FALHA: Onboarding de Meu Trabalho não persistiu a profissão corretamente!');
    }
    if (isMeuTrabalhoUnlocked.corpCompleted) {
      throw new Error('FALHA: Minha Empresa não pode ser dada como concluída antes do seu próprio onboarding!');
    }
    console.log('   ✅ Meu Trabalho liberado com sucesso & Minha Empresa permanece não inicializada: PASS');

    // =========================================================================
    // ETAPA 3: ALTERNAR PARA "MINHA EMPRESA" (PRIMEIRA VEZ) -> DEVE ABRIR ONBOARDING
    // =========================================================================
    console.log('\n🔹 [3. TRANSIÇÃO PARA MINHA EMPRESA] Alternando ambiente no menu superior...');
    // Abrir o menu dropdown do Header
    await page.evaluate(() => {
      const badge = document.querySelector('header div[title*="alternar"]');
      if (badge) badge.click();
    });
    await delay(500);

    // Clicar na opção "Minha Empresa" dentro do dropdown
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('header div[style*="absolute"] div, header div[style*="absolute"] button'));
      const corpOpt = options.find((el) => el.textContent?.includes('Minha Empresa') || el.textContent?.includes('🏢'));
      if (corpOpt) corpOpt.click();
    });
    await delay(1800); // Aguarda overlay de transição e fade-out

    // Como Minha Empresa ainda não foi configurada, o sistema DEVE interceptar e abrir o Onboarding
    const pageTitleCorp = await page.$eval('h1', (h) => h.textContent?.trim() || '');
    console.log('   Título exibido após alternar:', pageTitleCorp);

    if (!pageTitleCorp.includes('Qual é a sua profissão ou área de atuação?')) {
      throw new Error(`FALHA: Minha Empresa não abriu o onboarding automático no primeiro acesso! Título atual: ${pageTitleCorp}`);
    }

    // Verificar badge "Minha Empresa"
    const corpBadge = await page.evaluate(() => document.body.textContent?.includes('Minha Empresa'));
    if (!corpBadge) {
      throw new Error('FALHA: Badge de Minha Empresa não encontrado no formulário!');
    }
    console.log('   ✅ Sistema detectou Minha Empresa sem configuração e abriu o formulário minimalista: PASS');

    // Capturar screenshot do Onboarding Minha Empresa
    const screenshotMinhaEmpresa = path.join(SCREENSHOT_DIR, 'onboarding_minha_empresa_single_field.png');
    await page.screenshot({ path: screenshotMinhaEmpresa, fullPage: true });
    console.log(`   📸 Screenshot Onboarding Minha Empresa salvo: ${screenshotMinhaEmpresa}`);

    // Preencher "Clínica Odontológica" no campo único
    console.log('   Preenchendo "Clínica Odontológica" para Minha Empresa...');
    const corpInputField = await page.$('#profession-input');
    if (corpInputField) {
      await corpInputField.type('Clínica Odontológica');
      await delay(400);
    }

    const submitBtn2 = await page.$('form button[type="submit"]');
    if (submitBtn2) {
      await submitBtn2.click();
      await delay(1200);
    }

    // =========================================================================
    // ETAPA 4: VERIFICAÇÃO DE ISOLAMENTO TOTAL DOS DOIS PERFIS
    // =========================================================================
    console.log('\n🔹 [4. ISOLAMENTO TOTAL] Validando persistência de ambos os perfis...');
    const finalState = await page.evaluate(() => {
      const personal = JSON.parse(localStorage.getItem('opensketch_individual_perfil') || '{}');
      const corporate = JSON.parse(localStorage.getItem('opensketch_empresa_perfil') || '{}');
      return {
        personalProfession: personal.profession,
        personalCompleted: personal.onboardingCompleted,
        corporateProfession: corporate.profession,
        corporateCompleted: corporate.onboardingCompleted,
      };
    });
    console.log('   Estado Final Consolidado:', finalState);

    if (finalState.personalProfession !== 'Corretor de Imóveis') {
      throw new Error(`FALHA: Profissão de Meu Trabalho corrompida: ${finalState.personalProfession}`);
    }
    if (finalState.corporateProfession !== 'Clínica Odontológica') {
      throw new Error(`FALHA: Profissão de Minha Empresa corrompida: ${finalState.corporateProfession}`);
    }
    if (!finalState.personalCompleted || !finalState.corporateCompleted) {
      throw new Error('FALHA: Ambos os ambientes devem estar marcados como onboarding concluído!');
    }
    console.log('   ✅ Isolamento Perfeito: Meu Trabalho = "Corretor de Imóveis" | Minha Empresa = "Clínica Odontológica": PASS');

    // =========================================================================
    // ETAPA 5: ALTERNÂNCIA LIVRE SEM EXIBIR ONBOARDING NOVAMENTE
    // =========================================================================
    console.log('\n🔹 [5. NAVEGAÇÃO LIVRE] Alternando de volta para Meu Trabalho...');
    await page.evaluate(() => {
      const badge = document.querySelector('header div[title*="alternar"]');
      if (badge) badge.click();
    });
    await delay(500);

    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('header div[style*="absolute"] div, header div[style*="absolute"] button'));
      const personalOpt = options.find((el) => el.textContent?.includes('Meu Trabalho') || el.textContent?.includes('👤'));
      if (personalOpt) personalOpt.click();
    });
    await delay(1000);

    // Não deve estar na tela de onboarding
    const isBackOnWorkspace = await page.evaluate(() => {
      return !document.body.textContent?.includes('Qual é a sua profissão ou área de atuação?') &&
             document.body.textContent?.includes('Meu Trabalho');
    });

    if (!isBackOnWorkspace) {
      throw new Error('FALHA: Meu Trabalho exibiu onboarding novamente após já ter sido configurado!');
    }
    console.log('   ✅ Transição direta para área de trabalho (Zero re-onboarding indevido): PASS');

    const screenshotWorkspace = path.join(SCREENSHOT_DIR, 'workspace_isolated_profiles.png');
    await page.screenshot({ path: screenshotWorkspace, fullPage: true });
    console.log(`   📸 Screenshot Área de Trabalho salvo: ${screenshotWorkspace}`);

    console.log('\n🎉 =========================================================================');
    console.log('🎉 AUDITORIA CONCLUÍDA: ONBOARDING INDEPENDENTE 100% HOMOLOGADO!');
    console.log('🎉 =========================================================================\n');
  } catch (err) {
    console.error('❌ ERRO NO TESTE:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runTest();
