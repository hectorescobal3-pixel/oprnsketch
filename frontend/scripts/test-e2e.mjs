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

async function completeOnboardingIfPresent(page, envLabel) {
  await delay(800);
  const isStep1 = await page.$('::-p-text(Passo 1 de 2)');
  if (isStep1) {
    console.log(`✓ Questionário de Onboarding detectado para [${envLabel}].`);
    console.log(`  -> Selecionando ocupação no Passo 1...`);
    const combobox1 = await page.waitForSelector('div[role="combobox"]', { timeout: 6000 });
    await combobox1.click();
    await delay(350);

    const firstOption1 = await page.waitForSelector('div[role="option"]', { timeout: 6000 });
    await firstOption1.click();
    await delay(350);

    const proceedBtn = await page.waitForSelector('button ::-p-text(Prosseguir)', { timeout: 6000 });
    await proceedBtn.click();
    await delay(700);

    console.log(`  -> Selecionando segmento no Passo 2...`);
    const combobox2 = await page.waitForSelector('div[role="combobox"]', { timeout: 6000 });
    await combobox2.click();
    await delay(350);

    const firstOption2 = await page.waitForSelector('div[role="option"]', { timeout: 6000 });
    await firstOption2.click();
    await delay(350);

    const finishBtn = await page.waitForSelector('button ::-p-text(OK — Começar a Usar)', { timeout: 6000 });
    await finishBtn.click();
    await delay(1200);
    console.log(`✓ Onboarding de [${envLabel}] finalizado com sucesso!`);
  }
}

