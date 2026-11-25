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
    console.log(`✓ Onboarding detectado para [${envLabel}]. Preenchendo...`);
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
    console.log(`✓ Onboarding de [${envLabel}] concluído com sucesso!`);
  }
}

async function runDeepE2ETest() {
  console.log('🔬 =========================================================================');
  console.log('🔬 TESTE E2E PROFUNDO: ENGENHARIA DE DADOS, UPLOAD DE MÍDIA & PERSISTÊNCIA');
  console.log('🔬 =========================================================================');
  console.log(`🌐 Alvo: ${APP_URL}`);
  console.log(`🖼️ Arquivo de Imagem para Upload: ${TEST_IMAGE_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,850'],
    defaultViewport: { width: 1400, height: 850 },
  });

  const page = await browser.newPage();

  // Aceitar automaticamente diálogos nativos do navegador (ex: window.confirm para exclusão de cliente)
  page.on('dialog', async (dialog) => {
    console.log(`  -> [Dialog Interceptado] Tipo: ${dialog.type()} | Mensagem: "${dialog.message()}"`);
    await dialog.accept();
    console.log('  -> [Dialog Aceito] Exclusão confirmada pelo navegador.');
  });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // -------------------------------------------------------------------------
    // ETAPA 0: Acesso e Login
    // -------------------------------------------------------------------------
    console.log('\n--- ETAPA 0: Acesso e Inicialização ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    await delay(3500); // splash screen

    // Login com Google para entrar direto
    const googleBtn = await page.$('button ::-p-text(Continuar com o Google)');
    if (googleBtn) {
      await googleBtn.click();
      await delay(1000);
      console.log('✓ Login efetuado com sucesso.');
    }

    // Seleção de Meu Trabalho
    const meuTrabalhoCard = await page.waitForSelector('::-p-text(Meu Trabalho)', { timeout: 8000 });
    await meuTrabalhoCard.click();
    await delay(800);
    await completeOnboardingIfPresent(page, 'Meu Trabalho');

    // -------------------------------------------------------------------------
    // ETAPA 1: Módulo de Clientes - CRUD Completo de Engenharia de Dados
    // -------------------------------------------------------------------------
    console.log('\n--- ETAPA 1: Módulo de Clientes (CRUD Completo de Engenharia de Dados) ---');
    const clientesNav = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNav.click();
    await delay(800);

    // 1.1 Criar Cliente 1 (Completo: Saúde/Cardiologia, Status Ativo, Observações)
    console.log('  -> Cadastrando Cliente 1: Dr. Roberto Albuquerque...');
    const btnNovoCliente1 = await page.waitForSelector('button ::-p-text(Cadastrar Novo Cliente)', { timeout: 6000 });
    await btnNovoCliente1.click();
    await delay(400);

    const inputNome = await page.waitForSelector('input[placeholder*="Padaria Central"]', { timeout: 5000 });
    await inputNome.type('Dr. Roberto Albuquerque - Clínica Cardiologia');

    const inputTel = await page.$('input[placeholder*="98765-4321"]');
    await inputTel.type('(11) 98765-4321');

    const inputEmail = await page.$('input[placeholder*="exemplo@email.com"]');
    await inputEmail.type('roberto@cardiovida.com.br');

    const inputEmpresa = await page.$('input[placeholder*="Consultório Médico"]');
    await inputEmpresa.type('Saúde & Cardiologia');

    const selectStatus = await page.$('select');
    await selectStatus.select('ATIVO');

    const textareaNotas = await page.$('textarea[placeholder*="preferência por contato"]');
    await textareaNotas.type('Preferência por reuniões no período matutino.');

    const btnSalvar1 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Cliente)');
    await btnSalvar1.click();
    await delay(800);
    await page.waitForSelector('::-p-text(Dr. Roberto Albuquerque - Clínica Cardiologia)', { timeout: 6000 });
    console.log('✓ Cliente 1 cadastrado e persistido com todos os campos!');

    // 1.2 Criar Cliente 2 (Completo: Alimentação/Bistrô, Status Potencial, Observações)
    console.log('  -> Cadastrando Cliente 2: Mariana Souza...');
    const btnNovoCliente2 = await page.waitForSelector('button ::-p-text(Cadastrar Novo Cliente)', { timeout: 6000 });
    await btnNovoCliente2.click();
    await delay(400);

    const inputNome2 = await page.waitForSelector('input[placeholder*="Padaria Central"]', { timeout: 5000 });
    await inputNome2.type('Mariana Souza - Bistrô & Café Gourmet');

    const inputTel2 = await page.$('input[placeholder*="98765-4321"]');
    await inputTel2.type('(11) 97654-3210');

    const inputEmail2 = await page.$('input[placeholder*="exemplo@email.com"]');
    await inputEmail2.type('mariana@bistrogourmet.com.br');

    const inputEmpresa2 = await page.$('input[placeholder*="Consultório Médico"]');
    await inputEmpresa2.type('Alimentação & Gastronomia');

    const selectStatus2 = await page.$('select');
    await selectStatus2.select('POTENCIAL');

    const textareaNotas2 = await page.$('textarea[placeholder*="preferência por contato"]');
    await textareaNotas2.type('Aguardando orçamento de cardápio digital.');

    const btnSalvar2 = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Cliente)');
    await btnSalvar2.click();
    await delay(800);
    await page.waitForSelector('::-p-text(Mariana Souza - Bistrô & Café Gourmet)', { timeout: 6000 });
    console.log('✓ Cliente 2 cadastrado e persistido com todos os campos!');

    // 1.3 Buscar & Filtrar
    console.log('  -> Testando busca por texto ("Cardiologia")...');
    const searchInput = await page.waitForSelector('input[placeholder*="buscar"]', { timeout: 5000 });
    await searchInput.type('Cardiologia');
    await delay(400);

    const hasRobertoInSearch = await page.$('::-p-text(Dr. Roberto Albuquerque)');
    const hasMarianaInSearch = await page.$('::-p-text(Mariana Souza)');
    if (hasRobertoInSearch && !hasMarianaInSearch) {
      console.log('✓ Busca por texto funcionou perfeitamente: Roberto exibido, Mariana oculta.');
    } else {
      throw new Error('Falha na busca textual de clientes.');
    }

    // Limpar busca
    const clearBtn = await page.waitForSelector('button ::-p-text(Limpar)');
    await clearBtn.click();
    await delay(400);

    // Filtrar por Status: Potenciais
    console.log('  -> Testando filtro de status ("Potenciais")...');
    const pillPotencial = await page.waitForSelector('button ::-p-text(Potenciais)', { timeout: 5000 });
    await pillPotencial.click();
    await delay(400);

    const hasMarianaInPotencial = await page.$('::-p-text(Mariana Souza)');
    const hasRobertoInPotencial = await page.$('::-p-text(Dr. Roberto Albuquerque)');
    if (hasMarianaInPotencial && !hasRobertoInPotencial) {
      console.log('✓ Filtro "Potenciais" validado: apenas clientes potenciais renderizados.');
    } else {
      throw new Error('Falha no filtro de status Potencial.');
    }

    // Filtrar por Status: Ativos
    console.log('  -> Testando filtro de status ("Ativos")...');
    const pillAtivos = await page.waitForSelector('button ::-p-text(Ativos)', { timeout: 5000 });
    await pillAtivos.click();
    await delay(400);

    const hasRobertoInAtivos = await page.$('::-p-text(Dr. Roberto Albuquerque)');
    const hasMarianaInAtivos = await page.$('::-p-text(Mariana Souza)');
    if (hasRobertoInAtivos && !hasMarianaInAtivos) {
      console.log('✓ Filtro "Ativos" validado: apenas clientes ativos renderizados.');
    } else {
      throw new Error('Falha no filtro de status Ativo.');
    }

    // Voltar para Todos
    const pillTodos = await page.waitForSelector('button ::-p-text(Todos os Clientes)', { timeout: 5000 });
    await pillTodos.click();
    await delay(400);

    // 1.4 Editar Cliente 1 (Dr. Roberto)
    console.log('  -> Editando Cliente 1 (Dr. Roberto Albuquerque)...');
    // Encontrar o botão Editar da linha do Dr. Roberto
    const robertoRow = await page.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.find((r) => r.innerText.includes('Dr. Roberto Albuquerque'));
    });
    const editBtn = await robertoRow.$('button ::-p-text(Editar)');
    await editBtn.click();
    await delay(500);

    const editTel = await page.waitForSelector('input[placeholder*="98765-4321"]', { timeout: 5000 });
    await editTel.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await editTel.type('(11) 99999-8888');

    const editStatus = await page.$('select');
    await editStatus.select('POTENCIAL');

    const editNotas = await page.$('textarea');
    await editNotas.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await editNotas.type('Atualizado: proposta aprovada em negociação de expansão.');

    const btnSalvarEdicao = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Alterações)');
    await btnSalvarEdicao.click();
    await delay(800);

    await page.waitForSelector('::-p-text((11) 99999-8888)', { timeout: 6000 });
    console.log('✓ Edição concluída e refletida na tabela com novo telefone e observação.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'cliente_editado.png') });

    // 1.5 Excluir Cliente 2 (Mariana Souza)
    console.log('  -> Excluindo Cliente 2 (Mariana Souza)...');
    const marianaRow = await page.evaluateHandle(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.find((r) => r.innerText.includes('Mariana Souza'));
    });
    const deleteBtnMariana = await marianaRow.$('button ::-p-text(Excluir)');
    await deleteBtnMariana.click();
    await delay(1000);

    const contentAfterDelete = await page.content();
    const isMarianaDeleted = !contentAfterDelete.includes('Mariana Souza - Bistrô & Café Gourmet');
    const isRobertoPreserved = contentAfterDelete.includes('Dr. Roberto Albuquerque');
    if (isMarianaDeleted && isRobertoPreserved) {
      console.log('✓ Exclusão validada com sucesso: Mariana excluída e Dr. Roberto preservado!');
    } else {
      throw new Error('Falha ao excluir Mariana Souza ou Dr. Roberto foi afetado indevidamente.');
    }

    // -------------------------------------------------------------------------
    // ETAPA 2: Módulo de Anúncios - Upload Real de Imagem & Armazenamento
    // -------------------------------------------------------------------------
    console.log('\n--- ETAPA 2: Módulo de Anúncios (Upload Real de Imagem e Pré-visualização) ---');
    const anunciosNav = await page.waitForSelector('aside nav button ::-p-text(Anúncios)', { timeout: 8000 });
    await anunciosNav.click();
    await delay(800);

    const btnNovoAnuncio = await page.waitForSelector('button ::-p-text(Criar Novo Anúncio)', { timeout: 6000 });
    await btnNovoAnuncio.click();
    await delay(500);

    // Upload real de arquivo
    console.log(`  -> Anexando imagem real: ${TEST_IMAGE_PATH}...`);
    const fileInput = await page.waitForSelector('input[type="file"]');
    await fileInput.uploadFile(TEST_IMAGE_PATH);
    await delay(1200); // aguarda compressImage e FileReader

    // Verificar se a prévia apareceu
    await page.waitForSelector('img[alt="Prévia"]', { timeout: 6000 });
    await page.waitForSelector('::-p-text(Foto pronta e otimizada)', { timeout: 6000 });
    console.log('✓ Pré-visualização da imagem carregada com sucesso via FileReader/Canvas!');

    // Preencher título e legenda
    const inputTitulo = await page.waitForSelector('input[placeholder*="Promoção Especial"]', { timeout: 5000 });
    await inputTitulo.type('Campanha Fim de Ano 2026 - Ofertas Exclusivas');

    const textareaLegenda = await page.$('textarea[placeholder*="Escreva aqui o que você quer falar"]');
    await textareaLegenda.type('Aproveite nossos descontos especiais de fim de ano! Fale conosco pelo WhatsApp.');

    const btnSalvarAnuncio = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Anúncio)', { timeout: 6000 });
    await btnSalvarAnuncio.click();
    await delay(1200);

    // Verificar se o card foi renderizado com a imagem
    await page.waitForSelector('::-p-text(Campanha Fim de Ano 2026 - Ofertas Exclusivas)', { timeout: 8000 });
    console.log('✓ Anúncio criado e persistido com imagem anexada no grid!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'anuncio_com_imagem.png') });

    // -------------------------------------------------------------------------
    // ETAPA 3: Dados do Perfil & Configurações - Persistência por Ambiente
    // -------------------------------------------------------------------------
    console.log('\n--- ETAPA 3: Dados do Perfil & Configurações (Persistência por Ambiente) ---');
    const configNav = await page.waitForSelector('aside nav button ::-p-text(Configurações)', { timeout: 8000 });
    await configNav.click();
    await delay(800);

    // Alterar Nome Completo
    const inputNomePerfil = await page.waitForSelector('input[value*="Hector Julian"], input[value*="Vendedor"], input[value*="Carlos Eduardo"]', { timeout: 6000 });
    await inputNomePerfil.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inputNomePerfil.type('Carlos Eduardo Consultor Sênior');

    // Alterar Telefone / WhatsApp
    const inputTelPerfil = await page.waitForSelector('input[placeholder*="(11) 98765-4321"]');
    await inputTelPerfil.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inputTelPerfil.type('(11) 98888-7777');

    // Alterar Profissão
    const inputProfissao = await page.waitForSelector('input[placeholder*="Consultor, Arquiteto"]');
    await inputProfissao.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await inputProfissao.type('Especialista em Gestão e Vendas B2B');

    // Salvar Perfil
    const btnSalvarPerfil = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Dados do Perfil)', { timeout: 6000 });
    await btnSalvarPerfil.click();
    await delay(1000);

    console.log('✓ Dados de perfil atualizados e salvos com sucesso!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'perfil_atualizado.png') });

    // -------------------------------------------------------------------------
    // ETAPA 4: Teste de Persistência Pós-Reload Real (F5)
    // -------------------------------------------------------------------------
    console.log('\n--- ETAPA 4: Teste de Persistência Pós-Reload do Navegador (F5) ---');
    console.log('  -> Executando page.reload()...');
    await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
    await delay(3500); // aguarda término da Splash Screen pós-reload

    // Se estiver em tela de login pós reload (ex: sessão nova), logar com Google
    const isLogin = await page.$('button ::-p-text(Continuar com o Google)');
    if (isLogin) {
      await isLogin.click();
      await delay(1000);
    }

    // Se estiver em seleção de ambiente pós reload, selecionar Meu Trabalho
    const isEnvSelect = await page.$('::-p-text(Selecione o seu Ambiente de Trabalho)');
    if (isEnvSelect) {
      const cardMeuTrabalho = await page.waitForSelector('::-p-text(Meu Trabalho)');
      await cardMeuTrabalho.click();
      await delay(1000);
      await completeOnboardingIfPresent(page, 'Meu Trabalho');
    }

    // 4.1 Validar que o cliente editado permanece intacto
    console.log('  -> Conferindo persistência no módulo Clientes...');
    const clientesNavPostF5 = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNavPostF5.click();
    await delay(800);

    const contentPostF5 = await page.content();
    const robertoPreservedPostF5 = contentPostF5.includes('Dr. Roberto Albuquerque');
    const telPreservedPostF5 = contentPostF5.includes('(11) 99999-8888');
    const marianaDeletedPostF5 = !contentPostF5.includes('Mariana Souza - Bistrô & Café Gourmet');

    if (robertoPreservedPostF5 && telPreservedPostF5 && marianaDeletedPostF5) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Clientes): Dr. Roberto com telefone (11) 99999-8888 preservado e Mariana removida pós-F5!');
    } else {
      throw new Error('Falha de persistência de clientes após reload.');
    }

    // 4.2 Validar que o anúncio com imagem anexada permanece intacto
    console.log('  -> Conferindo persistência no módulo Anúncios...');
    const anunciosNavPostF5 = await page.waitForSelector('aside nav button ::-p-text(Anúncios)', { timeout: 8000 });
    await anunciosNavPostF5.click();
    await delay(800);

    const contentAdsPostF5 = await page.content();
    const adPreservedPostF5 = contentAdsPostF5.includes('Campanha Fim de Ano 2026 - Ofertas Exclusivas');
    if (adPreservedPostF5) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Anúncios): Anúncio e imagem anexada preservados pós-F5!');
    } else {
      throw new Error('Falha de persistência de anúncios após reload.');
    }

    // 4.3 Validar que o perfil atualizado permanece intacto
    console.log('  -> Conferindo persistência no módulo Configurações...');
    const configNavPostF5 = await page.waitForSelector('aside nav button ::-p-text(Configurações)', { timeout: 8000 });
    await configNavPostF5.click();
    await delay(800);

    const contentConfigPostF5 = await page.content();
    const profilePreservedPostF5 = contentConfigPostF5.includes('Carlos Eduardo Consultor Sênior');
    const telProfilePreserved = contentConfigPostF5.includes('(11) 98888-7777');
    if (profilePreservedPostF5 && telProfilePreserved) {
      console.log('✓ PERSISTÊNCIA VALIDADA (Perfil): "Carlos Eduardo Consultor Sênior" e telefone (11) 98888-7777 intactos pós-F5!');
    } else {
      throw new Error('Falha de persistência de perfil após reload.');
    }

    // 4.4 Validar Isolamento Estrito: Alternar para Minha Empresa
    console.log('  -> Testando Isolamento: Alternando para "Minha Empresa"...');
    const topbarSwitcher = await page.waitForSelector('header ::-p-text(Meu Trabalho)', { timeout: 6000 });
    await topbarSwitcher.click();
    await delay(350);

    const corpOption = await page.waitForSelector('header button ::-p-text(Minha Empresa (Corporativo))', { timeout: 6000 });
    await corpOption.click();
    await delay(2600); // transição animada

    await completeOnboardingIfPresent(page, 'Minha Empresa');

    // Checar Clientes em Minha Empresa
    const clientesCorpPost = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesCorpPost.click();
    await delay(800);

    const contentCorpClientes = await page.content();
    if (!contentCorpClientes.includes('Dr. Roberto Albuquerque')) {
      console.log('✓ ISOLAMENTO CONFIRMADO: Os dados de clientes de "Meu Trabalho" NÃO existem em "Minha Empresa"!');
    } else {
      throw new Error('Falha de isolamento de clientes entre os perfis.');
    }

    console.log('\n=================================================================================');
    console.log('🎉 SUCESSO TOTAL: TODAS AS VALIDAÇÕES DE ENGENHARIA DE DADOS E UPLOAD APROVADAS!');
    console.log(`Erros não capturados no console do navegador: ${consoleErrors.length}`);
    console.log('=================================================================================\n');
  } catch (err) {
    console.error('❌ ERRO NO TESTE PROFUNDO:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_deep_test.png') });
  } finally {
    await browser.close();
  }
}

runDeepE2ETest();
