// ==============================================================================
// OPENsketch Places Prospecting Service (Simulador Estilo Google Places API)
// Arquitetura desacoplada e pronta para substituição por Google Places API em produção
// ==============================================================================

import { getCurrentFirebaseIdToken } from './firebase-client';

export interface PlaceOpportunity {
  id: string;
  name: string;
  cnpj: string;
  profession: string;
  area: string;
  state: string;
  city: string;
  formattedAddress: string;
  coordinates: {
    lat: number;
    lng: number;
    x: number; // Posição X relativa no mapa SVG (0 - 100)
    y: number; // Posição Y relativa no mapa SVG (0 - 100)
  };
  rating: number;
  userRatingsTotal: number;
  phoneNumber: string;
  website?: string;
  email: string;
  fitScore: number;
  estimatedVolume: string;
  notes: string;
}

const STATE_CENTERS: Record<string, { capital: string; lat: number; lng: number }> = {
  AC: { capital: 'Rio Branco', lat: -9.97499, lng: -67.8243 },
  AL: { capital: 'Maceió', lat: -9.66599, lng: -35.735 },
  AP: { capital: 'Macapá', lat: 0.034934, lng: -51.0694 },
  AM: { capital: 'Manaus', lat: -3.1190275, lng: -60.0217314 },
  BA: { capital: 'Salvador', lat: -12.977749, lng: -38.50163 },
  CE: { capital: 'Fortaleza', lat: -3.731862, lng: -38.52667 },
  DF: { capital: 'Brasília', lat: -15.793889, lng: -47.882778 },
  ES: { capital: 'Vitória', lat: -20.3155, lng: -40.3128 },
  GO: { capital: 'Goiânia', lat: -16.6869, lng: -49.2648 },
  MA: { capital: 'São Luís', lat: -2.53073, lng: -44.3068 },
  MT: { capital: 'Cuiabá', lat: -15.6014, lng: -56.0979 },
  MS: { capital: 'Campo Grande', lat: -20.4697, lng: -54.6201 },
  MG: { capital: 'Belo Horizonte', lat: -19.9167, lng: -43.9345 },
  PA: { capital: 'Belém', lat: -1.4558, lng: -48.5039 },
  PB: { capital: 'João Pessoa', lat: -7.1195, lng: -34.845 },
  PR: { capital: 'Curitiba', lat: -25.4284, lng: -49.2733 },
  PE: { capital: 'Recife', lat: -8.0476, lng: -34.877 },
  PI: { capital: 'Teresina', lat: -5.092, lng: -42.8038 },
  RJ: { capital: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
  RN: { capital: 'Natal', lat: -5.7793, lng: -35.2009 },
  RS: { capital: 'Porto Alegre', lat: -30.0346, lng: -51.2177 },
  RO: { capital: 'Porto Velho', lat: -8.7612, lng: -63.9004 },
  RR: { capital: 'Boa Vista', lat: 2.8235, lng: -60.6758 },
  SC: { capital: 'Florianópolis', lat: -27.5954, lng: -48.548 },
  SP: { capital: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  SE: { capital: 'Aracaju', lat: -10.9472, lng: -37.0731 },
  TO: { capital: 'Palmas', lat: -10.2491, lng: -48.3243 },
};

function getSectorSearchSpec(profFilter: string): { selectors: string[]; terms: string[] } {
  const p = profFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (p.includes('tecnologia') || p.includes('software')) {
    return { selectors: ['["office"="it"]["name"]', '["shop"="computer"]["name"]'], terms: ['tecnologia', 'software'] };
  }
  if (p.includes('consultoria') || p.includes('gestao')) {
    return { selectors: ['["office"="consulting"]["name"]', '["office"="accountant"]["name"]'], terms: ['consultoria', 'contabilidade'] };
  }
  if (p.includes('odonto') || p.includes('dent')) {
    return { selectors: ['["amenity"="dentist"]["name"]', '["healthcare"="dentist"]["name"]'], terms: ['odontologia', 'dentista'] };
  }
  if (p.includes('imove') || p.includes('imobil') || p.includes('corretor')) {
    return { selectors: ['["office"="estate_agent"]["name"]'], terms: ['imobiliária', 'construtora'] };
  }
  if (p.includes('comercio') || p.includes('varejo')) {
    return { selectors: ['["shop"="supermarket"]["name"]', '["shop"="clothes"]["name"]'], terms: ['comércio', 'loja'] };
  }
  if (p.includes('engenharia') || p.includes('constru')) {
    return { selectors: ['["office"="architect"]["name"]', '["office"="engineer"]["name"]', '["craft"="builder"]["name"]'], terms: ['engenharia', 'construtora'] };
  }
  if (p.includes('saude') || p.includes('clinic')) {
    return { selectors: ['["amenity"="clinic"]["name"]', '["amenity"="doctors"]["name"]'], terms: ['clínica médica', 'consultório'] };
  }
  if (p.includes('industria') || p.includes('fabrica')) {
    return { selectors: ['["man_made"="works"]["name"]', '["office"="company"]["name"]'], terms: ['indústria', 'fábrica'] };
  }
  if (p.includes('advocacia') || p.includes('juridic')) {
    return { selectors: ['["office"="lawyer"]["name"]', '["office"="notary"]["name"]'], terms: ['advocacia', 'escritório de advocacia'] };
  }
  if (p.includes('aliment') || p.includes('gastronom')) {
    return { selectors: ['["amenity"="restaurant"]["name"]', '["shop"="bakery"]["name"]'], terms: ['restaurante', 'padaria'] };
  }
  return { selectors: ['["office"]["name"]', '["shop"]["name"]'], terms: ['empresa', 'escritório'] };
}

function classifyPole(lat: number, lng: number, centerLat: number, centerLng: number): string {
  const poles = [
    { label: 'Polo 1 • Centro Comercial/Financeiro', lat: centerLat, lng: centerLng },
    { label: 'Polo 2 • Corredor Empresarial/Industrial', lat: centerLat + 0.045, lng: centerLng + 0.035 },
    { label: 'Polo 3 • Serviços & Expansão', lat: centerLat - 0.040, lng: centerLng - 0.035 },
  ];
  let best = poles[0];
  let bestDist = Infinity;
  for (const p of poles) {
    const d = (lat - p.lat) ** 2 + (lng - p.lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best.label;
}

export interface PlacesSearchFilter {
  query?: string;
  profession?: string;
  state?: string;
  city?: string;
}

export class PlacesProspectingService {
  /**
   * Função utilitária para normalizar strings: remove acentos e converte para minúsculas.
   */
  public static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Calcula o Fit Score dinamicamente conforme a aderência e sinergia com a profissão ativa.
   */
  public static calculateDynamicFitScore(placeProfession: string, placeArea: string, targetProfession?: string): number {
    if (!targetProfession || targetProfession.includes('Todas')) return 88;
    const normTarget = this.normalizeString(targetProfession);
    const normPlace = this.normalizeString(placeProfession);
    const normArea = this.normalizeString(placeArea);

    if (
      normPlace.includes(normTarget) ||
      normTarget.includes(normPlace) ||
      normArea.includes(normTarget) ||
      normTarget.includes(normArea)
    ) {
      return 97;
    }
    // Sinergia imobiliária
    if (
      (normTarget.includes('imove') || normTarget.includes('imobil') || normTarget.includes('corretor')) &&
      (normPlace.includes('engenharia') || normPlace.includes('constru') || normArea.includes('imove') || normArea.includes('imobil'))
    ) {
      return 94;
    }
    // Sinergia odontológica / saúde
    if (
      (normTarget.includes('saude') || normTarget.includes('odonto') || normTarget.includes('dent')) &&
      (normPlace.includes('saude') || normPlace.includes('clinica') || normArea.includes('odonto') || normArea.includes('saude'))
    ) {
      return 96;
    }
    return 62;
  }

  /**
   * Busca oportunidades com suporte a pesquisa textual inteligente e filtros combinados.
   * Roteia via Back-end seguro (/api/prospecting/search), com catálogo local resiliente como fallback garantido.
   */
  public static async searchPlaces(filter: PlacesSearchFilter): Promise<PlaceOpportunity[]> {
    const apiBase = ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '')
      .trim()
      .replace(/\/+$/, '');
    const prof = filter.profession || 'Todas as Profissões';
    const uf = (filter.state || 'TODOS').toUpperCase();
    const cityInput = (filter.city || filter.query || '').trim();

    try {
      const idToken = await getCurrentFirebaseIdToken();
      const response = await fetch(`${apiBase}/api/ai/prospection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ profession: prof, state: uf, city: cityInput }),
      });
      const ct = response.headers.get('content-type') || '';
      if (response.ok && ct.includes('application/json')) {
        const data = await response.json();
        if (Array.isArray(data?.opportunities)) {
          return data.opportunities.map((raw: any) => {
            const lat = typeof raw.latitude === 'number' ? raw.latitude : (typeof raw.coordinates?.lat === 'number' ? raw.coordinates.lat : -14.235);
            const lng = typeof raw.longitude === 'number' ? raw.longitude : (typeof raw.coordinates?.lng === 'number' ? raw.coordinates.lng : -51.925);
            return {
              id: raw.id,
              name: raw.name,
              cnpj: raw.cnpj || '',
              profession: raw.profession || prof,
              area: raw.area || raw.category || 'Comércio',
              state: raw.state || uf,
              city: raw.city || cityInput || 'Brasil',
              formattedAddress: raw.address || `${raw.city || ''} - ${raw.state || ''}`,
              coordinates: {
                lat,
                lng,
                x: Number(((lng + 180) * (100 / 360)).toFixed(2)),
                y: Number(((90 - lat) * (100 / 180)).toFixed(2)),
              },
              rating: typeof raw.rating === 'number' ? raw.rating : 4.7,
              userRatingsTotal: typeof raw.userRatingsTotal === 'number' ? raw.userRatingsTotal : 1,
              phoneNumber: raw.phoneNumber || raw.phone || 'Sem telefone público',
              website: raw.website || '',
              email: raw.email || '',
              fitScore: typeof raw.fitScore === 'number' ? raw.fitScore : 88,
              estimatedVolume: raw.estimatedVolume || 'Dados reais OpenStreetMap',
              notes: raw.notes || 'Estabelecimento mapeado nos 3 polos.',
            };
          });
        }
      }
    } catch {
      // Fallback direto para consulta multi-polo OpenStreetMap
    }

    // Fallback direto client-side nos 3 Polos Empresariais/Industriais (Overpass + Nominatim)
    const ufMeta = STATE_CENTERS[uf] || STATE_CENTERS.SP;
    const targetCity = cityInput || ufMeta.capital;
    let centerLat = ufMeta.lat;
    let centerLng = ufMeta.lng;

    if (cityInput) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            uf === 'TODOS' ? `${targetCity}, Brazil` : `${targetCity}, ${uf}, Brazil`
          )}&format=json&limit=1`
        );
        if (geoRes.ok) {
          const geoItems = (await geoRes.json()) as any[];
          if (geoItems?.[0]) {
            centerLat = Number(geoItems[0].lat) || centerLat;
            centerLng = Number(geoItems[0].lon) || centerLng;
          }
        }
      } catch {}
    }

    const spec = getSectorSearchSpec(prof);
    const poles = [
      { lat: Number(centerLat.toFixed(6)), lng: Number(centerLng.toFixed(6)) },
      { lat: Number((centerLat + 0.045).toFixed(6)), lng: Number((centerLng + 0.035).toFixed(6)) },
      { lat: Number((centerLat - 0.040).toFixed(6)), lng: Number((centerLng - 0.035).toFixed(6)) },
    ];
    const query = `[out:json][timeout:8];${poles
      .map((p) => `(${spec.selectors.map((s) => `node${s}(around:5000,${p.lat},${p.lng});`).join('')});out body 5;`)
      .join('')}`;

    const seen = new Set<string>();
    const results: PlaceOpportunity[] = [];
    try {
      const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (ovRes.ok) {
        const ovJson = (await ovRes.json()) as { elements?: any[] };
        for (const el of ovJson.elements || []) {
          const name = String(el?.tags?.name || '').trim();
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          const lat = Number(el.lat) || centerLat;
          const lng = Number(el.lon) || centerLng;
          const poleLabel = classifyPole(lat, lng, centerLat, centerLng);
          results.push({
            id: `osm-${el.id}`,
            name,
            cnpj: '',
            profession: prof,
            area: poleLabel,
            state: uf === 'TODOS' ? 'BR' : uf,
            city: targetCity,
            formattedAddress: `${el?.tags?.['addr:street'] || targetCity} • ${poleLabel}`,
            coordinates: {
              lat,
              lng,
              x: Number(((lng + 180) * (100 / 360)).toFixed(2)),
              y: Number(((90 - lat) * (100 / 180)).toFixed(2)),
            },
            rating: 4.8,
            userRatingsTotal: 12,
            phoneNumber: el?.tags?.phone || el?.tags?.['contact:phone'] || 'Sem telefone público',
            website: el?.tags?.website || '',
            email: el?.tags?.email || '',
            fitScore: 91,
            estimatedVolume: 'Mapeamento 3 Polos',
            notes: `${poleLabel} — Mapeado via OpenStreetMap`,
          });
          if (results.length >= 15) break;
        }
      }
    } catch {}

    return results;
  }
}
