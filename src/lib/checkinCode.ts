import crypto from 'crypto';
import QRCode from 'qrcode';

// Sin caracteres ambiguos (0/O, 1/I/L) para poder dictarlo o tipearlo a mano.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export function generateCheckInCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

/** "ABCD2345" -> "ABCD-2345" (para mostrar). */
export function formatCheckInCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Acepta lo que venga del escáner o del teclado: la URL completa del QR,
 * el código con o sin guion, en minúsculas, con espacios.
 */
export function normalizeCheckInCode(input: string): string {
  let raw = input.trim();
  const fromUrl = raw.match(/[?&]code=([^&#\s]+)/i);
  if (fromUrl) raw = decodeURIComponent(fromUrl[1]);
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Contenido del QR: URL a la pantalla de acreditación del evento. */
export function checkInUrl(appUrl: string, eventId: string, code: string): string {
  return `${appUrl}/admin/events/${eventId}/checkin?code=${code}`;
}

export async function checkInQrPng(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    type: 'png',
    width: 480,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0b1d3f', light: '#ffffff' },
  });
}
