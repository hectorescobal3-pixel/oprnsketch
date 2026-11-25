import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_TXT = path.join(__dirname, 'temp-doc-anexo.txt');
fs.writeFileSync(TEMP_TXT, 'Proposta Comercial: Apartamento 3 dormitórios no Jardins, valor R$ 1.250.000.');

async function run() {
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const p = await b.newPage();
    await p.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: '11999887766@celular.opensketch.app', name: 'João da Silva' }));
      localStorage.setItem('opensketch_environment_selected', 'true');
      localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'PERSONAL' }));
      localStorage.setItem(
        'opensketch_individual_perfil',
        JSON.stringify({
          fullName: 'João da Silva',
          username: '@joaosilva',
          profession: 'Corretor de Imóveis',
          segment: 'Corretor de Imóveis',
          email: '11999887766@celular.opensketch.app',
          onboardingCompleted: true,
        })
      );
    });
    await p.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 900));

    // 1. Verificar nome no Header, Sidebar e Saudação + Profissão no subtítulo
    const uiCheck = await p.evaluate(() => {
      const headerText = document.querySelector('header')?.textContent || '';
      const sidebarText = document.querySelector('aside')?.textContent || '';
      const h1Text = document.querySelector('h1')?.textContent || '';
      const bodyText = document.body.textContent || '';
      return {
        headerHasName: headerText.includes('João da Silva') && !headerText.includes('@celular.opensketch.app'),
        sidebarHasName: sidebarText.includes('João da Silva') && sidebarText.includes('6 Módulos Ativos'),
        h1Greeting: h1Text,
        hasProfessionSubtitle: bodyText.includes('Sou seu copiloto especialista em Corretor de Imóveis'),
      };
    });

    if (!uiCheck.headerHasName || !uiCheck.sidebarHasName || !uiCheck.h1Greeting.includes('Olá, João da Silva!') || !uiCheck.hasProfessionSubtitle) {
      throw new Error('Falha na personalização da interface: ' + JSON.stringify(uiCheck));
    }
    console.log('✅ [1] Header, Sidebar e Saudação Dinâmica ("Olá, João da Silva!" + Profissão) OK');

    // 2. Testar botão + de anexo -> Popover -> Anexar documento TXT -> Chip -> Enviar
    await p.click('button[aria-label="Anexar foto ou documento"]');
    await new Promise((r) => setTimeout(r, 300));
    const hasPopover = await p.evaluate(() => document.body.textContent?.includes('Foto (JPG, PNG, WebP)') && document.body.textContent?.includes('Documento (PDF, TXT)'));
    if (!hasPopover) throw new Error('Popover de anexo (+ Foto / Documento) não abriu!');
    console.log('✅ [2] Popover de Anexo (+ Foto / Documento) aberto com sucesso');

    const docInput = await p.$('input[accept="application/pdf,text/plain"]');
    await docInput.uploadFile(TEMP_TXT);
    await new Promise((r) => setTimeout(r, 400));

    const hasChip = await p.evaluate(() => document.body.textContent?.includes('temp-doc-anexo.txt'));
    if (!hasChip) throw new Error('Chip de pré-visualização do anexo não apareceu!');
    console.log('✅ [3] Chip de pré-visualização do anexo exibido acima do campo de texto');

    // Enviar mensagem com o anexo
    const chatInput = await p.waitForSelector('input[placeholder*="Digite"]');
    await chatInput.type('Resuma esta proposta para mim');
    await p.keyboard.press('Enter');
    await p.waitForFunction(
      () => document.body.textContent?.includes('temp-doc-anexo.txt') &&
            !document.body.textContent?.includes('Consultando ferramentas e formulando resposta...'),
      { timeout: 6000 }
    );
    console.log('✅ [4] Mensagem com anexo enviada e processada pela IA com sucesso');
  } finally {
    await b.close();
    if (fs.existsSync(TEMP_TXT)) fs.unlinkSync(TEMP_TXT);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
