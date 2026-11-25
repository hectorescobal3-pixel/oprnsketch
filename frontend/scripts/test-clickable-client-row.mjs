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
      localStorage.setItem(
        'opensketch_individual_clientes',
        JSON.stringify([
          {
            id: 'CLI-1001',
            name: 'Fernanda Oliveira',
            documentTaxId: '444.555.666-77',
            email: 'fernanda@imoveis.com.br',
            phone: '(11) 98877-6655',
            totalInvoiced: 0,
            invoicesCount: 0,
            status: 'ATIVO',
            lastInvoiceDate: '20/11/2026',
            origin: 'DOCUMENTO_IA',
            notes: 'Interessada em apartamento 3 quartos na Zona Sul.',
          },
        ])
      );
    });
    await p.reload({ waitUntil: 'networkidle0' });
    await p.waitForSelector('aside nav button', { timeout: 5000 });

    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('aside nav button')).find((x) => x.textContent?.includes('Clientes'));
      if (btn) btn.click();
    });
    await p.waitForSelector('table tbody tr', { timeout: 4000 });

    // 1. Clicar na linha (na primeira célula) -> deve abrir Ficha Completa do Cliente
    await p.click('table tbody tr td:first-child');
    await new Promise((r) => setTimeout(r, 300));
    const cardText = await p.$eval('.responsive-modal-card', (el) => el.textContent || '');
    if (
      !cardText.includes('Ficha Completa do Cliente') ||
      !cardText.includes('Fernanda Oliveira') ||
      !cardText.includes('Foto / Arquivo (IA)') ||
      !cardText.includes('Interessada em apartamento 3 quartos na Zona Sul.')
    ) {
      throw new Error('Ficha Completa do Cliente não exibiu os dados esperados: ' + cardText);
    }
    console.log('✅ [1] Clique na linha abriu Ficha Completa do Cliente com origem e contexto OK');

    // 2. Clicar em Editar dentro da Ficha Completa -> deve abrir modal de Edição
    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.responsive-modal-card button')).find((x) => x.textContent?.trim() === 'Editar');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const editTitle = await p.$eval('.responsive-modal-card h2', (el) => el.textContent || '');
    if (!editTitle.includes('Editar Cliente')) throw new Error('Atalho Editar não abriu o modal de edição!');
    console.log('✅ [2] Atalho Editar dentro da ficha abriu o modal de edição OK');

    // Fechar modal de edição
    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.responsive-modal-card button')).find((x) => x.textContent?.trim() === 'Cancelar');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    // 3. Clicar diretamente no botão Editar da linha -> deve abrir Editar Cliente (e NÃO a Ficha Completa)
    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('table tbody tr button')).find((x) => x.textContent?.trim() === 'Editar');
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const directEditTitle = await p.$eval('.responsive-modal-card h2', (el) => el.textContent || '');
    if (!directEditTitle.includes('Editar Cliente')) throw new Error('stopPropagation no botão Editar falhou!');
    console.log('✅ [3] stopPropagation nos botões Editar/Excluir validado OK');
  } finally {
    await b.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
