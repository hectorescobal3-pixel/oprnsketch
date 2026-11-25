import puppeteer from 'puppeteer-core';

async function run() {
  // 1. Testar endpoint /api/ai/prospection para Manicoré - AM
  const apiRes = await fetch('http://localhost:3000/api/ai/prospection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profession: 'Clínica Odontológica', state: 'AM', city: 'Manicoré' }),
  });
  const apiJson = await apiRes.json();
  if (!apiRes.ok || !Array.isArray(apiJson.opportunities) || apiJson.opportunities.length === 0) {
    throw new Error('Falha /api/ai/prospection: ' + JSON.stringify(apiJson));
  }
  const firstOpp = apiJson.opportunities[0];
  if (firstOpp.city !== 'Manicoré' || firstOpp.state !== 'AM' || !firstOpp.phoneNumber.includes('(97)')) {
    throw new Error('Dados regionais incorretos para Manicoré - AM: ' + JSON.stringify(firstOpp));
  }
  console.log('✅ [1] POST /api/ai/prospection (Manicoré - AM, DDD 97) OK:', firstOpp.name, firstOpp.phoneNumber);

  // 2. Testar no Chrome UI (AM -> Manicoré -> Botão Buscar Oportunidades)
  const b = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const p = await b.newPage();
    p.on('pageerror', (err) => console.error('PAGEERROR:', err.message));
    await p.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('opensketch_current_user', JSON.stringify({ email: 'qa@escorp.systems', name: 'QA' }));
      localStorage.setItem('opensketch_environment_selected', 'true');
      localStorage.setItem('opensketch_active_context', JSON.stringify({ type: 'CORPORATE' }));
      localStorage.setItem(
        'opensketch_empresa_perfil',
        JSON.stringify({
          fullName: 'Odonto Corp',
          username: '@odonto',
          profession: 'Clínica Odontológica',
          segment: 'Clínica Odontológica',
          email: 'qa@escorp.systems',
          onboardingCompleted: true,
        })
      );
    });
    await p.reload({ waitUntil: 'networkidle0' });
    await p.waitForSelector('aside nav button', { timeout: 5000 });

    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((x) => x.textContent?.includes('Prospecção'));
      if (btn) btn.click();
    });
    await p.waitForSelector('input[placeholder*="Manicoré"]', { timeout: 5000 });

    // Selecionar estado AM no mapa
    await p.evaluate(() => {
      const am = Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'AM');
      if (am) am.click();
    });
    await p.waitForSelector('input[placeholder*="município em AM"]', { timeout: 5000 });
    await p.type('input[placeholder*="município em AM"]', 'Manicoré');

    // Verificar autocomplete IBGE exibindo Manicoré — AM
    await p.waitForFunction(() => document.body.textContent?.includes('Manicoré — AM'), { timeout: 6000 });
    console.log('✅ [2] Autocomplete de municípios do AM (Manicoré — AM) validado OK');

    // Clicar no botão Buscar Oportunidades
    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.includes('Buscar Oportunidades'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 900));

    const tableText = await p.$eval('table tbody', (el) => el.textContent || '');
    if (!tableText.includes('Manicoré - AM') || !tableText.includes('(97)')) {
      throw new Error('Tabela não atualizou com oportunidades de Manicoré - AM: ' + tableText);
    }
    console.log('✅ [3] Tabela Base de Oportunidades populada com leads de Manicoré - AM (DDD 97) OK');
  } finally {
    await b.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
