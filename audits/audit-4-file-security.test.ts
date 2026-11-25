import { describe, it, expect } from 'vitest';
import {
  validateImageMagicBytes,
  MAX_ALLOWED_FILE_SIZE_BYTES,
} from '../frontend/src/security/file-security';

describe('Auditoria 4: Blindagem de Upload de Arquivos & Magic Bytes Armor', () => {
  it('CRITÉRIO 4.1: Rejeita arquivos que excedam o limite máximo de 5MB', async () => {
    const oversizedBlob = new Blob([new Uint8Array(MAX_ALLOWED_FILE_SIZE_BYTES + 1024)], {
      type: 'image/jpeg',
    });
    const oversizedFile = new File([oversizedBlob], 'foto_gigante.jpg', {
      type: 'image/jpeg',
    });

    const result = await validateImageMagicBytes(oversizedFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('excede o limite máximo permitido de 5 MB');
  });

  it('CRITÉRIO 4.2: Rejeita MIME types inseguros (SVG, HTML, Executáveis) mesmo com extensão de imagem', async () => {
    // 1. Arquivo SVG (vetor com potencial script embutido)
    const svgBlob = new Blob(['<svg><script>alert(1)</script></svg>'], {
      type: 'image/svg+xml',
    });
    const svgFile = new File([svgBlob], 'logo.svg', { type: 'image/svg+xml' });
    const svgResult = await validateImageMagicBytes(svgFile);
    expect(svgResult.isValid).toBe(false);
    expect(svgResult.error).toContain('Formato não permitido');

    // 2. Arquivo HTML disfarçado
    const htmlBlob = new Blob(['<html><head><script>steal()</script></head></html>'], {
      type: 'text/html',
    });
    const htmlFile = new File([htmlBlob], 'relatorio.html', { type: 'text/html' });
    const htmlResult = await validateImageMagicBytes(htmlFile);
    expect(htmlResult.isValid).toBe(false);

    // 3. Executável Windows (PE/MZ)
    const exeBlob = new Blob([new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00])], {
      type: 'application/x-msdownload',
    });
    const exeFile = new File([exeBlob], 'malware.exe', { type: 'application/x-msdownload' });
    const exeResult = await validateImageMagicBytes(exeFile);
    expect(exeResult.isValid).toBe(false);
  });

  it('CRITÉRIO 4.3: Detecta e bloqueia arquivo executável renomeado para .png com MIME forçado (Spoofing de Extensão)', async () => {
    // Cabeçalho MZ (DOS/Windows Executable) renomeado com MIME type image/png
    const fakePngBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);
    const spoofedFile = new File([new Blob([fakePngBytes], { type: 'image/png' })], 'foto_real.png', {
      type: 'image/png',
    });

    const result = await validateImageMagicBytes(spoofedFile);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Assinatura binária do arquivo não corresponde a uma imagem válida');
  });

  it('CRITÉRIO 4.4: Valida com sucesso Magic Bytes de imagens autênticas (JPEG, PNG e WebP)', async () => {
    // 1. JPEG Autêntico (FF D8 FF E0 ...)
    const validJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48]);
    const jpegFile = new File([new Blob([validJpegBytes], { type: 'image/jpeg' })], 'foto.jpg', {
      type: 'image/jpeg',
    });
    const jpegRes = await validateImageMagicBytes(jpegFile);
    expect(jpegRes.isValid).toBe(true);
    expect(jpegRes.detectedMimeType).toBe('image/jpeg');

    // 2. PNG Autêntico (89 50 4E 47 0D 0A 1A 0A ...)
    const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const pngFile = new File([new Blob([validPngBytes], { type: 'image/png' })], 'imagem.png', {
      type: 'image/png',
    });
    const pngRes = await validateImageMagicBytes(pngFile);
    expect(pngRes.isValid).toBe(true);
    expect(pngRes.detectedMimeType).toBe('image/png');

    // 3. WebP Autêntico (RIFF .... WEBP)
    const validWebpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
    const webpFile = new File([new Blob([validWebpBytes], { type: 'image/webp' })], 'banner.webp', {
      type: 'image/webp',
    });
    const webpRes = await validateImageMagicBytes(webpFile);
    expect(webpRes.isValid).toBe(true);
    expect(webpRes.detectedMimeType).toBe('image/webp');
  });
});
