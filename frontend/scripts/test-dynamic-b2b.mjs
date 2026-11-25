import puppeteer from 'puppeteer-core';

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
    await new Promise((r) => setTimeout(r, 800));

    const initState = await p.evaluate(() => {
      const txt = document.body.textContent || '';
      return {
        hasZeroCount: txt.includes('0 oportunidade(s)'),
        hasOldMock:
          txt.includes('Tecnologia Avançada') ||
          txt.includes('Distribuidora Central') ||
          txt.includes('Metalmecânica Inovadora') ||
          txt.includes('Rede Farma Express'),
      };
    });
    if (!initState.hasZeroCount || initState.hasOldMock) {
      throw new Error('Estado inicial inválido: ' + JSON.stringify(initState));
    }
    console.log('✅ [1] Estado inicial zerado (0 oportunidade(s)) e zero dados fictícios OK');

    await p.evaluate(() => {
      const sp = Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'SP');
      if (sp) sp.click();
    });
    await new Promise((r) => setTimeout(r, 700));
    const afterSearch = await p.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr').length;
      const hasConvert = (document.body.textContent || '').includes('Converter em Cliente');
      return { rows, hasConvert };
    });
    if (afterSearch.rows === 0 || !afterSearch.hasConvert) {
      throw new Error('Tabela não populou dinamicamente após busca: ' + JSON.stringify(afterSearch));
    }
    console.log('✅ [2] Tabela populada dinamicamente após busca SP:', afterSearch.rows, 'oportunidades');

    await p.evaluate(() => {
      const clr = Array.from(document.querySelectorAll('button')).find((x) => x.textContent?.trim() === 'Limpar busca');
      if (clr) clr.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const afterClear = await p.evaluate(() => (document.body.textContent || '').includes('0 oportunidade(s)'));
    if (!afterClear) throw new Error('Tabela não voltou a 0 oportunidade(s) ao limpar busca!');
    console.log('✅ [3] Limpar busca restaurou 0 oportunidade(s) OK');
  } finally {
    await b.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
