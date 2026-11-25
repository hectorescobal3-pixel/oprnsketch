import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlaceOpportunity } from '../services/places-prospecting-service';

interface InteractiveFlatWorldMapProps {
  opportunities: PlaceOpportunity[];
  selectedOpportunity: PlaceOpportunity | null;
  onSelectOpportunity: (opp: PlaceOpportunity) => void;
  targetState: string;
  targetCity: string;
}

// Coordenadas dos continentes em [lat, lng]
const CONTINENTS: Record<string, Array<[number, number]>> = {
  southAmerica: [
    [12.5, -71.5], [11.0, -64.0], [10.5, -61.5], [8.5, -59.5], [6.0, -55.0],
    [4.5, -51.5], [1.5, -50.0], [-0.5, -48.0], [-2.5, -44.0], [-3.0, -41.0],
    [-5.0, -35.5], [-7.5, -34.8], [-9.5, -35.5], [-13.0, -38.5], [-16.0, -39.0],
    [-18.0, -39.5], [-20.5, -40.3], [-23.0, -42.0], [-24.0, -46.3], [-25.5, -48.5],
    [-28.0, -48.6], [-32.0, -52.0], [-34.5, -53.5], [-35.0, -56.0], [-38.0, -57.5],
    [-42.0, -65.0], [-46.0, -66.0], [-52.0, -68.0], [-55.0, -66.5], [-53.0, -73.0],
    [-45.0, -74.0], [-37.0, -73.5], [-30.0, -71.5], [-22.0, -70.3], [-18.0, -70.3],
    [-12.0, -77.0], [-5.0, -81.0], [-1.0, -80.5], [2.0, -79.0], [7.0, -77.5],
    [9.0, -79.5], [11.5, -74.5], [12.5, -71.5]
  ],
  brazilHighlight: [
    [4.5, -51.5], [1.5, -50.0], [-0.5, -48.0], [-2.5, -44.0], [-3.0, -41.0],
    [-5.0, -35.5], [-7.5, -34.8], [-9.5, -35.5], [-13.0, -38.5], [-16.0, -39.0],
    [-18.0, -39.5], [-20.5, -40.3], [-23.0, -42.0], [-24.0, -46.3], [-25.5, -48.5],
    [-28.0, -48.6], [-32.0, -52.0], [-33.7, -53.4], [-30.0, -57.5], [-27.5, -53.5],
    [-25.5, -54.5], [-24.0, -54.3], [-22.0, -58.0], [-19.0, -58.0], [-16.0, -60.0],
    [-13.0, -60.5], [-11.0, -62.5], [-10.0, -65.0], [-9.0, -69.5], [-7.0, -73.8],
    [-4.0, -70.0], [0.0, -67.0], [2.0, -67.0], [4.0, -60.0], [4.5, -51.5]
  ],
  northAmerica: [
    [9.0, -79.5], [15.0, -88.0], [21.0, -97.0], [29.0, -94.0], [25.0, -80.0],
    [35.0, -75.0], [44.0, -66.0], [47.0, -53.0], [60.0, -64.0], [70.0, -70.0],
    [70.0, -130.0], [60.0, -145.0], [48.0, -124.0], [34.0, -120.0], [23.0, -110.0],
    [16.0, -94.0], [9.0, -79.5]
  ],
  europe: [
    [36.0, -5.5], [43.0, -9.0], [48.0, -4.5], [54.0, 5.0], [58.0, 5.0],
    [62.0, 5.0], [70.0, 25.0], [68.0, 40.0], [60.0, 50.0], [50.0, 45.0],
    [45.0, 35.0], [40.0, 26.0], [38.0, 24.0], [36.0, 15.0], [38.0, 0.0],
    [36.0, -5.5]
  ],
  africa: [
    [37.0, 10.0], [33.0, 32.0], [28.0, 34.0], [12.0, 44.0], [0.0, 42.0],
    [-12.0, 40.0], [-26.0, 33.0], [-34.5, 20.0], [-33.0, 18.0], [-22.0, 14.0],
    [-5.0, 12.0], [4.0, 9.5], [5.0, 0.0], [4.5, -7.5], [14.5, -17.5],
    [21.0, -17.0], [32.0, -9.5], [36.0, -5.5], [37.0, 10.0]
  ],
  asia: [
    [40.0, 26.0], [45.0, 35.0], [50.0, 45.0], [60.0, 50.0], [70.0, 60.0],
    [72.0, 130.0], [65.0, 170.0], [55.0, 160.0], [40.0, 140.0], [30.0, 122.0],
    [22.0, 114.0], [10.0, 105.0], [1.5, 104.0], [12.0, 98.0], [22.0, 90.0],
    [8.0, 77.0], [25.0, 65.0], [25.0, 55.0], [30.0, 48.0], [30.0, 35.0],
    [40.0, 26.0]
  ],
  oceania: [
    [-12.0, 136.0], [-15.0, 145.0], [-25.0, 153.0], [-38.0, 148.0], [-38.0, 140.0],
    [-32.0, 130.0], [-34.0, 115.0], [-22.0, 114.0], [-15.0, 125.0], [-12.0, 136.0]
  ]
};

