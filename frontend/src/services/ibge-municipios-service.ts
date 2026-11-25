// ==============================================================================
// OPENsketch — Serviço de Municípios Oficiais do Brasil (IBGE + Cache + Fallback)
// Suporta todas as capitais e municípios do interior dos 26 estados + DF
// ==============================================================================

const municipiosCache = new Map<string, string[]>();

const OFFLINE_FALLBACK_MUNICIPIOS: Record<string, string[]> = {
  AC: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó'],
  AL: ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'Penedo'],
  AM: [
    'Manaus',
    'Manacapuru',
    'Manicoré',
    'Maués',
    'Manaquiri',
    'Parintins',
    'Itacoatiara',
    'Coari',
    'Tefé',
    'Tabatinga',
    'Humaitá',
    'Iranduba',
    'Presidente Figueiredo',
    'Rio Preto da Eva',
  ],
  AP: ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro', 'Ilhéus', 'Lauro de Freitas'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca'],
  DF: ['Brasília', 'Taguatinga', 'Ceilândia', 'Águas Claras', 'Gama'],
  ES: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'Colatina'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás'],
  MA: ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Balsas'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Uberaba', 'Poços de Caldas'],
  MS: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã'],
  MT: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Sorriso'],
  PA: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal', 'Altamira'],
  PB: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa'],
  PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Garanhuns'],
  PI: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu'],
  RJ: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Campos dos Goytacazes', 'Petrópolis'],
  RN: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba'],
  RO: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal'],
  RR: ['Boa Vista', 'Rorainópolis', 'Caracaraí'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Gravataí', 'Novo Hamburgo', 'Passo Fundo'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó', 'Itajaí', 'Criciúma', 'Balneário Camboriú'],
  SE: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana'],
  SP: ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Sorocaba', 'Ribeirão Preto', 'Santos', 'São José dos Campos'],
  TO: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional'],
};

export async function getMunicipalitiesByState(uf: string): Promise<string[]> {
  const cleanUf = (uf || '').trim().toUpperCase();
  if (!cleanUf || cleanUf === 'TODOS') return [];

  if (municipiosCache.has(cleanUf)) {
    return municipiosCache.get(cleanUf)!;
  }

  const fallbackList = OFFLINE_FALLBACK_MUNICIPIOS[cleanUf] || [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(cleanUf)}/municipios?orderBy=nome`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      municipiosCache.set(cleanUf, fallbackList);
      return fallbackList;
    }

    const data = (await res.json()) as Array<{ nome?: string }>;
    if (Array.isArray(data) && data.length > 0) {
      const names = data.map((m) => String(m.nome || '').trim()).filter(Boolean);
      municipiosCache.set(cleanUf, names);
      return names;
    }
  } catch {
    clearTimeout(timeout);
  }

  municipiosCache.set(cleanUf, fallbackList);
  return fallbackList;
}

export function filterMunicipalities(list: string[], query: string, maxResults = 8): string[] {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const q = norm(query);
  if (!q) return list.slice(0, maxResults);

  const startsWith: string[] = [];
  const includes: string[] = [];

  for (const name of list) {
    const n = norm(name);
    if (n.startsWith(q)) startsWith.push(name);
    else if (n.includes(q)) includes.push(name);
  }

  return [...startsWith, ...includes].slice(0, maxResults);
}
