import puppeteer from 'puppeteer-core';

async function run() {
  const sampleTxt = 'Nome: Fernanda Oliveira\nCPF: 444.555.666-77\nTelefone: (11) 98877-6655\nE-mail: fernanda@imoveis.com.br\nObservação: Interessada em apartamento 3 quartos na Zona Sul.';
  const b64 = Buffer.from(sampleTxt, 'utf8').toString('base64');
  const extRes = await fetch('http://localhost:3000/api/clients/extract-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'ficha.txt', mimeType: 'text/plain', base64Data: b64 }),
  });
  const extJson = await extRes.json();
  if (!extRes.ok || extJson.extracted?.nome !== 'Fernanda Oliveira' || extJson.extracted?.cpf !== '444.555.666-77') {
    throw new Error('Falha extração /api/clients/extract-document: ' + JSON.stringify(extJson));
  }
  console.log('✅ [1] POST /api/clients/extract-document OK:', extJson.extracted);

  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  const p = await b.newPage();
  await p.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('opensketch_current_user', JSON.stringify({ email: 'qa@escorp.systems', name: 'QA' }));
    localStorage.setItem('opensketch_environment_selected', 'true');
    localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'PERSONAL' }));
    localStorage.setItem(
      'opensketch_individual_perfil',
      JSON.stringify({
        fullName: 'QA',
        username: '@qa',
        profession: 'Corretor de Imóveis',
        segment: 'Corretor de Imóveis',
        email: 'qa@escorp.systems',
        onboardingCompleted: true,
      })
    );
  });
  await p.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  const inp = await p.waitForSelector('input[placeholder*="Digite"]');
  await inp.type('Teste chat efemero');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.body.textContent?.includes('Teste chat efemero'), { timeout: 4000 });
  const hasSavedChat = await p.evaluate(() => Boolean(localStorage.getItem('opensketch_individual_chat_inicio')));
  if (hasSavedChat) throw new Error('Chat persistiu no localStorage!');
  console.log('✅ [2] Zero persistência de chat no localStorage OK');

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('aside nav button')).find((x) => x.textContent?.includes('Início'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const resetAfterInicioClick = await p.evaluate(() => !document.body.textContent?.includes('Teste chat efemero'));
  if (!resetAfterInicioClick) throw new Error('Chat não resetou ao clicar em Início na sidebar!');
  console.log('✅ [3] Reset imediato do chat ao clicar em Início OK');

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('aside nav button')).find((x) => x.textContent?.includes('Clientes'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.includes('Cadastrar Novo Cliente'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  const hasImportBtn = await p.evaluate(() =>
    Boolean(Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.includes('Importar de foto ou arquivo (IA)')))
  );
  if (!hasImportBtn) throw new Error('Botão Importar de foto ou arquivo (IA) ausente em ClientesView!');
  console.log('✅ [4] Botão compacto Importar de foto ou arquivo (IA) validado em ClientesView');

  await b.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