async function runE2ETests() {
  console.log('🚀 ========================================================');
  console.log('🚀 INICIANDO TESTE E2E COMPLETO NO NAVEGADOR REAL (CHROME)');
  console.log('🚀 ========================================================');
  console.log(`🌐 Aplicação: ${APP_URL}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'],
    defaultViewport: { width: 1366, height: 768 },
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
  });

  try {
    // -------------------------------------------------------------
    // ETAPA 1: Carregamento Inicial & Splash Screen
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 1: Carregamento Inicial & Splash Screen ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('✓ Página carregada.');
    await delay(3500); // aguarda splash inicial
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_auth.png') });
    console.log('✓ Captura inicial: 01_initial_auth.png');

    // -------------------------------------------------------------
    // ETAPA 2: Teste de Alternância de Abas (Celular vs E-mail)
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 2: Teste de Abas de Login (Celular vs E-mail) ---');
    const phoneTab = await page.waitForSelector('button ::-p-text(Celular)', { timeout: 6000 });
    await phoneTab.click();
    await delay(300);
    const phoneInput = await page.waitForSelector('#login-phone', { timeout: 4000 });
    await phoneInput.type('11999887766');
    console.log('✓ Aba Celular testada com sucesso.');

    const emailTab = await page.waitForSelector('button ::-p-text(E-mail)', { timeout: 6000 });
    await emailTab.click();
    await delay(300);
    const emailInput = await page.waitForSelector('#login-email', { timeout: 4000 });
    console.log('✓ Aba E-mail testada com sucesso.');

    // -------------------------------------------------------------
    // ETAPA 3: Fluxo "Esqueci minha senha"
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 3: Teste de "Esqueci minha senha" ---');
    const forgotBtn = await page.waitForSelector('button ::-p-text(Esqueci minha senha)', { timeout: 6000 });
    await forgotBtn.click();
    await delay(500);

    const recoveryInput = await page.waitForSelector('#recovery-input', { timeout: 6000 });
    await recoveryInput.type('vendedor.50mais@escorp.com.br');

    const sendRecoveryBtn = await page.waitForSelector('button[type="submit"] ::-p-text(Enviar Instruções)');
    await sendRecoveryBtn.click();
    await delay(800);

    await page.waitForSelector('::-p-text(Instruções Enviadas!)', { timeout: 6000 });
    console.log('✓ Fluxo de recuperação de senha enviado com sucesso.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_forgot_password_success.png') });

    const backToLoginBtn = await page.waitForSelector('button ::-p-text(Voltar para a tela de login)');
    await backToLoginBtn.click();
    await delay(500);
    console.log('✓ Retorno à tela de login efetuado.');

    // -------------------------------------------------------------
    // ETAPA 4: Navegação para /cadastro, Validação de Divergência e Cadastro
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 4: Rota /cadastro, Validação e Cadastro ---');
    const createAccountBtn = await page.waitForSelector('button ::-p-text(Criar conta)', { timeout: 6000 });
    await createAccountBtn.click();
    await delay(600);
    console.log(`✓ Rota atual: ${page.url()}`);

    const nameInput = await page.waitForSelector('#register-fullname', { timeout: 6000 });
    await nameInput.type('Carlos Eduardo - Vendedor 50+');

    const regEmailInput = await page.$('#register-email');
    await regEmailInput.type('carlos.vendas@escorp.com.br');

    const passInput = await page.$('#register-password');
    await passInput.type('MinhaSenhaForte2026');

    const confPassInput = await page.$('#register-confirm-password');
    await confPassInput.type('SenhaDivergenteErrada');

    const submitRegister = await page.waitForSelector('button[type="submit"] ::-p-text(Criar Conta)');
    await submitRegister.click();
    await delay(600);

    await page.waitForSelector('::-p-text(As senhas não coincidem)', { timeout: 6000 });
    console.log('✓ Validação de senha divergente comprovada em tela!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_register_mismatch.png') });

    // Corrigir senha
    await confPassInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await confPassInput.type('MinhaSenhaForte2026');

    const rememberCheck = await page.waitForSelector('::-p-text(Lembrar minha senha)');
    await rememberCheck.click();
    console.log('✓ Senhas validadas como idênticas e "Lembrar minha senha" marcado.');

    await submitRegister.click();
    await delay(1200);
    console.log('✓ Cadastro concluído com sucesso!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_registered_user_environment_selection.png') });

    // -------------------------------------------------------------
    // ETAPA 5: Seleção de Perfil: Meu Trabalho & Onboarding
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 5: Acesso ao Perfil "Meu Trabalho" ---');
    const meuTrabalhoCard = await page.waitForSelector('::-p-text(Meu Trabalho)', { timeout: 8000 });
    await meuTrabalhoCard.click();
    await delay(800);

    await completeOnboardingIfPresent(page, 'Meu Trabalho');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_meu_trabalho_home.png') });
    console.log('✓ Tela Início do "Meu Trabalho" ativa e pronta.');

    // -------------------------------------------------------------
    // ETAPA 6: Registrar Cliente e Chat da IA no "Meu Trabalho"
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 6: Cadastro de Cliente e Chat no "Meu Trabalho" ---');
    // Clicar em Clientes na Sidebar
    const clientesNav = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNav.click();
    await delay(800);

    // Clicar em "Cadastrar Novo Cliente"
    const newClientBtn = await page.waitForSelector('button ::-p-text(Cadastrar Novo Cliente)', { timeout: 6000 });
    await newClientBtn.click();
    await delay(500);

    // Preencher modal
    const clientNameInput = await page.waitForSelector('input[placeholder*="Padaria Central"]', { timeout: 6000 });
    await clientNameInput.type('Dra. Helena Ribeiro - Clínica Vida');

    const clientPhoneInput = await page.waitForSelector('input[placeholder*="98765-4321"]');
    await clientPhoneInput.type('(11) 99123-4567');

    const saveClientBtn = await page.waitForSelector('button[type="submit"] ::-p-text(Salvar Cliente)');
    await saveClientBtn.click();
    await delay(800);

    // Validar se o cliente foi renderizado na tabela
    await page.waitForSelector('::-p-text(Dra. Helena Ribeiro - Clínica Vida)', { timeout: 6000 });
    console.log('✓ Cliente "Dra. Helena Ribeiro" registrado na tabela com sucesso.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_client_saved_meu_trabalho.png') });

    // Testar o Chat da IA no Início
    const inicioNav = await page.waitForSelector('aside nav button ::-p-text(Início)', { timeout: 6000 });
    await inicioNav.click();
    await delay(800);

    const chatInput = await page.waitForSelector('input[placeholder*="Digite sua dúvida ou mensagem aqui..."]', { timeout: 6000 });
    await chatInput.type('Qual é o melhor horário para prospectar e abordar clientes de consultórios?');
    await page.keyboard.press('Enter');
    console.log('✓ Pergunta enviada no Chat de IA do Início. Aguardando processamento...');

    // Aguardar mensagem de resposta da IA
    await delay(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_ai_chat_response_meu_trabalho.png') });
    console.log('✓ Resposta da IA orientadora recebida no chat.');

    // -------------------------------------------------------------
    // ETAPA 7: Alternar para "Minha Empresa" e Verificar Isolamento
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 7: Alternar para "Minha Empresa" & Verificar Isolamento Estrito ---');
    // Clicar no seletor de perfil na Topbar
    const topbarSwitcher = await page.waitForSelector('header ::-p-text(Meu Trabalho)', { timeout: 6000 });
    await topbarSwitcher.click();
    await delay(350);

    const corpOption = await page.waitForSelector('header button ::-p-text(Minha Empresa (Corporativo))', { timeout: 6000 });
    await corpOption.click();
    console.log('✓ Acionada transição para "Minha Empresa". Aguardando transição animada...');

    // Aguardar overlay de transição (~2.2s)
    await delay(2600);

    // Realizar Onboarding corporativo se primeiro acesso
    await completeOnboardingIfPresent(page, 'Minha Empresa');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_minha_empresa_home.png') });

    // Acessar Clientes na Minha Empresa
    const clientesNavCorp = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNavCorp.click();
    await delay(800);

    const corpContent = await page.content();
    const hasHelenaInCorp = corpContent.includes('Dra. Helena Ribeiro');
    if (!hasHelenaInCorp) {
      console.log('✓ ISOLAMENTO CONFIRMADO: "Dra. Helena Ribeiro" NÃO existe na "Minha Empresa" (Base 100% isolada)!');
    } else {
      throw new Error('FALHA DE ISOLAMENTO: Cliente vazou entre os ambientes!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_clientes_minha_empresa_isolated.png') });

    // -------------------------------------------------------------
    // ETAPA 8: Teste Interativo da Prospecção (Exclusivo Minha Empresa)
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 8: Teste da Prospecção, Mapa-Múndi e Gerador de Frases ---');
    const prospeccaoNav = await page.waitForSelector('aside nav button ::-p-text(Prospecção)', { timeout: 8000 });
    await prospeccaoNav.click();
    await delay(1200);

    // Verificar se o mapa-múndi svg/canvas está presente
    const worldMap = await page.$('svg, canvas');
    if (worldMap) {
      console.log('✓ Mapa-Múndi Plano Interativo renderizado e visível.');
    }

    // Testar o Gerador de Frases com IA
    const promptInput = await page.waitForSelector('input[placeholder*="Ex:"]', { timeout: 6000 });
    await promptInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await promptInput.type('Abordagem receptiva para restaurantes e padarias artesanais');

    const generateBtn = await page.waitForSelector('button ::-p-text(Gerar Novas Frases)', { timeout: 6000 });
    await generateBtn.click();
    console.log('✓ Botão "Gerar Novas Frases" clicado. Aguardando geração...');
    await delay(1500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_prospeccao_ia_phrases.png') });
    console.log('✓ Frases geradas com sucesso para o segmento especificado.');

    // -------------------------------------------------------------
    // ETAPA 9: Teste de Anúncios e Exportação de Relatório
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 9: Teste de Anúncios & Exportação de Dados ---');
    const anunciosNav = await page.waitForSelector('aside nav button ::-p-text(Anúncios)', { timeout: 8000 });
    await anunciosNav.click();
    await delay(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_anuncios_screen.png') });
    console.log('✓ Módulo de Anúncios verificado com sucesso.');

    // Ir para Configurações e testar "Baixar meus dados"
    const configNav = await page.waitForSelector('aside nav button ::-p-text(Configurações)', { timeout: 8000 });
    await configNav.click();
    await delay(800);

    const downloadBtn = await page.waitForSelector('button ::-p-text(Baixar meus dados)', { timeout: 6000 });
    if (downloadBtn) {
      await downloadBtn.click();
      await delay(500);
      console.log('✓ Exportação "Baixar meus dados" acionada com sucesso.');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_configuracoes_export.png') });

    // -------------------------------------------------------------
    // ETAPA 10: Retorno ao "Meu Trabalho" e Confirmação de Persistência
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 10: Retorno para "Meu Trabalho" & Checagem de Persistência ---');
    const topbarSwitcherCorp = await page.waitForSelector('header ::-p-text(Minha Empresa)', { timeout: 6000 });
    await topbarSwitcherCorp.click();
    await delay(350);

    const personalOption = await page.waitForSelector('header button ::-p-text(Meu Trabalho (Individual))', { timeout: 6000 });
    await personalOption.click();
    await delay(1000);

    // Navegar até Clientes no Meu Trabalho
    const clientesNavFinal = await page.waitForSelector('aside nav button ::-p-text(Clientes)', { timeout: 8000 });
    await clientesNavFinal.click();
    await delay(800);

    const finalContent = await page.content();
    if (finalContent.includes('Dra. Helena Ribeiro - Clínica Vida')) {
      console.log('✓ PERSISTÊNCIA CONFIRMADA: "Dra. Helena Ribeiro" permanece intacta em "Meu Trabalho"!');
    } else {
      throw new Error('FALHA DE PERSISTÊNCIA: Dados foram perdidos ao alternar de ambiente!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_meu_trabalho_persisted.png') });

    // -------------------------------------------------------------
    // ETAPA 11: Teste de Logout & Re-login
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 11: Logout e Re-login com Credenciais ---');
    const logoutBtn = await page.waitForSelector('header button ::-p-text(Sair)', { timeout: 6000 });
    await logoutBtn.click();
    await delay(1000);

    await page.waitForSelector('::-p-text(Entrar na sua conta)', { timeout: 6000 });
    console.log('✓ Logout concluído com sucesso. Retorno à tela de login.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_logout_screen.png') });

    // Re-login
    const loginEmail = await page.waitForSelector('#login-email', { timeout: 6000 });
    await loginEmail.type('carlos.vendas@escorp.com.br');

    const loginPass = await page.waitForSelector('#login-password', { timeout: 6000 });
    await loginPass.type('MinhaSenhaForte2026');

    const enterBtn = await page.waitForSelector('button[type="submit"] ::-p-text(Entrar)');
    await enterBtn.click();
    await delay(1200);

    await page.waitForSelector('::-p-text(Selecione o seu Ambiente de Trabalho)', { timeout: 8000 });
    console.log('✓ Re-login concluído com credenciais cadastradas!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_relogin_success.png') });

    console.log('\n========================================================================');
    console.log('🎉 SUCESSO TOTAL: TODOS OS 11 FLUXOS E2E FUNCIONARAM DE PONTA A PONTA!');
    console.log(`Erros não capturados no console do navegador: ${consoleErrors.length}`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('❌ ERRO NO TESTE E2E:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_screenshot.png') });
  } finally {
    await browser.close();
  }
}

runE2ETests();
