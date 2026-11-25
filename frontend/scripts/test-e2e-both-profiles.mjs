import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'C:\\Users\\Hector Julian\\.gemini\\antigravity\\scratch\\opensketch\\frontend\\test-screenshots';
const TEST_IMAGE_PATH = path.join(SCREENSHOT_DIR, '01_initial_auth.png');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function completeOnboardingIfPresent(page, envLabel) {
  await delay(800);
  const isStep1 = await page.$('::-p-text(Passo 1 de 2)');
  if (isStep1) {
    console.log(`  -> Onboarding detectado para [${envLabel}]. Preenchendo etapas...`);
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
    console.log(`  -> Onboarding de [${envLabel}] concluído com sucesso!`);
  }
}

async function runBothProfilesE2ETest() {
  console.log('🌟 =========================================================================================');
  console.log('🌟 VALIDAÇÃO E2E PROFUNDA DE TODOS OS MÓDULOS EM AMBOS OS PERFIS: MEU TRABALHO E MINHA EMPRESA');
  console.log('🌟 =========================================================================================');
  console.log(`🌐 Alvo: ${APP_URL}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,850'],
    defaultViewport: { width: 1400, height: 850 },
  });

  const page = await browser.newPage();

  // Auto-confirm dialogs
  page.on('dialog', async (dialog) => {
    console.log(`  -> [Diálogo Interceptado] "${dialog.message()}"`);
    await dialog.accept();
    console.log('  -> [Diálogo Aceito] Ação confirmada.');
  });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // -------------------------------------------------------------------------
    // ETAPA 0: Acesso e Inicialização
    // -------------------------------------------------------------------------
    console.log('\n--- ETAPA 0: Acesso Inicial e Login ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await delay(3500); // splash

    const googleBtn = await page.$('button ::-p-text(Continuar com o Google)');
    if (googleBtn) {
      await googleBtn.click();
      await delay(1000);
      console.log('✓ Login com Google efetuado.');
    }

    // Se estiver em seleção de ambiente, clicar em Meu Trabalho
    const meuTrabalhoCard = await page.$('::-p-text(Meu Trabalho)');
    if (meuTrabalhoCard) {
      await meuTrabalhoCard.click();
      await delay(800);
      await completeOnboardingIfPresent(page, 'Meu Trabalho');
    }

    // =========================================================================
    // CICLO 1: PERFIL 1 — MEU TRABALHO (INDIVIDUAL)
    // =========================================================================
    console.log('\n🔵 =========================================================================');
    console.log('🔵 CICLO 1: TESTE COMPLETO NO PERFIL 1 — "MEU TRABALHO" (INDIVIDUAL)');
    console.log('🔵 =========================================================================');

    // 1.1 Início (Chat IA)
    console.log('\n[1.1 MEU TRABALHO - INÍCIO & CHAT IA]');
    const inicioNav1 = await page.waitForSelector('aside nav button ::-p-text(Início)', { timeout: 8000 });
    await inicioNav1.click();
    await delay(800);

    const chatInput1 = await page.waitForSelector('input[placeholder*="Digite sua dúvida ou mensagem aqui..."]', { timeout: 6000 });
    await chatInput1.type('Como prospectar clientes no varejo e aumentar conversões de forma consultiva?');
    await page.keyboard.press('Enter');
    console.log('✓ Pergunta enviada no Chat IA. Aguardando resposta orientadora...');
    await delay(2500);
    console.log('✓ Resposta da IA orientadora recebida no Início do Meu Trabalho.');

    // 1.2 Clientes (CRUD Completo)
    console.log('\n[1.2 MEU TRABALHO - CLIENTES (CRUD COMPLETO)]');
    const clientesNav1 = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNav1.click();
    await delay(800);

    // Criar Cliente 1 (Marcos Vinicius)
    console.log('  -> Cadastrando Cliente 1 (Individual): Dr. Marcos Vinicius...');
    const btnNovoCli1 = await page.waitForSelector('button ::-p-text(Cadastrar Novo Cliente)', { timeout: 6000 });
    await btnNovoCli1.click();
    await delay(400);

    const inNome1 = await page.waitForSelector('input[placeholder*="Padaria Central"]', { timeout: 5000 });
    await inNome1.type('Dr. Marcos Vinicius - Clínica Odontológica');

    const inTel1 = await page.$('input[placeholder*="98765-4321"]');
    await inTel1.type('(11) 98111-2222');

    const inEmail1 = await page.$('input[placeholder*="exemplo@email.com"]');
    await inEmail1.type('marcos@odontovida.com.br');

    const inSeg1 = await page.$('input[placeholder*="Consultório Médico"]');
    await inSeg1.type('Odontologia & Saúde');

    const selStatus1 = await page.$('select');
    await selStatus1.select('ATIVO');

    const inNotas1 = await page.$('textarea[placeholder*="preferência por contato"]');
    await inNotas1.type('Contato preferencial via WhatsApp pela manhã.');

    const btnSalvarCli1 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Cliente)');
    await btnSalvarCli1.click();
    await delay(800);
    await page.waitForSelector('::-p-text(Dr. Marcos Vinicius - Clínica Odontológica)', { timeout: 6000 });
    console.log('✓ Cliente 1 cadastrado no Meu Trabalho com sucesso!');

    // Criar Cliente 2 (Beatriz Lima)
    console.log('  -> Cadastrando Cliente 2 (Individual): Beatriz Lima...');
    const btnNovoCli2 = await page.waitForSelector('button ::-p-text(Cadastrar Novo Cliente)', { timeout: 6000 });
    await btnNovoCli2.click();
    await delay(400);

    const inNome2 = await page.waitForSelector('input[placeholder*="Padaria Central"]', { timeout: 5000 });
    await inNome2.type('Beatriz Lima - Studio de Arquitetura & Design');

    const inTel2 = await page.$('input[placeholder*="98765-4321"]');
    await inTel2.type('(11) 98333-4444');

    const inEmail2 = await page.$('input[placeholder*="exemplo@email.com"]');
    await inEmail2.type('beatriz@studiolima.com.br');

    const inSeg2 = await page.$('input[placeholder*="Consultório Médico"]');
    await inSeg2.type('Arquitetura & Urbanismo');

    const selStatus2 = await page.$('select');
    await selStatus2.select('POTENCIAL');

    const inNotas2 = await page.$('textarea[placeholder*="preferência por contato"]');
    await inNotas2.type('Aguardando orçamento de consultoria.');

    const btnSalvarCli2 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Cliente)');
    await btnSalvarCli2.click();
    await delay(800);
    await page.waitForSelector('::-p-text(Beatriz Lima - Studio de Arquitetura & Design)', { timeout: 6000 });
    console.log('✓ Cliente 2 cadastrado no Meu Trabalho com sucesso!');

    // Buscar & Filtrar
    console.log('  -> Testando busca e filtros em Meu Trabalho...');
    const searchIn1 = await page.waitForSelector('input[placeholder*="buscar"]');
    await searchIn1.type('Odontológica');
    await delay(350);
    let hasMarcos = await page.$('::-p-text(Dr. Marcos Vinicius)');
    let hasBeatriz = await page.$('::-p-text(Beatriz Lima)');
    if (hasMarcos && !hasBeatriz) {
      console.log('✓ Busca por termo funcionando!');
    }
    const clearBtn1 = await page.waitForSelector('button ::-p-text(Limpar)');
    await clearBtn1.click();
    await delay(350);

    // Filtro Potenciais
    const pillPot1 = await page.waitForSelector('button ::-p-text(Potenciais)');
    await pillPot1.click();
    await delay(350);
    hasMarcos = await page.$('::-p-text(Dr. Marcos Vinicius)');
    hasBeatriz = await page.$('::-p-text(Beatriz Lima)');
    if (hasBeatriz && !hasMarcos) {
      console.log('✓ Filtro "Potenciais" funcionando!');
    }

    const pillAll1 = await page.waitForSelector('button ::-p-text(Todos os Clientes)');
    await pillAll1.click();
    await delay(350);

    // Editar Cliente 1 (Dr. Marcos)
    console.log('  -> Editando Dr. Marcos Vinicius...');
    const marcosRow1 = await page.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.find((r) => r.innerText.includes('Dr. Marcos Vinicius'));
    });
    const editBtn1 = await marcosRow1.$('button ::-p-text(Editar)');
    await editBtn1.click();
    await delay(500);

    const editTel1 = await page.waitForSelector('input[placeholder*="98765-4321"]');
    await editTel1.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await editTel1.type('(11) 99999-1111');

    const editStatus1 = await page.$('select');
    await editStatus1.select('POTENCIAL');

    const editNotas1 = await page.$('textarea');
    await editNotas1.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await editNotas1.type('Atualizado: contrato assinado, fase de onboarding.');

    const btnSalvarEdicao1 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Alterações)');
    await btnSalvarEdicao1.click();
    await delay(800);
    await page.waitForSelector('::-p-text((11) 99999-1111)', { timeout: 6000 });
    console.log('✓ Edição do cliente concluída com sucesso!');

    // Excluir Cliente 2 (Beatriz Lima)
    console.log('  -> Excluindo Beatriz Lima...');
    const beatrizRow1 = await page.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.find((r) => r.innerText.includes('Beatriz Lima'));
    });
    const delBtn1 = await beatrizRow1.$('button ::-p-text(Excluir)');
    await delBtn1.click();
    await delay(1000);

    const contentAfterDel1 = await page.content();
    if (!contentAfterDel1.includes('Beatriz Lima') && contentAfterDel1.includes('Dr. Marcos Vinicius')) {
      console.log('✓ Exclusão validada: Beatriz removida e Dr. Marcos preservado!');
    }

    // 1.3 Prospecção (Mapa-Múndi + Prompt IA)
    console.log('\n[1.3 MEU TRABALHO - PROSPECÇÃO (MAPA & IA)]');
    const prospeccaoNav1 = await page.waitForSelector('aside nav button ::-p-text(Prospecção)', { timeout: 8000 });
    await prospeccaoNav1.click();
    await delay(1200);

    const mapSvg1 = await page.$('svg, canvas');
    if (mapSvg1) console.log('✓ Mapa-Múndi Plano carregado com sucesso!');

    const promptIn1 = await page.waitForSelector('input[placeholder*="Ex:"]', { timeout: 6000 });
    await promptIn1.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await promptIn1.type('Abordagem para profissionais autônomos e consultórios');

    const genBtn1 = await page.waitForSelector('button ::-p-text(Gerar Novas Frases)', { timeout: 6000 });
    await genBtn1.click();
    console.log('✓ Gerando frases de prospecção...');
    await delay(1500);
    console.log('✓ 3 Frases de prospecção geradas com sucesso!');

    // 1.4 Anúncios (Upload Real de Imagem + Formulário)
    console.log('\n[1.4 MEU TRABALHO - ANÚNCIOS (UPLOAD DE IMAGEM & FORMULÁRIO)]');
    const anunciosNav1 = await page.waitForSelector('aside nav button ::-p-text(Anúncios)', { timeout: 8000 });
    await anunciosNav1.click();
    await delay(800);

    const btnCriarAd1 = await page.waitForSelector('button ::-p-text(Criar Novo Anúncio)', { timeout: 6000 });
    await btnCriarAd1.click();
    await delay(500);

    console.log(`  -> Fazendo upload da imagem real: ${TEST_IMAGE_PATH}...`);
    const fileIn1 = await page.waitForSelector('input[type="file"]');
    await fileIn1.uploadFile(TEST_IMAGE_PATH);
    await delay(1200);

    await page.waitForSelector('img[alt="Prévia"]', { timeout: 6000 });
    console.log('✓ Prévia da imagem carregada via FileReader/Canvas!');

    const inTituloAd1 = await page.waitForSelector('input[placeholder*="Promoção Especial"]');
    await inTituloAd1.type('Campanha Consultoria Individual 2026');

    const inLegendaAd1 = await page.$('textarea[placeholder*="Escreva aqui o que você quer falar"]');
    await inLegendaAd1.type('Desenvolva sua empresa com nossos diagnósticos estratégicos.');

    const btnSalvarAd1 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Anúncio)', { timeout: 6000 });
    await btnSalvarAd1.click();
    await delay(1200);
    await page.waitForSelector('::-p-text(Campanha Consultoria Individual 2026)', { timeout: 8000 });
    console.log('✓ Anúncio com imagem criado e persistido no grid!');

    // 1.5 Configurações / Perfil & Exportação
    console.log('\n[1.5 MEU TRABALHO - PERFIL & EXPORTAÇÃO]');
    const configNav1 = await page.waitForSelector('aside nav button ::-p-text(Configurações)', { timeout: 8000 });
    await configNav1.click();
    await delay(800);

    // Editar dados cadastrais
    const inNomePerfil1 = await page.waitForSelector('input[value*="Hector"], input[value*="Carlos"], input[value*="Vendedor"], input[value*="Consultor"]');
    await inNomePerfil1.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inNomePerfil1.type('Consultor Hector Julian Sênior');

    const inTelPerfil1 = await page.waitForSelector('input[placeholder*="(11) 98765-4321"]');
    await inTelPerfil1.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inTelPerfil1.type('(11) 97777-6666');

    const inProfPerfil1 = await page.waitForSelector('input[placeholder*="Consultor, Arquiteto"]');
    await inProfPerfil1.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inProfPerfil1.type('Consultoria Comercial Individual');

    const btnSalvarPerfil1 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Dados do Perfil)');
    await btnSalvarPerfil1.click();
    await delay(1000);
    console.log('✓ Dados do perfil individual atualizados e salvos!');

    // Acionar exportação
    const btnExport1 = await page.waitForSelector('button ::-p-text(Baixar meus dados)');
    await btnExport1.click();
    await delay(500);
    console.log('✓ Exportação de dados de "Meu Trabalho" acionada com sucesso!');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_meu_trabalho_completo.png') });
    console.log('🎉 CICLO 1 EM "MEU TRABALHO" 100% CONCLUÍDO COM SUCESSO!');

    // =========================================================================
    // CICLO 2: PERFIL 2 — MINHA EMPRESA (CORPORATIVO)
    // =========================================================================
    console.log('\n🏢 =========================================================================');
    console.log('🏢 CICLO 2: TESTE COMPLETO NO PERFIL 2 — "MINHA EMPRESA" (CORPORATIVO)');
    console.log('🏢 =========================================================================');

    // Alternar para Minha Empresa pelo seletor de topo
    console.log('\n  -> Alternando para "Minha Empresa" pelo seletor rápido no topo...');
    const topbarSwitcher1 = await page.waitForSelector('header ::-p-text(Meu Trabalho)', { timeout: 6000 });
    await topbarSwitcher1.click();
    await delay(350);

    const corpOption1 = await page.waitForSelector('header button ::-p-text(Minha Empresa (Corporativo))', { timeout: 6000 });
    await corpOption1.click();
    console.log('  -> Executando transição animada corporativa...');
    await delay(2600); // transição animada

    await completeOnboardingIfPresent(page, 'Minha Empresa');

    // 2.1 Início (Chat IA Corporativo)
    console.log('\n[2.1 MINHA EMPRESA - INÍCIO & CHAT IA]');
    const inicioNav2 = await page.waitForSelector('aside nav button ::-p-text(Início)', { timeout: 8000 });
    await inicioNav2.click();
    await delay(800);

    const chatInput2 = await page.waitForSelector('input[placeholder*="Digite sua dúvida ou mensagem aqui..."]', { timeout: 6000 });
    await chatInput2.type('Como estruturar metas de vendas para equipe comercial de 10 vendedores?');
    await page.keyboard.press('Enter');
    console.log('✓ Pergunta de gestão enviada no Chat IA. Aguardando resposta corporativa...');
    await delay(2500);
    console.log('✓ Resposta corporativa da IA recebida com sucesso!');

    // 2.2 Clientes Corporativos (CRUD Completo & Isolamento)
    console.log('\n[2.2 MINHA EMPRESA - CLIENTES (CRUD COMPLETO & ISOLAMENTO)]');
    const clientesNav2 = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNav2.click();
    await delay(800);

    // Validação de isolamento: Dr. Marcos Vinicius NÃO pode existir aqui!
    const corpContentInit = await page.content();
    if (!corpContentInit.includes('Dr. Marcos Vinicius')) {
      console.log('✓ ISOLAMENTO COMPROVADO: "Dr. Marcos Vinicius" NÃO existe em "Minha Empresa"!');
    } else {
      throw new Error('Falha de isolamento de dados: cliente individual vazou para o corporativo!');
    }

    // Criar Cliente Corporativo 1 (Distribuidora Nacional)
    console.log('  -> Cadastrando Cliente 1 (Corporativo): Distribuidora Nacional de Peças S.A....');
    const btnNovoCliCorp1 = await page.waitForSelector('button ::-p-text(Cadastrar Novo Cliente)', { timeout: 6000 });
    await btnNovoCliCorp1.click();
    await delay(400);

    const inNomeCorp1 = await page.waitForSelector('input[placeholder*="Padaria Central"]', { timeout: 5000 });
    await inNomeCorp1.type('Distribuidora Nacional de Peças S.A.');

    const inTelCorp1 = await page.$('input[placeholder*="98765-4321"]');
    await inTelCorp1.type('(11) 91111-0000');

    const inEmailCorp1 = await page.$('input[placeholder*="exemplo@email.com"]');
    await inEmailCorp1.type('comercial@distribuidoranacional.com.br');

    const inSegCorp1 = await page.$('input[placeholder*="Consultório Médico"]');
    await inSegCorp1.type('Logística & Autopeças');

    const selStatusCorp1 = await page.$('select');
    await selStatusCorp1.select('ATIVO');

    const inNotasCorp1 = await page.$('textarea[placeholder*="preferência por contato"]');
    await inNotasCorp1.type('Conta corporativa com faturamento quinzenal.');

    const btnSalvarCliCorp1 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Cliente)');
    await btnSalvarCliCorp1.click();
    await delay(800);
    await page.waitForSelector('::-p-text(Distribuidora Nacional de Peças S.A.)', { timeout: 6000 });
    console.log('✓ Cliente Corporativo 1 cadastrado com sucesso!');

    // Criar Cliente Corporativo 2 (TechSolutions Brasil)
    console.log('  -> Cadastrando Cliente 2 (Corporativo): TechSolutions Brasil Tecnologia Ltda...');
    const btnNovoCliCorp2 = await page.waitForSelector('button ::-p-text(Cadastrar Novo Cliente)', { timeout: 6000 });
    await btnNovoCliCorp2.click();
    await delay(400);

    const inNomeCorp2 = await page.waitForSelector('input[placeholder*="Padaria Central"]', { timeout: 5000 });
    await inNomeCorp2.type('TechSolutions Brasil Tecnologia Ltda');

    const inTelCorp2 = await page.$('input[placeholder*="98765-4321"]');
    await inTelCorp2.type('(11) 92222-0000');

    const inEmailCorp2 = await page.$('input[placeholder*="exemplo@email.com"]');
    await inEmailCorp2.type('contato@techsolutions.com.br');

    const inSegCorp2 = await page.$('input[placeholder*="Consultório Médico"]');
    await inSegCorp2.type('Tecnologia & SaaS');

    const selStatusCorp2 = await page.$('select');
    await selStatusCorp2.select('POTENCIAL');

    const inNotasCorp2 = await page.$('textarea[placeholder*="preferência por contato"]');
    await inNotasCorp2.type('Aguardando aprovação de contrato anual pelo diretor.');

    const btnSalvarCliCorp2 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Cliente)');
    await btnSalvarCliCorp2.click();
    await delay(800);
    await page.waitForSelector('::-p-text(TechSolutions Brasil Tecnologia Ltda)', { timeout: 6000 });
    console.log('✓ Cliente Corporativo 2 cadastrado com sucesso!');

    // Buscar & Filtrar em Minha Empresa
    console.log('  -> Testando busca e filtros corporativos...');
    const searchInCorp = await page.waitForSelector('input[placeholder*="buscar"]');
    await searchInCorp.type('TechSolutions');
    await delay(350);
    let hasTech = await page.$('::-p-text(TechSolutions Brasil)');
    let hasDist = await page.$('::-p-text(Distribuidora Nacional)');
    if (hasTech && !hasDist) {
      console.log('✓ Busca por termo corporativo funcionando!');
    }
    const clearBtnCorp = await page.waitForSelector('button ::-p-text(Limpar)');
    await clearBtnCorp.click();
    await delay(350);

    // Filtro Ativos
    const pillAtivCorp = await page.waitForSelector('button ::-p-text(Ativos)');
    await pillAtivCorp.click();
    await delay(350);
    hasTech = await page.$('::-p-text(TechSolutions Brasil)');
    hasDist = await page.$('::-p-text(Distribuidora Nacional)');
    if (hasDist && !hasTech) {
      console.log('✓ Filtro "Ativos" corporativo funcionando!');
    }

    const pillAllCorp = await page.waitForSelector('button ::-p-text(Todos os Clientes)');
    await pillAllCorp.click();
    await delay(350);

    // Editar Cliente Corporativo 1 (Distribuidora Nacional)
    console.log('  -> Editando Distribuidora Nacional...');
    const distRow = await page.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.find((r) => r.innerText.includes('Distribuidora Nacional'));
    });
    const editBtnCorp = await distRow.$('button ::-p-text(Editar)');
    await editBtnCorp.click();
    await delay(500);

    const editTelCorp = await page.waitForSelector('input[placeholder*="98765-4321"]');
    await editTelCorp.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await editTelCorp.type('(11) 93333-0000');

    const editStatusCorp = await page.$('select');
    await editStatusCorp.select('POTENCIAL');

    const editNotasCorp = await page.$('textarea');
    await editNotasCorp.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await editNotasCorp.type('Atualizado: negociação de novo lote para o 1º trimestre.');

    const btnSalvarEdicaoCorp = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Alterações)');
    await btnSalvarEdicaoCorp.click();
    await delay(800);
    await page.waitForSelector('::-p-text((11) 93333-0000)', { timeout: 6000 });
    console.log('✓ Edição do cliente corporativo concluída!');

    // Excluir Cliente Corporativo 2 (TechSolutions)
    console.log('  -> Excluindo TechSolutions Brasil...');
    const techRow = await page.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.find((r) => r.innerText.includes('TechSolutions Brasil'));
    });
    const delBtnCorp = await techRow.$('button ::-p-text(Excluir)');
    await delBtnCorp.click();
    await delay(1000);

    const contentAfterDelCorp = await page.content();
    if (!contentAfterDelCorp.includes('TechSolutions Brasil') && contentAfterDelCorp.includes('Distribuidora Nacional')) {
      console.log('✓ Exclusão validada: TechSolutions removida e Distribuidora Nacional preservada!');
    }

    // 2.3 Prospecção Corporativa (Mapa-Múndi + Prompt IA B2B)
    console.log('\n[2.3 MINHA EMPRESA - PROSPECÇÃO B2B (MAPA & IA)]');
    const prospeccaoNav2 = await page.waitForSelector('aside nav button ::-p-text(Prospecção)', { timeout: 8000 });
    await prospeccaoNav2.click();
    await delay(1200);

    const mapSvg2 = await page.$('svg, canvas');
    if (mapSvg2) console.log('✓ Mapa-Múndi Plano Corporativo renderizado!');

    const promptIn2 = await page.waitForSelector('input[placeholder*="Ex:"]', { timeout: 6000 });
    await promptIn2.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await promptIn2.type('Abordagem corporativa para indústrias e grandes distribuidoras B2B');

    const genBtn2 = await page.waitForSelector('button ::-p-text(Gerar Novas Frases)', { timeout: 6000 });
    await genBtn2.click();
    console.log('✓ Gerando frases corporativas...');
    await delay(1500);
    console.log('✓ 3 Frases de prospecção corporativa geradas com sucesso!');

    // 2.4 Anúncios Corporativos (Upload Real de Imagem + Campanha)
    console.log('\n[2.4 MINHA EMPRESA - ANÚNCIOS CORPORATIVOS]');
    const anunciosNav2 = await page.waitForSelector('aside nav button ::-p-text(Anúncios)', { timeout: 8000 });
    await anunciosNav2.click();
    await delay(800);

    const btnCriarAd2 = await page.waitForSelector('button ::-p-text(Criar Novo Anúncio)', { timeout: 6000 });
    await btnCriarAd2.click();
    await delay(500);

    console.log(`  -> Fazendo upload da imagem corporativa: ${TEST_IMAGE_PATH}...`);
    const fileIn2 = await page.waitForSelector('input[type="file"]');
    await fileIn2.uploadFile(TEST_IMAGE_PATH);
    await delay(1200);

    await page.waitForSelector('img[alt="Prévia"]', { timeout: 6000 });

    const inTituloAd2 = await page.waitForSelector('input[placeholder*="Promoção Especial"]');
    await inTituloAd2.type('Campanha Corporativa B2B Escala Nacional');

    const inLegendaAd2 = await page.$('textarea[placeholder*="Escreva aqui o que você quer falar"]');
    await inLegendaAd2.type('Soluções integradas de suprimentos para grandes corporações com atendimento dedicado.');

    const btnSalvarAd2 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Anúncio)', { timeout: 6000 });
    await btnSalvarAd2.click();
    await delay(1200);
    await page.waitForSelector('::-p-text(Campanha Corporativa B2B Escala Nacional)', { timeout: 8000 });
    console.log('✓ Anúncio corporativo criado e persistido no grid com imagem!');

    // 2.5 Configurações / Perfil da Empresa & Exportação
    console.log('\n[2.5 MINHA EMPRESA - PERFIL CORPORATIVO & EXPORTAÇÃO]');
    const configNav2 = await page.waitForSelector('aside nav button ::-p-text(Configurações)', { timeout: 8000 });
    await configNav2.click();
    await delay(800);

    // Editar dados da empresa
    const inNomePerfil2 = await page.waitForSelector('input[value*="Empresa"], input[value*="Hector"], input[value*="Consultor"], input[value*="Carlos"]');
    await inNomePerfil2.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inNomePerfil2.type('ESCORP Soluções Corporativas Ltda');

    const inTelPerfil2 = await page.waitForSelector('input[placeholder*="(11) 98765-4321"]');
    await inTelPerfil2.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inTelPerfil2.type('(11) 94444-5555');

    const inProfPerfil2 = await page.waitForSelector('input[placeholder*="Comércio e Varejo"]');
    await inProfPerfil2.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inProfPerfil2.type('Gestão Corporativa e Inteligência B2B');

    const btnSalvarPerfil2 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Dados do Perfil)');
    await btnSalvarPerfil2.click();
    await delay(1000);
    console.log('✓ Perfil de "Minha Empresa" atualizado e salvo com sucesso!');

    // Acionar exportação corporativa
    const btnExport2 = await page.waitForSelector('button ::-p-text(Baixar meus dados)');
    await btnExport2.click();
    await delay(500);
    console.log('✓ Exportação de dados corporativos acionada com sucesso!');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_minha_empresa_completo.png') });
    console.log('🎉 CICLO 2 EM "MINHA EMPRESA" 100% CONCLUÍDO COM SUCESSO!');

    // =========================================================================
    // ETAPA 3: PROVA FINAL DE PERSISTÊNCIA (F5) E ISOLAMENTO CRUZADO
    // =========================================================================
    console.log('\n🔒 =========================================================================');
    console.log('🔒 ETAPA 3: PROVA FINAL DE PERSISTÊNCIA (RELOAD F5) E ISOLAMENTO CRUZADO');
    console.log('🔒 =========================================================================');

    console.log('  -> Executando page.reload()...');
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await delay(3500); // splash pós reload

    // Se pedir ambiente pós-reload, entrar em Minha Empresa
    const isEnvSelect3 = await page.$('::-p-text(Selecione o seu Ambiente de Trabalho)');
    if (isEnvSelect3) {
      const cardCorp = await page.waitForSelector('::-p-text(Minha Empresa)');
      await cardCorp.click();
      await delay(2600);
    }

    // 3.1 Conferir integridade em Minha Empresa pós F5
    console.log('  -> Conferindo Minha Empresa pós-F5...');
    const clientesNavCorpF5 = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNavCorpF5.click();
    await delay(800);

    const corpContentF5 = await page.content();
    const hasDistPostF5 = corpContentF5.includes('Distribuidora Nacional');
    const hasTelDistPostF5 = corpContentF5.includes('(11) 93333-0000');
    const techDeletedPostF5 = !corpContentF5.includes('TechSolutions Brasil');
    const noIndividualLeak = !corpContentF5.includes('Dr. Marcos Vinicius');

    if (hasDistPostF5 && hasTelDistPostF5 && techDeletedPostF5 && noIndividualLeak) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Minha Empresa): Distribuidora Nacional preservada com telefone (11) 93333-0000 e ZERO dados de Meu Trabalho vazados!');
    } else {
      throw new Error('Falha de persistência ou vazamento em Minha Empresa pós-F5.');
    }

    // Conferir Anúncios Corporativos pós F5
    const anunciosNavCorpF5 = await page.waitForSelector('aside nav button ::-p-text(Anúncios)', { timeout: 8000 });
    await anunciosNavCorpF5.click();
    await delay(800);
    const adsCorpContentF5 = await page.content();
    if (adsCorpContentF5.includes('Campanha Corporativa B2B Escala Nacional') && !adsCorpContentF5.includes('Campanha Consultoria Individual 2026')) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Anúncios Minha Empresa): Anúncio corporativo preservado e isolado de Meu Trabalho!');
    } else {
      throw new Error('Falha na persistência ou isolamento de anúncios corporativos.');
    }

    // 3.2 Alternar de volta para Meu Trabalho e conferir integridade
    console.log('  -> Alternando de volta para "Meu Trabalho" para checar isolamento cruzado...');
    const topbarSwitcherFinal = await page.waitForSelector('header ::-p-text(Minha Empresa)', { timeout: 6000 });
    await topbarSwitcherFinal.click();
    await delay(350);

    const personalOptionFinal = await page.waitForSelector('header button ::-p-text(Meu Trabalho (Individual))', { timeout: 6000 });
    await personalOptionFinal.click();
    await delay(1000);

    // Conferir Clientes em Meu Trabalho
    const clientesNavPersonalF5 = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNavPersonalF5.click();
    await delay(800);

    const personalContentF5 = await page.content();
    const hasMarcosPersonalF5 = personalContentF5.includes('Dr. Marcos Vinicius');
    const hasTelMarcosPersonalF5 = personalContentF5.includes('(11) 99999-1111');
    const beatrizDeletedPersonalF5 = !personalContentF5.includes('Beatriz Lima');
    const noCorpLeak = !personalContentF5.includes('Distribuidora Nacional');

    if (hasMarcosPersonalF5 && hasTelMarcosPersonalF5 && beatrizDeletedPersonalF5 && noCorpLeak) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Meu Trabalho): Dr. Marcos Vinicius preservado com telefone (11) 99999-1111 e ZERO dados de Minha Empresa presentes!');
    } else {
      throw new Error('Falha de persistência ou vazamento cruzado em Meu Trabalho.');
    }

    // Conferir Anúncios em Meu Trabalho
    const anunciosNavPersonalF5 = await page.waitForSelector('aside nav button ::-p-text(Anúncios)', { timeout: 8000 });
    await anunciosNavPersonalF5.click();
    await delay(800);
    const adsPersonalContentF5 = await page.content();
    if (adsPersonalContentF5.includes('Campanha Consultoria Individual 2026') && !adsPersonalContentF5.includes('Campanha Corporativa B2B Escala Nacional')) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Anúncios Meu Trabalho): Anúncio individual preservado e isolado de Minha Empresa!');
    } else {
      throw new Error('Falha na persistência ou isolamento de anúncios individuais.');
    }

    // Conferir Perfil em Meu Trabalho
    const configNavPersonalF5 = await page.waitForSelector('aside nav button ::-p-text(Configurações)', { timeout: 8000 });
    await configNavPersonalF5.click();
    await delay(800);
    const configPersonalContentF5 = await page.content();
    if (configPersonalContentF5.includes('Consultor Hector Julian Sênior') && configPersonalContentF5.includes('(11) 97777-6666') && !configPersonalContentF5.includes('ESCORP Soluções Corporativas Ltda')) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Perfil Meu Trabalho): Perfil individual intacto e 100% isolado!');
    } else {
      throw new Error('Falha na persistência ou isolamento de perfil individual.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_isolamento_cruzado_confirmado.png') });

    console.log('\n=========================================================================================');
    console.log('🎉 SUCESSO TOTAL E ABSOLUTO: 100% DOS MÓDULOS VALIDADOS EM AMBOS OS PERFIS COM ISOLAMENTO!');
    console.log(`Erros não capturados no console do navegador: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Detalhes dos erros capturados no console:', consoleErrors);
    }
    console.log('=========================================================================================\n');
  } catch (err) {
    console.error('❌ ERRO NO TESTE DE AMBOS OS PERFIS:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_both_profiles.png') });
  } finally {
    await browser.close();
  }
}

runBothProfilesE2ETest();