// Contornos e dados geográficos dos 27 Estados do Brasil
interface StateBoundary {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  outline: Array<[number, number]>;
}

const BRAZIL_STATES: Record<string, StateBoundary> = {
  SP: {
    name: 'São Paulo',
    lat: -22.5,
    lng: -48.5,
    zoom: 3.5,
    outline: [
      [-23.5, -45.0], [-23.3, -44.7], [-22.5, -45.0], [-22.8, -46.5], [-22.0, -47.0],
      [-21.0, -47.5], [-20.0, -48.0], [-20.0, -50.5], [-20.8, -51.3], [-21.8, -52.2],
      [-22.5, -53.0], [-22.7, -52.2], [-23.5, -51.0], [-24.5, -49.0], [-25.2, -48.0],
      [-24.0, -46.5], [-23.8, -45.4], [-23.5, -45.0]
    ]
  },
  RJ: {
    name: 'Rio de Janeiro',
    lat: -22.3,
    lng: -42.8,
    zoom: 4.5,
    outline: [
      [-22.0, -41.0], [-21.3, -41.0], [-21.0, -41.5], [-21.4, -42.0], [-22.0, -43.5],
      [-22.5, -44.5], [-23.3, -44.7], [-23.0, -43.2], [-22.9, -42.0], [-22.0, -41.0]
    ]
  },
  MG: {
    name: 'Minas Gerais',
    lat: -18.8,
    lng: -44.5,
    zoom: 2.9,
    outline: [
      [-14.5, -44.5], [-15.0, -42.5], [-16.0, -40.5], [-18.0, -40.0], [-19.5, -41.5],
      [-21.0, -41.5], [-21.4, -42.0], [-22.0, -43.5], [-22.5, -45.0], [-22.8, -46.5],
      [-22.0, -47.0], [-21.0, -47.5], [-20.0, -48.0], [-19.0, -50.5], [-19.0, -51.0],
      [-17.5, -47.5], [-16.0, -47.0], [-15.0, -46.0], [-14.5, -44.5]
    ]
  },
  ES: {
    name: 'Espírito Santo',
    lat: -19.5,
    lng: -40.5,
    zoom: 4.3,
    outline: [
      [-18.0, -40.0], [-18.5, -39.8], [-19.8, -40.0], [-21.2, -40.8], [-21.0, -41.5],
      [-19.5, -41.5], [-18.5, -41.0], [-18.0, -40.0]
    ]
  },
  PR: {
    name: 'Paraná',
    lat: -24.8,
    lng: -51.5,
    zoom: 3.4,
    outline: [
      [-22.5, -53.0], [-22.7, -52.2], [-23.5, -51.0], [-24.5, -49.0], [-25.2, -48.0],
      [-25.8, -48.5], [-26.0, -49.8], [-26.1, -52.0], [-26.2, -53.7], [-25.5, -54.5],
      [-24.0, -54.3], [-23.0, -53.5], [-22.5, -53.0]
    ]
  },
  SC: {
    name: 'Santa Catarina',
    lat: -27.2,
    lng: -50.5,
    zoom: 3.7,
    outline: [
      [-25.8, -48.5], [-26.0, -49.8], [-26.1, -52.0], [-26.2, -53.7], [-27.2, -53.8],
      [-27.5, -52.0], [-27.8, -50.0], [-29.3, -49.7], [-28.5, -48.7], [-27.0, -48.5],
      [-25.8, -48.5]
    ]
  },
  RS: {
    name: 'Rio Grande do Sul',
    lat: -29.8,
    lng: -53.5,
    zoom: 3.2,
    outline: [
      [-27.2, -53.8], [-27.5, -52.0], [-27.8, -50.0], [-29.3, -49.7], [-31.0, -50.8],
      [-33.7, -53.4], [-32.0, -52.0], [-30.0, -57.5], [-28.0, -56.0], [-27.5, -53.5],
      [-27.2, -53.8]
    ]
  },
  BA: {
    name: 'Bahia',
    lat: -12.5,
    lng: -41.7,
    zoom: 2.8,
    outline: [
      [-8.5, -39.5], [-9.5, -37.5], [-11.5, -37.5], [-13.0, -38.5], [-16.0, -39.0],
      [-18.0, -39.5], [-18.0, -40.0], [-16.0, -40.5], [-15.0, -42.5], [-14.5, -44.5],
      [-13.5, -46.5], [-11.0, -46.0], [-10.0, -44.0], [-9.0, -42.5], [-8.5, -39.5]
    ]
  },
  PE: {
    name: 'Pernambuco',
    lat: -8.3,
    lng: -37.8,
    zoom: 3.9,
    outline: [
      [-7.5, -35.0], [-8.0, -34.8], [-9.0, -35.2], [-9.5, -37.5], [-8.5, -39.5],
      [-8.5, -41.0], [-7.5, -40.5], [-7.5, -37.5], [-7.5, -35.0]
    ]
  },
  CE: {
    name: 'Ceará',
    lat: -5.2,
    lng: -39.3,
    zoom: 3.7,
    outline: [
      [-2.8, -40.5], [-3.7, -38.5], [-4.7, -37.2], [-6.5, -38.5], [-7.5, -39.0],
      [-7.5, -40.5], [-5.0, -41.0], [-3.0, -41.2], [-2.8, -40.5]
    ]
  },
  GO: {
    name: 'Goiás',
    lat: -15.9,
    lng: -49.8,
    zoom: 3.2,
    outline: [
      [-13.0, -50.5], [-13.5, -46.5], [-14.5, -46.0], [-16.0, -47.0], [-17.5, -47.5],
      [-18.5, -48.5], [-18.5, -50.5], [-19.0, -51.0], [-18.0, -53.0], [-16.5, -52.5],
      [-15.0, -52.0], [-13.0, -50.5]
    ]
  },
  DF: {
    name: 'Distrito Federal',
    lat: -15.78,
    lng: -47.93,
    zoom: 4.8,
    outline: [
      [-15.5, -48.2], [-15.5, -47.4], [-16.0, -47.4], [-16.0, -48.2], [-15.5, -48.2]
    ]
  },
  AM: {
    name: 'Amazonas',
    lat: -4.0,
    lng: -63.5,
    zoom: 2.3,
    outline: [
      [2.0, -67.0], [0.0, -67.0], [-4.0, -70.0], [-7.0, -73.8], [-9.0, -69.5],
      [-10.0, -65.0], [-8.5, -61.0], [-7.0, -59.0], [-4.5, -57.5], [-2.0, -58.0],
      [-1.0, -60.0], [1.5, -63.5], [2.2, -65.5], [2.0, -67.0]
    ]
  },
  PA: {
    name: 'Pará',
    lat: -4.2,
    lng: -52.5,
    zoom: 2.4,
    outline: [
      [2.5, -54.0], [1.5, -50.0], [-0.5, -48.0], [-2.5, -44.0], [-6.0, -46.5],
      [-9.0, -50.5], [-9.5, -52.0], [-9.0, -54.5], [-9.0, -58.0], [-7.0, -59.0],
      [-4.5, -57.5], [-2.0, -58.0], [0.5, -55.0], [2.5, -54.0]
    ]
  },
  MT: {
    name: 'Mato Grosso',
    lat: -13.0,
    lng: -55.5,
    zoom: 2.7,
    outline: [
      [-9.0, -58.0], [-9.0, -54.5], [-9.5, -52.0], [-13.0, -50.5], [-15.0, -52.0],
      [-17.5, -53.5], [-17.5, -58.0], [-16.0, -60.0], [-13.0, -60.5], [-11.0, -62.5],
      [-9.0, -58.0]
    ]
  },
  MS: {
    name: 'Mato Grosso do Sul',
    lat: -20.5,
    lng: -54.8,
    zoom: 3.1,
    outline: [
      [-17.5, -53.5], [-18.0, -53.0], [-19.0, -51.0], [-20.8, -51.3], [-21.8, -52.2],
      [-22.5, -53.0], [-24.0, -54.3], [-23.0, -55.5], [-22.0, -58.0], [-19.0, -58.0],
      [-17.5, -58.0], [-17.5, -53.5]
    ]
  },
  MA: {
    name: 'Maranhão',
    lat: -5.0,
    lng: -45.0,
    zoom: 3.0,
    outline: [
      [-2.0, -44.0], [-3.0, -41.5], [-5.0, -43.0], [-7.5, -44.5], [-9.5, -46.0],
      [-8.5, -47.0], [-6.0, -46.5], [-2.5, -44.0], [-2.0, -44.0]
    ]
  },
  PI: {
    name: 'Piauí',
    lat: -7.0,
    lng: -42.5,
    zoom: 3.1,
    outline: [
      [-2.8, -41.5], [-3.0, -41.2], [-5.0, -41.0], [-7.5, -40.5], [-9.0, -42.5],
      [-10.0, -44.0], [-9.5, -46.0], [-7.5, -44.5], [-5.0, -43.0], [-2.8, -41.5]
    ]
  },
  RN: {
    name: 'Rio Grande do Norte',
    lat: -5.7,
    lng: -36.5,
    zoom: 4.4,
    outline: [
      [-4.8, -37.0], [-5.1, -35.2], [-6.4, -35.0], [-6.5, -38.5], [-4.8, -37.0]
    ]
  },
  PB: {
    name: 'Paraíba',
    lat: -7.1,
    lng: -36.8,
    zoom: 4.4,
    outline: [
      [-6.4, -35.0], [-7.1, -34.8], [-7.5, -35.0], [-7.5, -37.5], [-7.0, -38.5],
      [-6.5, -38.5], [-6.4, -35.0]
    ]
  },
  AL: {
    name: 'Alagoas',
    lat: -9.6,
    lng: -36.6,
    zoom: 4.5,
    outline: [
      [-8.8, -35.2], [-9.5, -35.2], [-10.2, -36.3], [-9.5, -37.5], [-9.0, -36.0],
      [-8.8, -35.2]
    ]
  },
  SE: {
    name: 'Sergipe',
    lat: -10.6,
    lng: -37.3,
    zoom: 4.6,
    outline: [
      [-10.2, -36.3], [-11.3, -37.2], [-11.5, -37.5], [-10.0, -37.8], [-9.5, -37.5],
      [-10.2, -36.3]
    ]
  },
  TO: {
    name: 'Tocantins',
    lat: -10.2,
    lng: -48.3,
    zoom: 3.0,
    outline: [
      [-5.5, -47.5], [-6.0, -46.5], [-8.5, -47.0], [-11.0, -46.0], [-13.0, -46.5],
      [-13.0, -50.5], [-9.0, -50.5], [-6.0, -48.5], [-5.5, -47.5]
    ]
  },
  RO: {
    name: 'Rondônia',
    lat: -11.0,
    lng: -62.8,
    zoom: 3.2,
    outline: [
      [-8.5, -63.0], [-9.0, -60.5], [-11.0, -60.5], [-13.0, -60.5], [-13.0, -62.5],
      [-12.0, -65.0], [-10.0, -65.0], [-8.5, -63.0]
    ]
  },
  AC: {
    name: 'Acre',
    lat: -9.2,
    lng: -70.5,
    zoom: 3.2,
    outline: [
      [-7.0, -73.8], [-8.0, -70.0], [-10.0, -69.0], [-11.0, -69.0], [-10.0, -65.0],
      [-9.0, -69.5], [-7.0, -73.8]
    ]
  },
  RR: {
    name: 'Roraima',
    lat: 2.5,
    lng: -61.5,
    zoom: 3.1,
    outline: [
      [5.2, -60.5], [4.0, -59.5], [1.0, -60.0], [-0.5, -62.0], [1.5, -63.5],
      [4.5, -64.0], [5.2, -60.5]
    ]
  },
  AP: {
    name: 'Amapá',
    lat: 1.4,
    lng: -51.9,
    zoom: 3.5,
    outline: [
      [4.4, -51.5], [2.0, -50.0], [0.0, -50.0], [-0.5, -51.5], [1.0, -53.5],
      [3.5, -53.0], [4.4, -51.5]
    ]
  },
};

