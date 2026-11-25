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

// Polyfill in-memory localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const memStore = new Map();
  globalThis.localStorage = {
    getItem: (key) => (memStore.has(key) ? memStore.get(key) : null),
    setItem: (key, val) => memStore.set(key, String(val)),
    removeItem: (key) => memStore.delete(key),
    clear: () => memStore.clear(),
  };
}

async function runProfessionLockAudit() {
  console.log('🏛️ =========================================================================================');
  console.log('🏛️ AUDITORIA & TRAVA ESTRITA DE CONTEXTO POR PROFISSÃO NO OPENSKETCH');
  console.log('🏛️ Validação Cruzada: Corretor de Imóveis vs. Clínica Odontológica (Zero Contaminação)');
  console.log('🏛️ =========================================================================================\n');

  const report = {
    imobiliarioDomainLock: {},
    odontoDomainLock: {},
    prospectingFitScoreLock: {},
    adsTemplatesLock: {},
    browserValidation: {},
    allPassed: true,
  };

  const { AiConversationalService } = await import('./src/services/ai-conversational-service.ts');
  const { PlacesProspectingService } = await import('./src/services/places-prospecting-service.ts');
  const { AppStorage } = await import('./src/services/app-storage.ts');

  // =========================================================================================
  // CENÁRIO 1: PERFIL CORRETOR DE IMÓVEIS (MERCADO IMOBILIÁRIO)
  // =========================================================================================
  console.log('🔹 [CENÁRIO 1] Testando Domínio: CORRETOR DE IMÓVEIS (Mercado Imobiliário)');

  const imobiliarioSnapshot = {
    scope: 'PERSONAL',
    environmentName: 'Meu Trabalho',
    isCorporate: false,
    profile: {
      fullName: 'Carlos Eduardo Mendes',
      profession: 'Corretor de Imóveis',
      areaAtuacao: 'Imóveis Residenciais e Comerciais',
      email: 'carlos.mendes@imoveis.com.br',
    },
    clients: [
      {
        id: 'cli-imo-1',
        name: 'Roberto Viana',
        documentTaxId: '12345678900',
        email: 'roberto@email.com',
        phone: '(11) 99887-1122',
        status: 'ATIVO',
        totalInvoiced: 45000,
        invoicesCount: 2,
        lastInvoiceDate: '10/11/2026',
        segment: 'Comprador Residencial',
      },
    ],
    ads: [],
    metas: {
      goalTitle: 'Comissões de VGV 4º Trimestre',
      metaTotal: 100000,
      realizadoTotal: 45000,
      percentage: 45,
      deadline: '31/12/2026',
      cycleName: 'Ciclo Q4',
      distribution: [{ label: 'Vendas de Apartamentos', percentage: 70, description: 'Plantões e visitas' }],
    },
    documents: [],
    leads: [],
  };

  // 1. Resposta de Metas do Copiloto IA para Corretor
  // @ts-ignore
  const aiImobiliarioRes = AiConversationalService['generateDynamicContextualResponse'](
    'Como posso melhorar minhas metas comerciais este mês?',
    imobiliarioSnapshot,
    []
  );

  const imoText = aiImobiliarioRes.text.toLowerCase();
  const imoHasRealEstateTerms =
    imoText.includes('imobiliário') ||
    imoText.includes('imóveis') ||
    imoText.includes('visitas') ||
    imoText.includes('compradores') ||
    imoText.includes('captação');

  const imoHasZeroOdontoLeaks =
    !imoText.includes('dentes') &&
    !imoText.includes('odontológica') &&
    !imoText.includes('pacientes') &&
    !imoText.includes('profilaxia') &&
    !imoText.includes('saúde bucal');

  console.log(`  • Vocabulário Imobiliário Injetado com Rigor: ${imoHasRealEstateTerms ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  • Zero Contaminação com Termos Odontológicos/Saúde: ${imoHasZeroOdontoLeaks ? '✅ PASS' : '❌ FAIL'}`);

  report.imobiliarioDomainLock['VocabularyValid'] = imoHasRealEstateTerms;
  report.imobiliarioDomainLock['ZeroContamination'] = imoHasZeroOdontoLeaks;
  if (!imoHasRealEstateTerms || !imoHasZeroOdontoLeaks) report.allPassed = false;

  // =========================================================================================
  // CENÁRIO 2: PERFIL CLÍNICA ODONTOLÓGICA (SAÚDE E BEM-ESTAR)
  // =========================================================================================
  console.log('\n🔹 [CENÁRIO 2] Testando Domínio: CLÍNICA ODONTOLÓGICA (Saúde e Bem-estar)');

  const odontoSnapshot = {
    scope: 'PERSONAL',
    environmentName: 'Meu Trabalho',
    isCorporate: false,
    profile: {
      fullName: 'Dra. Ana Paula Silveira',
      profession: 'Clínica Odontológica',
      areaAtuacao: 'Odontologia Preventiva e Estética',
      email: 'dra.anapaula@odontocare.com.br',
    },
    clients: [
      {
        id: 'cli-odo-1',
        name: 'Juliana Costa',
        documentTaxId: '98765432100',
        email: 'juliana@email.com',
        phone: '(11) 98765-4321',
        status: 'ATIVO',
        totalInvoiced: 6200,
        invoicesCount: 4,
        lastInvoiceDate: '12/11/2026',
        segment: 'Paciente Estética',
      },
    ],
    ads: [],
    metas: {
      goalTitle: 'Atendimentos Clínicos e Alinhadores',
      metaTotal: 30000,
      realizadoTotal: 18000,
      percentage: 60,
      deadline: '31/12/2026',
      cycleName: 'Ciclo Q4',
      distribution: [{ label: 'Tratamentos Preventivos', percentage: 60, description: 'Check-ups' }],
    },
    documents: [],
    leads: [],
  };

  // 1. Resposta de Metas do Copiloto IA para Odonto
  // @ts-ignore
  const aiOdontoRes = AiConversationalService['generateDynamicContextualResponse'](
    'Como posso melhorar minhas metas comerciais este mês?',
    odontoSnapshot,
    []
  );

  const odoText = aiOdontoRes.text.toLowerCase();
  const odoHasDentalTerms =
    odoText.includes('odontológica') ||
    odoText.includes('saúde') ||
    odoText.includes('pacientes') ||
    odoText.includes('preventivas') ||
    odoText.includes('consultas') ||
    odoText.includes('alinhadores');

  const odoHasZeroRealEstateLeaks =
    !odoText.includes('vgv') &&
    !odoText.includes('imobiliário') &&
    !odoText.includes('apartamentos') &&
    !odoText.includes('captação de novos imóveis') &&
    !odoText.includes('plantão de vendas');

  console.log(`  • Vocabulário Odontológico Injetado com Rigor: ${odoHasDentalTerms ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  • Zero Contaminação com Termos Imobiliários: ${odoHasZeroRealEstateLeaks ? '✅ PASS' : '❌ FAIL'}`);

  report.odontoDomainLock['VocabularyValid'] = odoHasDentalTerms;
  report.odontoDomainLock['ZeroContamination'] = odoHasZeroRealEstateLeaks;
  if (!odoHasDentalTerms || !odoHasZeroRealEstateLeaks) report.allPassed = false;

  // =========================================================================================
  // CENÁRIO 3: FIT SCORE EM PROSPECÇÃO POR PROFISSÃO
  // =========================================================================================
  console.log('\n🔹 [CENÁRIO 3] Sincronização e Fit Score Dinâmico em Prospecção B2B');

  const imoFitLeadImo = PlacesProspectingService.calculateDynamicFitScore('Corretor de Imóveis', 'Imóveis Residenciais', 'Corretor de Imóveis');
  const imoFitLeadOdo = PlacesProspectingService.calculateDynamicFitScore('Clínica Odontológica', 'Odontologia Preventiva', 'Corretor de Imóveis');

  const imoFitHigh = imoFitLeadImo >= 90;
  const odoFitLowUnderImo = imoFitLeadOdo <= 70;

  console.log(`  • Fit Score para Corretor de Imóveis:`);
  console.log(`    - Lead Imobiliário (Esperado >= 90%): ${imoFitLeadImo}% -> ${imoFitHigh ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    - Lead Odontológico (Esperado <= 70%): ${imoFitLeadOdo}% -> ${odoFitLowUnderImo ? '✅ PASS' : '❌ FAIL'}`);

  const odoFitLeadOdo = PlacesProspectingService.calculateDynamicFitScore('Clínica Odontológica', 'Odontologia Preventiva', 'Clínica Odontológica');
  const odoFitLeadImo = PlacesProspectingService.calculateDynamicFitScore('Corretor de Imóveis', 'Imóveis Residenciais', 'Clínica Odontológica');

  const odoFitHigh = odoFitLeadOdo >= 90;
  const imoFitLowUnderOdo = odoFitLeadImo <= 70;

  console.log(`  • Fit Score para Clínica Odontológica:`);
  console.log(`    - Lead Odontológico (Esperado >= 90%): ${odoFitLeadOdo}% -> ${odoFitHigh ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    - Lead Imobiliário (Esperado <= 70%): ${odoFitLeadImo}% -> ${imoFitLowUnderOdo ? '✅ PASS' : '❌ FAIL'}`);

  const fitLockPass = imoFitHigh && odoFitLowUnderImo && odoFitHigh && imoFitLowUnderOdo;
  report.prospectingFitScoreLock['FitScoreSeparation'] = Boolean(fitLockPass);
  if (!fitLockPass) report.allPassed = false;

  // =========================================================================================
  // CENÁRIO 4: VALIDAÇÃO VISUAL E DE NAVEGADOR NO GOOGLE CHROME
  // =========================================================================================
  console.log('\n🔹 [CENÁRIO 4] Validação E2E no Google Chrome com Troca Ativa de Perfil');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await delay(1000);

    // 1. Configura perfil no navegador como Corretor de Imóveis
    console.log('  -> 1. Injetando perfil de Corretor de Imóveis no ambiente...');
    await page.evaluate(() => {
      const p = {
        fullName: 'Carlos Mendes Corretor',
        username: '@carloscorretor',
        profession: 'Corretor de Imóveis',
        segment: 'Imóveis Residenciais e Comerciais',
        email: 'carlos@imobiliaria.com.br',
        onboardingCompleted: true,
      };
      localStorage.setItem('opensketch_individual_perfil', JSON.stringify(p));
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: p.email, name: p.fullName }));
      localStorage.setItem('opensketch_environment_selected', 'true');
      localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'PERSONAL' }));
      localStorage.removeItem('opensketch_individual_chat_history');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1500);

    // Envia pergunta no chat IA
    const chatInput = await page.waitForSelector('input[placeholder*="Digite sua dúvida"]', { timeout: 6000 });
    await chatInput.type('Como posso melhorar minhas metas comerciais?');
    const sendBtn = await page.waitForSelector('button ::-p-text(➔)', { timeout: 6000 });
    await sendBtn.click();
    await delay(2500);

    const imovelResponseFound = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('div')).map((e) => e.textContent || '');
      return texts.some((t) => t.includes('Imobiliários') || t.includes('imóveis') || t.includes('visitas'));
    });
    console.log(`     • Resposta do Copiloto reflete contexto Imobiliário: ${imovelResponseFound ? '✅ PASS' : '❌ FAIL'}`);
    report.browserValidation['ImobiliarioChatContext'] = imovelResponseFound;

    // 2. Alterna para perfil Odontológico
    console.log('  -> 2. Alternando perfil para Clínica Odontológica no ambiente...');
    await page.evaluate(() => {
      const p = {
        fullName: 'Dra. Ana Odontologia',
        username: '@draana',
        profession: 'Clínica Odontológica',
        segment: 'Odontologia Preventiva e Estética',
        email: 'dra.ana@odonto.com.br',
        onboardingCompleted: true,
      };
      localStorage.setItem('opensketch_individual_perfil', JSON.stringify(p));
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: p.email, name: p.fullName }));
      localStorage.setItem('opensketch_environment_selected', 'true');
      localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'PERSONAL' }));
      localStorage.removeItem('opensketch_individual_chat_history');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1500);

    const chatInput2 = await page.waitForSelector('input[placeholder*="Digite sua dúvida"]', { timeout: 6000 });
    await chatInput2.type('Como posso melhorar minhas metas comerciais?');
    const sendBtn2 = await page.waitForSelector('button ::-p-text(➔)', { timeout: 6000 });
    await sendBtn2.click();
    await delay(2500);

    const odontoResponseFound = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('div')).map((e) => e.textContent || '');
      return texts.some((t) => t.includes('Odontológica') || t.includes('pacientes') || t.includes('saúde'));
    });
    console.log(`     • Resposta do Copiloto reflete contexto Odontológico: ${odontoResponseFound ? '✅ PASS' : '❌ FAIL'}`);
    report.browserValidation['OdontoChatContext'] = odontoResponseFound;

    // Salva evidência visual
    const scPath = path.join(SCREENSHOT_DIR, 'profession_lock_validation.png');
    await page.screenshot({ path: scPath });
    console.log(`  📸 Evidência visual salva: profession_lock_validation.png`);

    report.browserValidation['ZeroConsoleErrors'] = consoleErrors.length === 0;

  } catch (err) {
    console.error('❌ ERRO NA ETAPA DO NAVEGADOR:', err);
    report.allPassed = false;
  } finally {
    await browser.close();
  }

  console.log('\n🎉 =========================================================================================');
  console.log('🎉 AUDITORIA DE TRAVA DE CONTEXTO POR PROFISSÃO FINALIZADA:');
  console.log(`🎉 Status Geral: ${report.allPassed ? '✅ 100% APROVADO' : '❌ FALHAS DETECTADAS'}`);
  console.log('🎉 =========================================================================================');
  console.log(JSON.stringify(report, null, 2));
}

runProfessionLockAudit();
