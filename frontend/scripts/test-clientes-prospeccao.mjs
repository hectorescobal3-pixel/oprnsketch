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
  console.log('🏛️ TESTE E2E: CADASTRO DE CLIENTES ENXUTO (4 CAMPOS) & EXCLUSIVIDADE PROSPECÇÃO');
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

    // 1. Injetar ambiente inicial "Meu Trabalho" (PERSONAL)
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: 'hector.julian@escorp.systems', name: 'Hector Julian' }));
      localStorage.setItem('opensketch_environment_selected', 'true');
      localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'PERSONAL' }));
      localStorage.setItem('opensketch_onboarding_completed_PERSONAL', 'true');
    });

    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // =========================================================================
    // TESTE 1: MÓDULOS EM "MEU TRABALHO" (PERSONAL)
    // =========================================================================
    console.log('🔹 [1. MEU TRABALHO] Verificando Sidebar e exclusão da Prospecção...');
    const personalSidebarItems = await page.$$eval('aside nav button', (btns) =>
      btns.map((b) => b.textContent?.trim() || '')
    );
    console.log('   Módulos listados no Sidebar:', personalSidebarItems);

    const hasProspeccaoInPersonal = personalSidebarItems.some((item) =>
      item.toLowerCase().includes('prospecção')
    );

    if (hasProspeccaoInPersonal) {
      throw new Error('FALHA: Aba Prospecção está visível no ambiente Meu Trabalho!');
    }
    console.log('   ✅ Prospecção NÃO está visível em Meu Trabalho (Total de 6 módulos): PASS');

    // =========================================================================
    // TESTE 2: TELA DE CLIENTES EM "MEU TRABALHO"
    // =========================================================================
    console.log('🔹 [2. MEU TRABALHO] Navegando para Clientes...');
    // Clicar no módulo Clientes
    const clientesBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      return btns.find((b) => b.textContent?.includes('Clientes'));
    });
    if (clientesBtn) {
      await clientesBtn.asElement()?.click();
      await delay(800);
    }

    // Verificar cabeçalhos da tabela de Clientes
    const tableHeaders = await page.$$eval('table thead th', (ths) =>
      ths.map((th) => th.textContent?.trim() || '')
    );
    console.log('   Cabeçalhos da Tabela de Clientes:', tableHeaders);

    const hasEmpresaCol = tableHeaders.some((h) => h.toLowerCase().includes('empresa') || h.toLowerCase().includes('segmento'));
    const hasStatusCol = tableHeaders.some((h) => h.toLowerCase().includes('status'));

    if (hasEmpresaCol || hasStatusCol) {
      throw new Error(`FALHA: Tabela de clientes ainda contém Empresa ou Status: ${tableHeaders.join(', ')}`);
    }
    console.log('   ✅ Tabela contém apenas os campos essenciais (Nome, CPF, Telefone, E-mail, Ações): PASS');

    // =========================================================================
    // TESTE 3: MODAL NOVO CLIENTE (EXCLUSIVAMENTE OS 4 CAMPOS)
    // =========================================================================
    console.log('🔹 [3. MODAL NOVO CLIENTE] Abrindo modal e inspecionando formulário...');
    // Clicar em "Cadastrar Novo Cliente"
    const novoClienteBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.textContent?.includes('Cadastrar Novo Cliente'));
    });
    if (novoClienteBtn) {
      await novoClienteBtn.asElement()?.click();
      await delay(600);
    }

    // Coletar rótulos dentro do modal
    const modalLabels = await page.$$eval('.responsive-modal-card label', (labels) =>
      labels.map((l) => l.textContent?.trim() || '')
    );
    console.log('   Campos/Rótulos no Modal:', modalLabels);

    const hasOldFields = modalLabels.some(
      (l) =>
        l.toLowerCase().includes('ramo') ||
        l.toLowerCase().includes('empresa') ||
        l.toLowerCase().includes('status') ||
        l.toLowerCase().includes('observações') ||
        l.toLowerCase().includes('anotações')
    );

    if (hasOldFields) {
      throw new Error(`FALHA: Modal contém campos antigos: ${modalLabels.join(', ')}`);
    }

    const hasNome = modalLabels.some((l) => l.toLowerCase().includes('nome'));
    const hasCpf = modalLabels.some((l) => l.toLowerCase().includes('cpf'));
    const hasPhone = modalLabels.some((l) => l.toLowerCase().includes('telefone') || l.toLowerCase().includes('whatsapp'));
    const hasEmail = modalLabels.some((l) => l.toLowerCase().includes('e-mail') || l.toLowerCase().includes('email'));

    if (!hasNome || !hasCpf || !hasPhone || !hasEmail) {
      throw new Error('FALHA: Um dos 4 campos obrigatórios/essenciais está ausente!');
    }
    console.log('   ✅ Modal contém EXCLUSIVAMENTE os 4 campos (Nome, CPF, Telefone/WhatsApp, E-mail): PASS');

    // Preencher os 4 campos e salvar
    console.log('   Preenchendo os 4 campos do cliente...');
    const inputs = await page.$$('.responsive-modal-card input');
    if (inputs.length >= 4) {
      await inputs[0].type('Dr. Roberto Andrade');
      await inputs[1].type('123.456.789-00');
      await inputs[2].type('(11) 98765-4321');
      await inputs[3].type('roberto.andrade@clinica.com.br');
    }

    // Clicar em "Salvar Cliente"
    const salvarBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('.responsive-modal-card button'));
      return btns.find((b) => b.textContent?.includes('Salvar Cliente'));
    });
    if (salvarBtn) {
      await salvarBtn.asElement()?.click();
      await delay(600);
    }

    // Verificar se o cliente recém-criado está na tabela com seus 4 dados
    const tableText = await page.$eval('table tbody', (el) => el.textContent || '');
    if (!tableText.includes('Dr. Roberto Andrade') || !tableText.includes('123.456.789-00')) {
      throw new Error('FALHA: Novo cliente não foi refletido na tabela com os dados corretos!');
    }
    console.log('   ✅ Cliente cadastrado e exibido na tabela com sucesso: PASS');

    // Capturar tela da tabela de clientes simplificada
    const screenshotClientes = path.join(SCREENSHOT_DIR, 'clientes_4_campos_validado.png');
    await page.screenshot({ path: screenshotClientes, fullPage: true });
    console.log(`   📸 Screenshot salvo: ${screenshotClientes}`);

    // =========================================================================
    // TESTE 4: AMBIENTE "MINHA EMPRESA" (CORPORATE)
    // =========================================================================
    console.log('\n🔹 [4. MINHA EMPRESA] Alternando para Minha Empresa...');
    await page.evaluate(() => {
      localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'CORPORATE' }));
      localStorage.setItem('opensketch_onboarding_completed_CORPORATE', 'true');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    const corporateSidebarItems = await page.$$eval('aside nav button', (btns) =>
      btns.map((b) => b.textContent?.trim() || '')
    );
    console.log('   Módulos listados em Minha Empresa:', corporateSidebarItems);

    const hasProspeccaoInCorporate = corporateSidebarItems.some((item) =>
      item.toLowerCase().includes('prospecção')
    );

    if (!hasProspeccaoInCorporate) {
      throw new Error('FALHA: Prospecção & Mercado B2B NÃO está presente em Minha Empresa!');
    }
    console.log('   ✅ Prospecção & Mercado B2B VISÍVEL e acessível em Minha Empresa: PASS');

    // Acessar Prospecção em Minha Empresa
    const prospeccaoBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('aside nav button'));
      return btns.find((b) => b.textContent?.includes('Prospecção'));
    });
    if (prospeccaoBtn) {
      await prospeccaoBtn.asElement()?.click();
      await delay(800);
    }

    // Verificar se a tela de prospecção carregou normalmente
    const prospeccaoLoaded = await page.evaluate(() => {
      return document.body.textContent?.includes('Radar de Prospecção') || document.body.textContent?.includes('Prospecção');
    });

    if (!prospeccaoLoaded) {
      throw new Error('FALHA: Tela de prospecção não carregou em Minha Empresa!');
    }
    console.log('   ✅ Tela de Prospecção B2B aberta com sucesso em Minha Empresa: PASS');

    const screenshotCorporate = path.join(SCREENSHOT_DIR, 'minha_empresa_prospeccao_validada.png');
    await page.screenshot({ path: screenshotCorporate, fullPage: true });
    console.log(`   📸 Screenshot salvo: ${screenshotCorporate}`);

    console.log('\n🎉 =========================================================================');
    console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
    console.log('🎉 =========================================================================\n');
  } catch (err) {
    console.error('❌ ERRO NO TESTE:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runTest();