// Ponto de partida padrão: Brasil em destaque no Mapa-Múndi
const DEFAULT_CENTER = {
  name: 'Brasil (Visão Geral)',
  lat: -14.2,
  lng: -51.9,
  zoom: 1.0,
};

export const InteractiveFlatWorldMap: React.FC<InteractiveFlatWorldMapProps> = ({
  opportunities,
  selectedOpportunity,
  onSelectOpportunity,
  targetState,
  targetCity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Câmera do mapa 2D plano (Lat, Lng e Zoom)
  const [camera, setCamera] = useState({
    lat: -14.2,
    lng: -51.9,
    zoom: 1.0,
  });

  const cameraRef = useRef({
    lat: -14.2,
    lng: -51.9,
    zoom: 1.0,
  });

  const [focusLabel, setFocusLabel] = useState<string>('Brasil (Visão Geral)');
  const [isGrabbing, setIsGrabbing] = useState<boolean>(false);

  // Controlador de Voo Suave (Fly-To 2D)
  const flightRef = useRef<{
    isFlying: boolean;
    startLat: number;
    startLng: number;
    startZoom: number;
    targetLat: number;
    targetLng: number;
    targetZoom: number;
    startTime: number;
    duration: number;
    label: string;
  }>({
    isFlying: false,
    startLat: -14.2,
    startLng: -51.9,
    startZoom: 1.0,
    targetLat: -14.2,
    targetLng: -51.9,
    targetZoom: 1.0,
    startTime: 0,
    duration: 1000,
    label: 'Brasil',
  });

  // Estado para arrasto 1:1 preciso
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Pinos renderizados para detecção de clique
  const renderedPinsRef = useRef<
    Array<{ opp: PlaceOpportunity; x: number; y: number; r: number }>
  >([]);

  // Disparar voo cinemático 2D
  const triggerFlyTo = useCallback(
    (destLat: number, destLng: number, destZoom: number, label: string, durationMs: number = 1000) => {
      let curLng = cameraRef.current.lng;
      let dLng = destLng - curLng;
      while (dLng > 180) dLng -= 360;
      while (dLng < -180) dLng += 360;

      flightRef.current = {
        isFlying: true,
        startLat: cameraRef.current.lat,
        startLng: curLng,
        startZoom: cameraRef.current.zoom,
        targetLat: destLat,
        targetLng: curLng + dLng,
        targetZoom: destZoom,
        startTime: performance.now(),
        duration: durationMs,
        label,
      };

      setFocusLabel(label);
    },
    []
  );

  // Monitora filtros de Estado ou Cidade para dar Fly-To
  useEffect(() => {
    // 1. Pesquisa por Cidade
    if (targetCity.trim()) {
      const normalizedQuery = targetCity
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      const cityMatch = opportunities.find((o) => {
        const normCity = o.city
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return normCity.includes(normalizedQuery);
      });

      if (cityMatch) {
        triggerFlyTo(
          cityMatch.coordinates.lat,
          cityMatch.coordinates.lng,
          4.8,
          `${cityMatch.city} - ${cityMatch.state}`
        );
        return;
      }
    }

    // 2. Filtro por Estado (UF)
    if (targetState && targetState !== 'TODOS' && BRAZIL_STATES[targetState]) {
      const stateData = BRAZIL_STATES[targetState];
      triggerFlyTo(
        stateData.lat,
        stateData.lng,
        stateData.zoom,
        `${stateData.name} (${targetState})`
      );
      return;
    }

    // 3. Retorno ao Brasil inteiro
    if (targetState === 'TODOS' && !targetCity.trim()) {
      triggerFlyTo(
        DEFAULT_CENTER.lat,
        DEFAULT_CENTER.lng,
        DEFAULT_CENTER.zoom,
        DEFAULT_CENTER.name
      );
    }
  }, [targetState, targetCity, opportunities, triggerFlyTo]);

  // Se uma oportunidade for selecionada externamente, foca nela
  useEffect(() => {
    if (selectedOpportunity) {
      triggerFlyTo(
        selectedOpportunity.coordinates.lat,
        selectedOpportunity.coordinates.lng,
        5.0,
        `${selectedOpportunity.name} (${selectedOpportunity.city})`
      );
    }
  }, [selectedOpportunity, triggerFlyTo]);

  // Loop de animação de voo (requestAnimationFrame)
  useEffect(() => {
    const loop = (now: number) => {
      if (flightRef.current.isFlying) {
        const flight = flightRef.current;
        const elapsed = now - flight.startTime;
        const progress = Math.min(1.0, elapsed / flight.duration);

        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const nextLat = flight.startLat + (flight.targetLat - flight.startLat) * ease;
        const nextLng = flight.startLng + (flight.targetLng - flight.startLng) * ease;
        const nextZoom = flight.startZoom + (flight.targetZoom - flight.startZoom) * ease;

        cameraRef.current = { lat: nextLat, lng: nextLng, zoom: nextZoom };
        setCamera({ lat: nextLat, lng: nextLng, zoom: nextZoom });

        if (progress >= 1.0) {
          flight.isFlying = false;
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Projeção 2D Plana (Equirretangular adaptada à tela)
  const project2D = useCallback(
    (lat: number, lng: number, width: number, height: number) => {
      const { lat: centerLat, lng: centerLng, zoom } = camera;

      // Dimensões base do mundo plano
      const worldW = width * 1.5;
      const worldH = height * 1.6;

      const px = ((lng + 180) / 360) * worldW;
      const py = ((90 - lat) / 180) * worldH;

      const cx = ((centerLng + 180) / 360) * worldW;
      const cy = ((90 - centerLat) / 180) * worldH;

      const x = width / 2 + (px - cx) * zoom;
      const y = height / 2 + (py - cy) * zoom;

      return { x, y };
    },
    [camera]
  );

  // Projeção Inversa 2D (Pixel da tela -> Lat/Lng)
  const unproject2D = useCallback(
    (screenX: number, screenY: number, width: number, height: number) => {
      const { lat: centerLat, lng: centerLng, zoom } = camera;

      const worldW = width * 1.5;
      const worldH = height * 1.6;

      const cx = ((centerLng + 180) / 360) * worldW;
      const cy = ((90 - centerLat) / 180) * worldH;

      const px = cx + (screenX - width / 2) / zoom;
      const py = cy + (screenY - height / 2) / zoom;

      let lng = (px / worldW) * 360 - 180;
      let lat = 90 - (py / worldH) * 180;

      while (lng > 180) lng -= 360;
      while (lng < -180) lng += 360;
      lat = Math.max(-85, Math.min(85, lat));

      return { lat, lng };
    },
    [camera]
  );

  // Renderizador do Mapa Plano Vetorial no Canvas
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Oceano / Fundo Escuro Minimalista (Ocupando 100% da largura)
    const oceanGrad = ctx.createLinearGradient(0, 0, width, height);
    oceanGrad.addColorStop(0, '#0C1017');
    oceanGrad.addColorStop(1, '#080A0E');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Grade Geográfica Sutil (Paralelos e Meridianos)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.22)';
    ctx.lineWidth = 1;

    // Paralelos (-60° a +60°)
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      const p1 = project2D(lat, -180, width, height);
      const p2 = project2D(lat, 180, width, height);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Linha do Equador em Destaque
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const eq1 = project2D(0, -180, width, height);
    const eq2 = project2D(0, 180, width, height);
    ctx.moveTo(eq1.x, eq1.y);
    ctx.lineTo(eq2.x, eq2.y);
    ctx.stroke();

    // Meridianos (-180° a +180°)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.18)';
    ctx.lineWidth = 1;
    for (let lng = -180; lng <= 180; lng += 30) {
      ctx.beginPath();
      const p1 = project2D(85, lng, width, height);
      const p2 = project2D(-85, lng, width, height);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // 3. Continentes do Mundo (Vetoriais Limpos)
    Object.entries(CONTINENTS).forEach(([key, coords]) => {
      const isBrazil = key === 'brazilHighlight';
      ctx.beginPath();

      coords.forEach(([lat, lng], idx) => {
        const pt = project2D(lat, lng, width, height);
        if (idx === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      });

      ctx.closePath();

      if (isBrazil) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
        ctx.lineWidth = 1.6;
      } else {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.55)';
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
        ctx.lineWidth = 1;
      }
      ctx.fill();
      ctx.stroke();
    });

    // 4. Contornos Internos dos 27 Estados do Brasil
    Object.entries(BRAZIL_STATES).forEach(([uf, stateData]) => {
      const isSelectedState = targetState === uf;
      ctx.beginPath();

      stateData.outline.forEach(([lat, lng], idx) => {
        const pt = project2D(lat, lng, width, height);
        if (idx === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      });

      ctx.closePath();

      if (isSelectedState) {
        // Estado Selecionado: Alto Destaque Visual com Brilho
        ctx.fillStyle = 'rgba(59, 130, 246, 0.32)';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.4;
        ctx.fill();
        ctx.stroke();
      } else if (camera.zoom >= 1.2) {
        // Divisões internas visíveis
        ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // Rótulos dos Estados
      const stateCenter = project2D(stateData.lat, stateData.lng, width, height);

      if (isSelectedState) {
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
        const badgeText = `📍 ${stateData.name.toUpperCase()} (${uf})`;
        const badgeWidth = ctx.measureText(badgeText).width;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(
          stateCenter.x - badgeWidth / 2 - 8,
          stateCenter.y - 12,
          badgeWidth + 16,
          24,
          6
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, stateCenter.x, stateCenter.y);
      } else if (camera.zoom >= 1.8) {
        ctx.font = '600 11px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.75)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(uf, stateCenter.x, stateCenter.y);
      }
    });

    // 5. Rótulo "BRASIL" na vista aberta
    if (camera.zoom < 1.6) {
      const brCenter = project2D(-14.2, -51.9, width, height);
      ctx.fillStyle = 'rgba(147, 197, 253, 0.9)';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BRASIL', brCenter.x, brCenter.y);
    }

    // 6. Pinos Clicáveis das Oportunidades Comerciais
    const newRenderedPins: Array<{
      opp: PlaceOpportunity;
      x: number;
      y: number;
      r: number;
    }> = [];

    // Ordenar para desenhar o pino selecionado por último (sempre no topo do z-order)
    const sortedOpps = [...opportunities].sort((a, b) => {
      if (selectedOpportunity?.id === a.id) return 1;
      if (selectedOpportunity?.id === b.id) return -1;
      return a.fitScore - b.fitScore;
    });

    // Primeiro passo: desenhar todos os pontos/halos no mapa
    const pinVisuals: Array<{
      opp: PlaceOpportunity;
      x: number;
      y: number;
      pinRadius: number;
      isSelected: boolean;
    }> = [];

    sortedOpps.forEach((opp) => {
      const pt = project2D(opp.coordinates.lat, opp.coordinates.lng, width, height);
      if (pt.x < -40 || pt.x > width + 40 || pt.y < -40 || pt.y > height + 40) return;

      const isSelected = selectedOpportunity?.id === opp.id;
      const isHighFit = opp.fitScore >= 85;
      const pinRadius = isSelected ? 12 : camera.zoom >= 2.5 ? 9 : 7;

      newRenderedPins.push({ opp, x: pt.x, y: pt.y, r: pinRadius + 8 });
      pinVisuals.push({ opp, x: pt.x, y: pt.y, pinRadius, isSelected });

      // Halo pulsante
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pinRadius * 1.75, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.5)'
        : isHighFit
        ? 'rgba(16, 185, 129, 0.32)'
        : 'rgba(96, 165, 250, 0.25)';
      ctx.fill();

      // Ponto principal
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pinRadius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected
        ? '#3B82F6'
        : isHighFit
        ? '#10B981'
        : '#3D5A73';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });

    // Segundo passo: desenhar etiquetas com detecção de colisão (prioridade: selecionado > maior fitScore)
    const placedLabelBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const labelCandidates = [...pinVisuals].reverse();

    const overlapsExisting = (box: { x1: number; y1: number; x2: number; y2: number }) =>
      placedLabelBoxes.some(
        (b) => !(box.x2 + 6 < b.x1 || box.x1 - 6 > b.x2 || box.y2 + 4 < b.y1 || box.y1 - 4 > b.y2)
      );

    labelCandidates.forEach(({ opp, x, y, pinRadius, isSelected }) => {
      if (!isSelected && camera.zoom < 1.35) return;

      ctx.font = isSelected ? '700 11px -apple-system, sans-serif' : '600 10.5px -apple-system, sans-serif';
      const shortName = opp.name.length > 26 ? `${opp.name.slice(0, 24)}…` : opp.name;
      const labelText = isSelected || camera.zoom >= 2.2
        ? `${shortName} • ${opp.city}`
        : shortName;

      const textWidth = ctx.measureText(labelText).width;
      const boxW = textWidth + 14;
      const boxH = 20;

      // 4 posições candidatas ao redor do pino para evitar sobreposição
      const offsets = [
        { cx: x, cy: y - pinRadius - 14 }, // Acima
        { cx: x, cy: y + pinRadius + 14 }, // Abaixo
        { cx: x + pinRadius + boxW / 2 + 8, cy: y }, // Direita
        { cx: x - pinRadius - boxW / 2 - 8, cy: y }, // Esquerda
      ];

      let chosenBox: { x1: number; y1: number; x2: number; y2: number; cx: number; cy: number } | null = null;
      for (const pos of offsets) {
        const candidate = {
          x1: pos.cx - boxW / 2,
          y1: pos.cy - boxH / 2,
          x2: pos.cx + boxW / 2,
          y2: pos.cy + boxH / 2,
          cx: pos.cx,
          cy: pos.cy,
        };
        if (candidate.x1 < 4 || candidate.x2 > width - 4 || candidate.y1 < 4 || candidate.y2 > height - 4) {
          continue;
        }
        if (!overlapsExisting(candidate)) {
          chosenBox = candidate;
          break;
        }
      }

      // Se não houver espaço livre para pino não selecionado, oculta só a etiqueta (mantendo o pino clicável)
      if (!chosenBox) {
        if (!isSelected) return;
        chosenBox = {
          x1: x - boxW / 2,
          y1: y - pinRadius - 24,
          x2: x + boxW / 2,
          y2: y - pinRadius - 4,
          cx: x,
          cy: y - pinRadius - 14,
        };
      }

      placedLabelBoxes.push(chosenBox);

      ctx.fillStyle = isSelected ? 'rgba(15, 23, 42, 0.98)' : 'rgba(18, 20, 23, 0.92)';
      ctx.strokeStyle = isSelected ? '#93C5FD' : '#3D5A73';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(chosenBox.x1, chosenBox.y1, boxW, boxH, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#FFFFFF' : '#E2E8F0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, chosenBox.cx, chosenBox.cy);
    });

    renderedPinsRef.current = newRenderedPins;
  }, [camera, opportunities, selectedOpportunity, targetState, project2D]);

  // Redimensionamento Dinâmico com DPI Scaling
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      drawMap();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMap]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // Manipulador de Clique e Início do Arrasto
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Se clicou em um pino comercial, seleciona a oportunidade
    const clickedPin = renderedPinsRef.current.find((p) => {
      const dist = Math.hypot(p.x - clickX, p.y - clickY);
      return dist <= p.r;
    });

    if (clickedPin) {
      onSelectOpportunity(clickedPin.opp);
      return;
    }

    // Interrompe qualquer voo ativo ao interagir manualmente
    flightRef.current.isFlying = false;

    isDraggingRef.current = true;
    setIsGrabbing(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  // CORREÇÃO DA FÍSICA DE ARRASTO (Pan 1:1 Direto com o Cursor)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    const rect = canvas.getBoundingClientRect();
    const worldW = rect.width * 1.5;
    const worldH = rect.height * 1.6;

    // Ao mover o mouse para a direita (dx > 0), o mapa deve se deslocar para a direita:
    // diminuímos a longitude central na proporção exata de 1:1 com o cursor
    const deltaLng = (dx / (worldW * camera.zoom)) * 360;
    // Ao mover o mouse para baixo (dy > 0), o mapa deve se deslocar para baixo:
    // aumentamos a latitude central na proporção exata de 1:1 com o cursor
    const deltaLat = (dy / (worldH * camera.zoom)) * 180;

    const newLng = cameraRef.current.lng - deltaLng;
    const newLat = Math.max(-85, Math.min(85, cameraRef.current.lat + deltaLat));

    cameraRef.current = {
      ...cameraRef.current,
      lat: newLat,
      lng: newLng,
    };

    setCamera((prev) => ({
      ...prev,
      lat: newLat,
      lng: newLng,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsGrabbing(false);
  };

  // AMPLIAÇÃO POR DUPLO CLIQUE (onDoubleClick)
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calcula coordenadas exatas onde foi dado o duplo clique
    const { lat, lng } = unproject2D(clickX, clickY, rect.width, rect.height);
    const nextZoom = Math.min(6.0, camera.zoom * 1.5);

    triggerFlyTo(lat, lng, nextZoom, 'Zoom Duplo Clique', 800);
  };

  // Zoom Suave pelo Scroll do Mouse
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.35 : -0.35;
    const newZoom = Math.max(0.7, Math.min(6.0, camera.zoom + zoomDelta));

    cameraRef.current = {
      ...cameraRef.current,
      zoom: newZoom,
    };

    setCamera((prev) => ({
      ...prev,
      zoom: newZoom,
    }));
  };

  // Botões de Zoom e Centralização
  const handleZoomIn = () => {
    const nextZoom = Math.min(6.0, camera.zoom + 0.6);
    triggerFlyTo(camera.lat, camera.lng, nextZoom, focusLabel, 500);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(0.7, camera.zoom - 0.6);
    triggerFlyTo(camera.lat, camera.lng, nextZoom, focusLabel, 500);
  };

  const handleResetBrazil = () => {
    triggerFlyTo(
      DEFAULT_CENTER.lat,
      DEFAULT_CENTER.lng,
      DEFAULT_CENTER.zoom,
      DEFAULT_CENTER.name,
      1200
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '380px', // Altura compacta e proporcional
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#080A0E',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #1E232B',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{
          cursor: isGrabbing ? 'grabbing' : 'grab',
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />

      {/* HUD Superior Esquerdo: Localidade e Zoom */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '6px 12px',
          color: '#E2E8F0',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 40,
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        <span style={{ fontSize: '13px' }}>
          {flightRef.current.isFlying ? '✈️' : '🗺️'}
        </span>
        <span>
          {flightRef.current.isFlying ? `Localizando: ${focusLabel}` : focusLabel}
        </span>
        <span style={{ color: '#64748B' }}>•</span>
        <span style={{ color: '#38BDF8', fontWeight: 700 }}>
          {camera.zoom.toFixed(1)}x
        </span>
      </div>

      {/* Dica de Navegação no Canto Inferior Esquerdo */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          left: '14px',
          color: '#94A3B8',
          fontSize: '11px',
          fontWeight: 500,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          padding: '4px 10px',
          borderRadius: '6px',
          pointerEvents: 'none',
          zIndex: 40,
        }}
      >
        💡 Arraste para mover • Duplo clique para aproximar • Scroll para zoom
      </div>

      {/* Botões Flutuantes de Zoom e Centralização */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          title="Aproximar (Zoom In)"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#1E252F',
            border: '1px solid #3D5A73',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#27323F';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1E252F';
          }}
        >
          +
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          title="Afastar (Zoom Out)"
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#1E252F',
            border: '1px solid #3D5A73',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#27323F';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1E252F';
          }}
        >
          −
        </button>

        <button
          type="button"
          onClick={handleResetBrazil}
          title="Centralizar no Brasil"
          style={{
            padding: '6px 10px',
            backgroundColor: '#1E252F',
            border: '1px solid #3D5A73',
            color: '#93C5FD',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#27323F';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1E252F';
            e.currentTarget.style.color = '#93C5FD';
          }}
        >
          🇧🇷 Brasil
        </button>
      </div>
    </div>
  );
};
