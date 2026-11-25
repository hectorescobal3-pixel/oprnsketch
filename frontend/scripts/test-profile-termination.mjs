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
  console.log('🏛️ TESTE E2E: ENCERRAMENTO INDIVIDUAL DE PERFIL (MEU TRABALHO / MINHA EMPRESA)');
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

    // 1. Setup: Ambos os perfis configurados e ativos, começando em Meu Trabalho
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: 'hector@escorp.systems', name: 'Hector' }));
      localStorage.setItem('opensketch_environment_selected', 'true');
      localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'PERSONAL' }));

      localStorage.setItem('opensketch_individual_perfil', JSON.stringify({
        fullName: 'Hector Individual',
        username: '@hector',
        profession: 'Corretor de Imóveis',
        segment: 'Corretor de Imóveis',
        email: 'hector@escorp.systems',
        onboardingCompleted: true,
      }));

      localStorage.setItem('opensketch_empresa_perfil', JSON.stringify({
        fullName: 'Odonto Corp',
        username: '@odontocorp',
        profession: 'Clínica Odontológica',
        segment: 'Clínica Odontológica',
        email: 'contato@odontocorp.com.br',
        onboardingCompleted: true,
      }));
    });

    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // =========================================================================
    // TESTE 1: ENCERRAR PERFIL "MEU TRABALHO" COM "MINHA EMPRESA" ATIVA
    // =========================================================================
    console.log('🔹 [1. MEU TRABALHO] Navegando para Configurações...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      const cfg = btns.find((b) => b.textContent?.includes('Configurações'));
      if (cfg) cfg.click();
    });
    await delay(800);

    console.log('🔹 [1.1] Clicando em "Encerrar perfil Meu Trabalho"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('Encerrar perfil Meu Trabalho'));
      if (btn) btn.click();
    });
    await delay(500);

    // Verificar modal de confirmação
    const modalText1 = await page.$eval('.responsive-modal-card', (el) => el.textContent || '');
    if (!modalText1.includes('Encerrar perfil Meu Trabalho?') || !modalText1.includes('Minha Empresa')) {
      throw new Error(`FALHA: Texto inesperado no modal de confirmação: ${modalText1}`);
    }
    console.log('   ✅ Modal de confirmação 50+ exibido com aviso sobre continuação em Minha Empresa: PASS');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_encerrar_meu_trabalho.png'), fullPage: true });

    // Confirmar encerramento
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.responsive-modal-card button'));
      const confirmBtn = btns.find((b) => b.textContent?.includes('Sim, Encerrar Meu Trabalho'));
      if (confirmBtn) confirmBtn.click();
    });
    await delay(1000);

    // Verificar redirecionamento imediato para Minha Empresa & Limpeza do Individual
    const stateAfter1 = await page.evaluate(() => {
      const activeCtx = JSON.parse(localStorage.getItem('opensketch_active_context') || '{}');
      const personal = localStorage.getItem('opensketch_individual_perfil');
      const corporate = JSON.parse(localStorage.getItem('opensketch_empresa_perfil') || '{}');
      return {
        activeCtx: activeCtx.type,
        personalCleared: !personal,
        corporateProfession: corporate.profession,
        corporateCompleted: corporate.onboardingCompleted,
      };
    });
    console.log('   Estado após encerrar Meu Trabalho:', stateAfter1);

    if (stateAfter1.activeCtx !== 'CORPORATE') {
      throw new Error(`FALHA: Não redirecionou para CORPORATE! Atual: ${stateAfter1.activeCtx}`);
    }
    if (!stateAfter1.personalCleared) {
      throw new Error('FALHA: Dados do perfil individual não foram limpos!');
    }
    if (stateAfter1.corporateProfession !== 'Clínica Odontológica' || !stateAfter1.corporateCompleted) {
      throw new Error('FALHA: Dados de Minha Empresa foram afetados indevidamente!');
    }
    console.log('   ✅ Redirecionamento imediato para Minha Empresa & Preservação total dos dados corporativos: PASS');

    // =========================================================================
    // TESTE 2: ENCERRAR PERFIL "MINHA EMPRESA" (ÚLTIMO PERFIL ATIVO)
    // =========================================================================
    console.log('\n🔹 [2. MINHA EMPRESA] Navegando para Configurações...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      const cfg = btns.find((b) => b.textContent?.includes('Configurações'));
      if (cfg) cfg.click();
    });
    await delay(800);

    console.log('🔹 [2.1] Clicando em "Encerrar perfil Minha Empresa"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent?.includes('Encerrar perfil Minha Empresa'));
      if (btn) btn.click();
    });
    await delay(500);

    // Verificar modal de confirmação
    const modalText2 = await page.$eval('.responsive-modal-card', (el) => el.textContent || '');
    if (!modalText2.includes('Encerrar perfil Minha Empresa?') || !modalText2.includes('tela inicial')) {
      throw new Error(`FALHA: Texto inesperado no modal de encerramento do último perfil: ${modalText2}`);
    }
    console.log('   ✅ Modal de confirmação exibido com aviso de retorno à tela inicial: PASS');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'modal_encerrar_minha_empresa.png'), fullPage: true });

    // Confirmar encerramento
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.responsive-modal-card button'));
      const confirmBtn = btns.find((b) => b.textContent?.includes('Sim, Encerrar Minha Empresa'));
      if (confirmBtn) confirmBtn.click();
    });
    await delay(1000);

    // Verificar retorno à tela de seleção de ambiente
    const isEnvSelectionScreen = await page.evaluate(() => {
      return document.body.textContent?.includes('Selecione o seu Ambiente de Trabalho');
    });

    if (!isEnvSelectionScreen) {
      throw new Error('FALHA: Não retornou à tela inicial de seleção de ambiente após encerrar o último perfil ativo!');
    }
    console.log('   ✅ Redirecionado para a tela inicial de seleção de ambiente com sucesso: PASS');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'retorno_selecao_ambiente.png'), fullPage: true });

    console.log('\n🎉 =========================================================================');
    console.log('🎉 AUDITORIA CONCLUÍDA: ENCERRAMENTO INDIVIDUAL 100% VALIDADO!');
    console.log('🎉 =========================================================================\n');
  } catch (err) {
    console.error('❌ ERRO NO TESTE:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runTest();
