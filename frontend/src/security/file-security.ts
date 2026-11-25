// ==============================================================================
// OPENsketch File Security & Content Armor
// Enforces strict MIME validation, Magic Bytes inspection, and Canvas Re-rasterization
// ==============================================================================

export const MAX_ALLOWED_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMimeType = typeof ALLOWED_IMAGE_MIME_TYPES[number];

export interface FileSecurityValidationResult {
  isValid: boolean;
  error?: string;
  detectedMimeType?: string;
}

/**
 * Validates file signature (magic bytes) to prevent executable/HTML/SVG disguised as images.
 */
export async function validateImageMagicBytes(file: File): Promise<FileSecurityValidationResult> {
  // 1. Verificação estrita de tamanho
  if (file.size > MAX_ALLOWED_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `O arquivo excede o limite máximo permitido de 5 MB (tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  if (file.size < 12) {
    return {
      isValid: false,
      error: 'Arquivo inválido ou corrompido (tamanho insuficiente).',
    };
  }

  // 2. Verificação do MIME type declarado
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      isValid: false,
      error: `Formato não permitido (${file.type || 'desconhecido'}). Envie apenas fotos nos formatos JPG, PNG ou WEBP. Não são aceitos arquivos SVG, HTML ou executáveis.`,
    };
  }

  // 3. Inspeção de Magic Bytes reais lendo os primeiros 16 bytes do arquivo
  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;

    // WebP: RIFF .... WEBP
    const isRiff =
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isWebp =
      isRiff &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return {
        isValid: false,
        error: 'Assinatura binária do arquivo não corresponde a uma imagem válida (JPG, PNG ou WEBP). Upload bloqueado por segurança.',
      };
    }

    const detectedMime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp';
    return {
      isValid: true,
      detectedMimeType: detectedMime,
    };
  } catch (err) {
    return {
      isValid: false,
      error: 'Falha na validação de segurança do arquivo.',
    };
  }
}

/**
 * Re-rasterizes and sanitizes image using HTML5 Canvas.
 * This completely strips away any metadata, malicious EXIF payloads or non-image chunks,
 * producing a pure, clean, compressed JPEG.
 * Fails safely if the image cannot be decoded by the browser.
 */
export function sanitizeAndCompressImage(
  file: File,
  maxWidth = 480,
  quality = 0.65
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // Validação prévia rigorosa
    const validation = await validateImageMagicBytes(file);
    if (!validation.isValid) {
      return reject(new Error(validation.error || 'Arquivo rejeitado por segurança.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'));
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result;
      if (typeof rawDataUrl !== 'string') {
        return reject(new Error('Formato de dados inválido.'));
      }

      const img = new Image();
      img.onerror = () => {
        // SEGURANÇA CRÍTICA: Nunca retorna o payload bruto caso a imagem falhe na decodificação!
        reject(new Error('O arquivo não pôde ser decodificado como uma imagem válida.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width === 0 || height === 0) {
            return reject(new Error('Dimensões da imagem inválidas.'));
          }

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Não foi possível inicializar contexto gráfico seguro.'));
          }

          // Fundo neutro limpo
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Exporta exclusivamente como JPEG rasterizado limpo
          const cleanJpegDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(cleanJpegDataUrl);
        } catch (err) {
          reject(new Error('Falha no processamento seguro da imagem.'));
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}
