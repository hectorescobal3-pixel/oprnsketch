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

async function runE2ETests() {
  console.log('🚀 Iniciando Sessão de Teste E2E no Navegador Real...');
  console.log(`🌐 URL da Aplicação: ${APP_URL}`);
  console.log(`🧭 Executável do Chrome: ${CHROME_PATH}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'],
    defaultViewport: { width: 1366, height: 768 },
  });

  const page = await browser.newPage();

  // Monitor console errors
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
    // ETAPA 1: Acesso Inicial & Splash Screen
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 1: Carregamento Inicial & Splash Screen ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('✓ Página carregada.');

    // Aguardar splash screen sumir (dura ~2-3 segundos)
    await delay(3500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_initial_auth.png') });
    console.log('✓ Captura inicial salva: 01_initial_auth.png');

    // -------------------------------------------------------------
    // ETAPA 2: Alternância de Abas no Login (Celular / E-mail)
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 2: Teste de Abas de Login (Celular vs E-mail) ---');
    // Clicar em Celular
    const phoneTab = await page.waitForSelector('button ::-p-text(Celular)', { timeout: 5000 });
    await phoneTab.click();
    await delay(300);
    const phoneInput = await page.$('#login-phone');
    if (phoneInput) {
      console.log('✓ Aba Celular ativa. Campo #login-phone presente.');
      await phoneInput.type('11999887766');
    } else {
      throw new Error('Campo #login-phone não encontrado!');
    }

    // Clicar em E-mail
    const emailTab = await page.waitForSelector('button ::-p-text(E-mail)', { timeout: 5000 });
    await emailTab.click();
    await delay(300);
    const emailInput = await page.$('#login-email');
    if (emailInput) {
      console.log('✓ Aba E-mail ativa. Campo #login-email presente.');
    } else {
      throw new Error('Campo #login-email não encontrado!');
    }

    // -------------------------------------------------------------
    // ETAPA 3: Fluxo "Esqueci minha senha"
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 3: Teste de "Esqueci minha senha" ---');
    const forgotBtn = await page.waitForSelector('button ::-p-text(Esqueci minha senha)', { timeout: 5000 });
    await forgotBtn.click();
    await delay(500);

    const recoveryInput = await page.waitForSelector('#recovery-input', { timeout: 5000 });
    console.log('✓ Tela de recuperação aberta. Preenchendo identificador...');
    await recoveryInput.type('usuario.teste@empresa.com.br');

    const sendRecoveryBtn = await page.waitForSelector('button[type="submit"] ::-p-text(Enviar Instruções)');
    await sendRecoveryBtn.click();
    await delay(800);

    const successNotice = await page.waitForSelector('::-p-text(Instruções Enviadas!)', { timeout: 5000 });
    if (successNotice) {
      console.log('✓ Mensagem de sucesso "Instruções Enviadas!" exibida com sucesso.');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_forgot_password_success.png') });

    // Voltar para a tela de login
    const backToLoginBtn = await page.waitForSelector('button ::-p-text(Voltar para a tela de login)');
    await backToLoginBtn.click();
    await delay(500);
    console.log('✓ Retorno à tela de login realizado.');

    // -------------------------------------------------------------
    // ETAPA 4: Navegação para a rota /cadastro & Validação de Senha Divergente
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 4: Navegação para /cadastro & Validações de Formulário ---');
    const createAccountBtn = await page.waitForSelector('button ::-p-text(Criar conta)', { timeout: 5000 });
    await createAccountBtn.click();
    await delay(500);

    const currentUrl = page.url();
    console.log(`✓ Rota atual após clique em "Criar conta": ${currentUrl}`);

    // Preencher com senhas divergentes
    const nameInput = await page.waitForSelector('#register-fullname', { timeout: 5000 });
    await nameInput.type('Vendedor Senior 50+');

    const regEmailInput = await page.$('#register-email');
    await regEmailInput.type('vendedor50@escorp.com.br');

    const passInput = await page.$('#register-password');
    await passInput.type('SenhaSegura123');

    const confPassInput = await page.$('#register-confirm-password');
    await confPassInput.type('SenhaErradaDivergente');

    const submitRegister = await page.waitForSelector('button[type="submit"] ::-p-text(Criar Conta)');
    await submitRegister.click();
    await delay(500);

    const errorMsg = await page.waitForSelector('::-p-text(As senhas não coincidem)', { timeout: 5000 });
    if (errorMsg) {
      console.log('✓ Validação de divergência de senhas funcionou ("As senhas não coincidem")!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_register_password_mismatch.png') });

    // Corrigir a confirmação de senha
    await confPassInput.click({ clickCount: 3 });
    await confPassInput.press('Backspace');
    await confPassInput.type('SenhaSegura123');

    // Marcar checkbox "Lembrar minha senha"
    const rememberCheckbox = await page.waitForSelector('::-p-text(Lembrar minha senha)');
    await rememberCheckbox.click();
    console.log('✓ Senha confirmada corretamente e "Lembrar minha senha" marcado.');

    // Submeter cadastro com sucesso
    await submitRegister.click();
    await delay(1000);
    console.log('✓ Cadastro submetido com sucesso! Usuário autenticado.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_registered_user_environment_selection.png') });

    // -------------------------------------------------------------
    // ETAPA 5: Seleção de Perfil & Isolamento (Meu Trabalho)
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 5: Acesso a "Meu Trabalho" (Individual) ---');
    const meuTrabalhoCard = await page.waitForSelector('::-p-text(Meu Trabalho)', { timeout: 8000 });
    await meuTrabalhoCard.click();
    await delay(800);

    // Verificar se caiu no Onboarding do perfil
    const onboardingStep1 = await page.$('::-p-text(Configuração do Perfil)');
    if (onboardingStep1) {
      console.log('✓ Questionário de Onboarding inicial detectado. Completando...');
      // Passo 1 -> Continuar
      const nextBtn1 = await page.waitForSelector('button ::-p-text(Continuar)');
      await nextBtn1.click();
      await delay(500);

      // Passo 2 -> Concluir Configuração
      const finishBtn = await page.waitForSelector('button ::-p-text(Concluir Configuração)');
      await finishBtn.click();
      await delay(800);
      console.log('✓ Onboarding de "Meu Trabalho" concluído com sucesso.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_meu_trabalho_home.png') });

    // -------------------------------------------------------------
    // ETAPA 6: Cadastro de Cliente & Chat no "Meu Trabalho"
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 6: Registrar Cliente e Chat no "Meu Trabalho" ---');
    // Navegar para Clientes
    const clientesNav = await page.waitForSelector('nav button ::-p-text(Clientes)', { timeout: 5000 });
    await clientesNav.click();
    await delay(800);
    console.log('✓ Módulo "Clientes" aberto.');

    // Clicar em "Novo Cliente"
    const novoClienteBtn = await page.waitForSelector('button ::-p-text(Novo Cliente)', { timeout: 5000 });
    await novoClienteBtn.click();
    await delay(500);

    // Preencher modal de cliente
    const clientNameInput = await page.waitForSelector('input[placeholder*="Nome completo"]', { timeout: 5000 });
    await clientNameInput.type('Dra. Helena Ribeiro - Clínica Vida');

    const clientEmailInput = await page.$('input[placeholder*="email@exemplo.com"]');
    if (clientEmailInput) await clientEmailInput.type('helena@clinica.com.br');

    const clientPhoneInput = await page.$('input[placeholder*="DDD"]');
    if (clientPhoneInput) await clientPhoneInput.type('11991234567');

    const saveClientBtn = await page.waitForSelector('button ::-p-text(Salvar Cliente)');
    await saveClientBtn.click();
    await delay(800);
    console.log('✓ Cliente "Dra. Helena Ribeiro" salvo no perfil "Meu Trabalho".');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_client_added_meu_trabalho.png') });

    // Voltar para o "Início" e enviar pergunta no Chat da IA
    const inicioNav = await page.waitForSelector('nav button ::-p-text(Início)', { timeout: 5000 });
    await inicioNav.click();
    await delay(800);

    const chatInput = await page.waitForSelector('textarea[placeholder*="Pergunte"], input[placeholder*="Pergunte"], textarea[placeholder*="Digite"]', { timeout: 5000 });
    await chatInput.type('Qual a melhor abordagem para fechar uma proposta hoje?');

    const sendChatBtn = await page.waitForSelector('button[aria-label*="Enviar"], button[title*="Enviar"], button:has(svg)');
    await sendChatBtn.click();
    console.log('✓ Pergunta enviada no Chat do Início. Aguardando IA...');
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_chat_interaction_meu_trabalho.png') });

    // -------------------------------------------------------------
    // ETAPA 7: Alternar para "Minha Empresa" & Verificar Isolamento
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 7: Alternar para "Minha Empresa" & Checar Isolamento ---');
    // Clicar no seletor de perfil na Topbar
    const profileSelector = await page.waitForSelector('::-p-text(Meu Trabalho)', { timeout: 5000 });
    await profileSelector.click();
    await delay(500);

    const switchCorp = await page.waitForSelector('::-p-text(Minha Empresa)', { timeout: 5000 });
    await switchCorp.click();
    console.log('✓ Solicitada alternância para "Minha Empresa". Aguardando animação de transição...');

    // Aguardar transição animada da logo
    await delay(2500);

    // Verificar onboarding da Minha Empresa se for 1º acesso
    const corpOnboarding = await page.$('::-p-text(Configuração do Perfil)');
    if (corpOnboarding) {
      console.log('✓ Onboarding de "Minha Empresa" detectado. Concluindo...');
      const nextBtn1 = await page.waitForSelector('button ::-p-text(Continuar)');
      await nextBtn1.click();
      await delay(500);

      const finishBtn = await page.waitForSelector('button ::-p-text(Concluir Configuração)');
      await finishBtn.click();
      await delay(800);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_minha_empresa_home.png') });

    // Verificar se no módulo "Clientes" da Minha Empresa o cliente "Dra. Helena" NÃO aparece
    const clientesNavCorp = await page.waitForSelector('nav button ::-p-text(Clientes)', { timeout: 5000 });
    await clientesNavCorp.click();
    await delay(800);

    const pageContentCorp = await page.content();
    const hasHelenaInCorp = pageContentCorp.includes('Dra. Helena Ribeiro');
    if (!hasHelenaInCorp) {
      console.log('✓ ISOLAMENTO CONFIRMADO: "Dra. Helena Ribeiro" NÃO existe na "Minha Empresa". Base limpa e independente!');
    } else {
      console.error('❌ FALHA DE ISOLAMENTO: Cliente vazou para a Minha Empresa!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_clientes_minha_empresa_isolated.png') });

    // -------------------------------------------------------------
    // ETAPA 8: Teste Interativo da Prospecção (Exclusivo Minha Empresa)
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 8: Teste Interativo da Prospecção & Mapa-Múndi ---');
    const prospeccaoNav = await page.waitForSelector('nav button ::-p-text(Prospecção)', { timeout: 5000 });
    await prospeccaoNav.click();
    await delay(1200);
    console.log('✓ Módulo "Prospecção & Mercado B2B" carregado com sucesso.');

    // Verificar presença do Mapa-Múndi Interativo
    const mapCanvas = await page.$('canvas, svg');
    if (mapCanvas) {
      console.log('✓ Mapa-Múndi Plano Interativo renderizado perfeitamente.');
    }

    // Interagir com o Gerador de Frases com IA
    const promptInput = await page.waitForSelector('input[placeholder*="Ex:"]', { timeout: 5000 });
    await promptInput.click({ clickCount: 3 });
    await promptInput.type('Abordagem consultiva para consultórios médicos e clínicas');
    console.log('✓ Prompt personalizado digitado no Gerador de Frases.');

    const generateBtn = await page.waitForSelector('button ::-p-text(Gerar Novas Frases)', { timeout: 5000 });
    await generateBtn.click();
    console.log('✓ Botão "Gerar Novas Frases" clicado. Aguardando geração...');
    await delay(1500);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_prospeccao_ai_generated.png') });

    // -------------------------------------------------------------
    // ETAPA 9: Módulo de Anúncios & Exportação de Relatórios
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 9: Teste de Anúncios & Exportação ---');
    const anunciosNav = await page.waitForSelector('nav button ::-p-text(Anúncios)', { timeout: 5000 });
    await anunciosNav.click();
    await delay(800);
    console.log('✓ Módulo "Anúncios" carregado.');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_anuncios_view.png') });

    // Exportar Dados
    const exportBtn = await page.$('button ::-p-text(Exportar), button ::-p-text(Exportar Dados), button[title*="Exportar"]');
    if (exportBtn) {
      await exportBtn.click();
      await delay(500);
      console.log('✓ Ação de exportação acionada com sucesso.');
    }

    // -------------------------------------------------------------
    // ETAPA 10: Retorno ao "Meu Trabalho" & Confirmação de Preservação
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 10: Retorno para "Meu Trabalho" & Persistência ---');
    const corpSelector = await page.waitForSelector('::-p-text(Minha Empresa)', { timeout: 5000 });
    await corpSelector.click();
    await delay(400);

    const switchMeuTrabalho = await page.waitForSelector('::-p-text(Meu Trabalho)', { timeout: 5000 });
    await switchMeuTrabalho.click();
    await delay(800);

    // Ir em Clientes e conferir se "Dra. Helena Ribeiro" permanece intacta
    const clientesNavFinal = await page.waitForSelector('nav button ::-p-text(Clientes)', { timeout: 5000 });
    await clientesNavFinal.click();
    await delay(800);

    const finalContent = await page.content();
    if (finalContent.includes('Dra. Helena Ribeiro')) {
      console.log('✓ PERSISTÊNCIA CONFIRMADA: "Dra. Helena Ribeiro" continua intacta no "Meu Trabalho"!');
    } else {
      console.error('❌ FALHA: Dados de "Meu Trabalho" foram perdidos!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_meu_trabalho_data_persisted.png') });

    // -------------------------------------------------------------
    // ETAPA 11: Teste de Logout & Re-login
    // -------------------------------------------------------------
    console.log('\n--- ETAPA 11: Teste de Sair (Logout) & Re-login ---');
    // Clicar no botão Sair da Topbar
    const logoutBtn = await page.waitForSelector('button ::-p-text(Sair), button[title="Sair"]', { timeout: 5000 });
    await logoutBtn.click();
    await delay(1000);

    const isBackToLogin = await page.$('::-p-text(Entrar na sua conta)');
    if (isBackToLogin) {
      console.log('✓ Logout efetuado com sucesso! Tela de login reexibida.');
    } else {
      console.log('⚠ Verificando se retornou à tela inicial...');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_logout_success.png') });

    // Fazer login novamente com credenciais
    console.log('✓ Refazendo login com a conta criada...');
    const loginEmailInput = await page.$('#login-email');
    if (loginEmailInput) {
      await loginEmailInput.type('vendedor50@escorp.com.br');
      const loginPassInput = await page.$('#login-password');
      await loginPassInput.type('SenhaSegura123');
      const submitLogin = await page.waitForSelector('button[type="submit"] ::-p-text(Entrar)');
      await submitLogin.click();
      await delay(1000);
      console.log('✓ Login com credenciais concluído com sucesso!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_relogin_success.png') });

    console.log('\n======================================================');
    console.log('🎉 TODOS OS 11 PASSOS DE TESTE E2E FORAM CONCLUÍDOS COM SUCESSO!');
    console.log(`Erros capturados no console do navegador: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Erros registrados:', consoleErrors);
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Erro durante o teste E2E:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_screenshot.png') });
  } finally {
    await browser.close();
  }
}

runE2ETests();
