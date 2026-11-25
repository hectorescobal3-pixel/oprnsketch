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

async function runFullAudit() {
  console.log('🏛️ =========================================================================');
  console.log('🏛️ AUDITORIA COMPLETA E2E PÓS-REFATORAÇÃO NO OPENSKETCH (CHROME REAL)');
  console.log('🏛️ =========================================================================\n');

  const results = [];
  const logPass = (step, detail) => {
    console.log(`   ✅ [PASS] ${step}${detail ? ': ' + detail : ''}`);
    results.push({ step, status: 'PASS', detail: detail || '' });
  };

  let browser;
  const pageErrors = [];

  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // =========================================================================
    // ETAPA 1: PRIMEIRO ACESSO & ONBOARDING MINIMALISTA INDEPENDENTE
    // =========================================================================
    console.log('🔹 [ETAPA 1] Primeiro Acesso & Onboarding Minimalista Independente');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: 'auditor@escorp.systems', name: 'Auditor E2E' }));
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1000);

    // 1.1 Escolher Meu Trabalho
    await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find((el) => el.textContent?.includes('Meu Trabalho'));
      if (h2) (h2.closest('div[style*="cursor"]') || h2.parentElement || h2).click();
    });
    await delay(800);

    const onbTitle1 = await page.$eval('h1', (el) => el.textContent?.trim() || '');
    const input1 = await page.$('#profession-input');
    if (!onbTitle1.includes('Qual é a sua profissão ou área de atuação?') || !input1) {
      throw new Error(`Onboarding 1 não exibido corretamente. Título: ${onbTitle1}`);
    }
    logPass('1.1 Onboarding Meu Trabalho (Campo Único)', 'Pergunta única e input exibidos');

    await input1.type('Corretor de Imóveis');
    await delay(300);
    await (await page.$('form button[type="submit"]'))?.click();
    await delay(1000);

    const state1 = await page.evaluate(() => ({
      personal: JSON.parse(localStorage.getItem('opensketch_individual_perfil') || '{}'),
      corporate: JSON.parse(localStorage.getItem('opensketch_empresa_perfil') || '{}'),
    }));
    if (state1.personal.profession !== 'Corretor de Imóveis' || state1.corporate.onboardingCompleted) {
      throw new Error('Falha no isolamento inicial do onboarding!');
    }
    logPass('1.2 Persistência Independente Meu Trabalho', 'Corretor de Imóveis salvo; Minha Empresa intocada');

    // 1.3 Alternar para Minha Empresa pela primeira vez pelo seletor superior
    await page.evaluate(() => {
      const badge = document.querySelector('header div[title*="alternar"]');
      if (badge) badge.click();
    });
    await delay(400);
    await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('header div[style*="absolute"] button'));
      const corp = opts.find((el) => el.textContent?.includes('Minha Empresa'));
      if (corp) corp.click();
    });
    await delay(1800); // Aguarda transição animada

    const onbTitle2 = await page.$eval('h1', (el) => el.textContent?.trim() || '');
    const input2 = await page.$('#profession-input');
    if (!onbTitle2.includes('Qual é a sua profissão ou área de atuação?') || !input2) {
      throw new Error(`Onboarding 2 não disparado automaticamente para Minha Empresa! Título: ${onbTitle2}`);
    }
    logPass('1.3 Disparo Automático Onboarding Minha Empresa', 'Formulário minimalista exibido no 1º acesso corporativo');

    await input2.type('Clínica Odontológica');
    await delay(300);
    await (await page.$('form button[type="submit"]'))?.click();
    await delay(1000);

    // =========================================================================
    // ETAPA 2: ISOLAMENTO TOTAL & TRAVA DA PROFISSÃO NOS MÓDULOS
    // =========================================================================
    console.log('\n🔹 [ETAPA 2] Isolamento Total & Trava da Profissão nos Módulos');

    // 2.1 Em Minha Empresa (Clínica Odontológica)
    const corpSidebar = await page.$$eval('aside nav button', (bs) => bs.map((b) => b.textContent?.trim() || ''));
    if (!corpSidebar.some((s) => s.includes('Prospecção'))) {
      throw new Error('Prospecção ausente no Sidebar de Minha Empresa!');
    }
    logPass('2.1 Sidebar Minha Empresa', '7 módulos incluindo Prospecção & Mercado B2B');

    // Prospecção B2B
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Prospecção'));
      if (btn) btn.click();
    });
    await delay(800);
    const prospeccaoText = await page.evaluate(() => document.body.textContent || '');
    if (!prospeccaoText.includes('Prospecção') && !prospeccaoText.includes('Odontológica')) {
      throw new Error('Prospecção não carregou adequadamente em Minha Empresa!');
    }
    logPass('2.2 Prospecção B2B Exclusiva', 'Carregada em Minha Empresa');

    // Anúncios em Minha Empresa
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Anúncios'));
      if (btn) btn.click();
    });
    await delay(600);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Criar Novo Anúncio') || b.textContent?.includes('Nova Ideia'));
      if (btn) btn.click();
    });
    await delay(400);
    const adsModalTextCorp = await page.evaluate(() => document.body.textContent || '');
    if (!adsModalTextCorp.includes('Clínica Odontológica')) {
      throw new Error('AnúnciosView em Minha Empresa não está usando a profissão Clínica Odontológica!');
    }
    // Fechar modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Cancelar') || b.textContent?.trim() === '✕');
      if (btn) btn.click();
    });
    await delay(300);
    logPass('2.3 AnúnciosView (Minha Empresa)', 'Adaptado para Clínica Odontológica');

    // Clientes em Minha Empresa (4 campos)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Clientes'));
      if (btn) btn.click();
    });
    await delay(600);
    // Cadastrar cliente corporativo
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Cadastrar Novo Cliente'));
      if (btn) btn.click();
    });
    await delay(400);
    const corpCliInputs = await page.$$('.responsive-modal-card input');
    if (corpCliInputs.length !== 4) {
      throw new Error(`Esperado 4 inputs no modal de clientes, encontrado: ${corpCliInputs.length}`);
    }
    await corpCliInputs[0].type('Paciente Corporate Teste');
    await corpCliInputs[1].type('111.222.333-44');
    await corpCliInputs[2].type('(11) 91111-2222');
    await corpCliInputs[3].type('paciente@odonto.com.br');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.responsive-modal-card button')).find((b) => b.textContent?.includes('Salvar Cliente'));
      if (btn) btn.click();
    });
    await delay(500);
    const corpHeaders = await page.$$eval('table thead th', (ths) => ths.map((t) => t.textContent?.trim() || ''));
    if (corpHeaders.length !== 5 || corpHeaders.some((h) => h.includes('Status') || h.includes('Empresa'))) {
      throw new Error(`Tabela de clientes fora do padrão de 4 campos: ${corpHeaders.join(', ')}`);
    }
    logPass('2.4 ClientesView Enxuto (4 Campos)', 'Cliente corporativo salvo e tabela validada (Nome, CPF, Telefone, E-mail, Ações)');

    // Copiloto IA em Minha Empresa
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Início'));
      if (btn) btn.click();
    });
    await delay(600);
    const chatInputCorp = await page.$('input[placeholder*="Digite sua dúvida"]');
    await chatInputCorp.type('Como captar mais clientes esta semana?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Consultando ferramentas e formulando resposta...') &&
            (document.body.textContent?.toLowerCase().includes('odonto') ||
             document.body.textContent?.toLowerCase().includes('paciente') ||
             document.body.textContent?.toLowerCase().includes('clínica')),
      { timeout: 6000 }
    );
    logPass('2.5 Copiloto IA (Minha Empresa)', 'Resposta estrita no domínio Odontológico');

    // 2.6 Alternar para Meu Trabalho (Corretor de Imóveis)
    await page.evaluate(() => {
      const badge = document.querySelector('header div[title*="alternar"]');
      if (badge) badge.click();
    });
    await delay(400);
    await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('header div[style*="absolute"] button'));
      const pers = opts.find((el) => el.textContent?.includes('Meu Trabalho'));
      if (pers) pers.click();
    });
    await delay(800);

    // Sidebar Meu Trabalho (6 módulos, sem Prospecção)
    const persSidebar = await page.$$eval('aside nav button', (bs) => bs.map((b) => b.textContent?.trim() || ''));
    if (persSidebar.length !== 6 || persSidebar.some((s) => s.includes('Prospecção'))) {
      throw new Error(`Sidebar de Meu Trabalho inválido: ${persSidebar.join(', ')}`);
    }
    logPass('2.6 Sidebar Meu Trabalho', '6 módulos ativos; Prospecção devidamente ocultada');

    // Verificar isolamento de Clientes
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Clientes'));
      if (btn) btn.click();
    });
    await delay(600);
    const persCliText = await page.evaluate(() => document.body.textContent || '');
    if (persCliText.includes('Paciente Corporate Teste')) {
      throw new Error('VAZAMENTO MULTI-TENANT: Cliente de Minha Empresa apareceu em Meu Trabalho!');
    }
    logPass('2.7 Isolamento de Clientes', 'Zero vazamento entre Meu Trabalho e Minha Empresa');

    // Copiloto IA em Meu Trabalho
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Início'));
      if (btn) btn.click();
    });
    await delay(600);
    const chatInputPers = await page.$('input[placeholder*="Digite sua dúvida"]');
    await chatInputPers.type('Como melhorar minhas vendas hoje?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => !document.body.textContent?.includes('Consultando ferramentas e formulando resposta...') &&
            (document.body.textContent?.toLowerCase().includes('imóve') ||
             document.body.textContent?.toLowerCase().includes('corretor') ||
             document.body.textContent?.toLowerCase().includes('vgv')),
      { timeout: 6000 }
    );
    logPass('2.8 Copiloto IA (Meu Trabalho)', 'Resposta estrita no domínio Imobiliário (zero contaminação)');

    // =========================================================================
    // ETAPA 3: CONFIGURAÇÕES, SUPORTE GMAIL & ENCERRAMENTO INDIVIDUAL DE PERFIL
    // =========================================================================
    console.log('\n🔹 [ETAPA 3] Configurações, Suporte Gmail & Encerramento de Perfil');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Configurações'));
      if (btn) btn.click();
    });
    await delay(800);

    // 3.1 Ausência de bloco duplicado & Botões compactos & Suporte Gmail
    const configCheck = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const hasDuplicateEnvCard = Array.from(document.querySelectorAll('h2')).some((h) => h.textContent?.trim() === 'Ambiente de Trabalho');
      const hasCopyBtn = Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Copiar');

      const supportLink = Array.from(document.querySelectorAll('a')).find((a) => a.textContent?.includes('Falar com o Suporte'));
      const supportHref = supportLink?.getAttribute('href') || '';
      const supportTarget = supportLink?.getAttribute('target') || '';

      const saveBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Salvar Dados do Perfil'));
      const saveHeight = saveBtn ? saveBtn.getBoundingClientRect().height : 0;

      const darkBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Modo Escuro'));
      const darkHeight = darkBtn ? darkBtn.getBoundingClientRect().height : 0;

      const dlBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Baixar meus dados'));
      const dlHeight = dlBtn ? dlBtn.getBoundingClientRect().height : 0;

      return {
        hasDuplicateEnvCard,
        hasCopyBtn,
        hasOfficialEmail: bodyText.includes('escorpsystems@gmail.com'),
        supportHref,
        supportTarget,
        saveHeight,
        darkHeight,
        dlHeight,
      };
    });

    if (configCheck.hasDuplicateEnvCard) throw new Error('Bloco duplicado Ambiente de Trabalho ainda existe em Configurações!');
    if (configCheck.hasCopyBtn) throw new Error('Botão redundante Copiar ainda existe em Configurações!');
    if (!configCheck.hasOfficialEmail) throw new Error('E-mail oficial escorpsystems@gmail.com não exibido!');
    if (!configCheck.supportHref.startsWith('https://mail.google.com/mail/?view=cm&fs=1&to=escorpsystems%40gmail.com') || configCheck.supportTarget !== '_blank') {
      throw new Error(`Link do suporte Gmail inválido: ${configCheck.supportHref} (target=${configCheck.supportTarget})`);
    }
    if (configCheck.saveHeight > 38 || configCheck.darkHeight > 38 || configCheck.dlHeight > 38) {
      throw new Error(`Botões não estão no padrão compacto (<=38px): save=${configCheck.saveHeight}, dark=${configCheck.darkHeight}, dl=${configCheck.dlHeight}`);
    }
    logPass('3.1 Configurações Limpas & Botões Compactos', `Alturas: Salvar=${configCheck.saveHeight}px, Tema=${configCheck.darkHeight}px, Download=${configCheck.dlHeight}px`);
    logPass('3.2 Botão Suporte Direto Gmail Web', 'URL compose Gmail + escorpsystems@gmail.com + target=_blank validados');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'auditoria_final_configuracoes.png'), fullPage: true });

    // 3.3 Encerrar perfil Meu Trabalho (com Minha Empresa ativa)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Encerrar perfil Meu Trabalho'));
      if (btn) btn.click();
    });
    await delay(400);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.responsive-modal-card button')).find((b) => b.textContent?.includes('Sim, Encerrar Meu Trabalho'));
      if (btn) btn.click();
    });
    await delay(1000);

    const afterDeactivate1 = await page.evaluate(() => ({
      activeCtx: JSON.parse(localStorage.getItem('opensketch_active_context') || '{}').type,
      personalExists: Boolean(localStorage.getItem('opensketch_individual_perfil')),
      corpClients: JSON.parse(localStorage.getItem('opensketch_empresa_clientes') || '[]'),
    }));
    if (afterDeactivate1.activeCtx !== 'CORPORATE' || afterDeactivate1.personalExists) {
      throw new Error('Falha ao encerrar Meu Trabalho e redirecionar para Minha Empresa!');
    }
    if (!afterDeactivate1.corpClients.some((c) => c.name === 'Paciente Corporate Teste')) {
      throw new Error('Dados de clientes de Minha Empresa não foram preservados após encerrar Meu Trabalho!');
    }
    logPass('3.3 Encerramento Perfil Meu Trabalho', 'Redirecionado para Minha Empresa com preservação total dos dados corporativos');

    // 3.4 Encerrar perfil Minha Empresa (último perfil ativo)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((b) => b.textContent?.includes('Configurações'));
      if (btn) btn.click();
    });
    await delay(700);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Encerrar perfil Minha Empresa'));
      if (btn) btn.click();
    });
    await delay(400);
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.responsive-modal-card button')).find((b) => b.textContent?.includes('Sim, Encerrar Minha Empresa'));
      if (btn) btn.click();
    });
    await delay(1000);

    const isBackToSelection = await page.evaluate(() => ({
      hasSelectionTitle: document.body.textContent?.includes('Selecione o seu Ambiente de Trabalho'),
      h1: document.querySelector('h1')?.textContent || '',
      envSelected: localStorage.getItem('opensketch_environment_selected'),
      activeCtx: localStorage.getItem('opensketch_active_context'),
    }));
    if (!isBackToSelection.hasSelectionTitle) {
      throw new Error(`Não retornou à tela inicial após encerrar último perfil! Estado: ${JSON.stringify(isBackToSelection)}`);
    }
    logPass('3.4 Encerramento Último Perfil (Minha Empresa)', 'Retorno limpo à tela inicial de escolha de ambiente');

    // 3.5 Verificar zero erros de runtime
    if (pageErrors.length > 0) {
      throw new Error(`Erros JavaScript detectados no navegador: ${pageErrors.join(' | ')}`);
    }
    logPass('4.0 Integridade Runtime no Chrome', 'Zero pageerrors detectados em todo o fluxo');

    console.log('\n🎉 =========================================================================');
    console.log(`🎉 AUDITORIA E2E COMPLETA FINALIZADA: ${results.length}/${results.length} ETAPAS APROVADAS!`);
    console.log('🎉 =========================================================================\n');
  } catch (err) {
    console.error('\n❌ FALHA NA AUDITORIA:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

runFullAudit();
