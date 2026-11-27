// Traducción automática de mensajes del chat con DeepL.
// Si no hay DEEPL_API_KEY la función queda desactivada y el chat funciona igual (sin traducción).
// Nunca lanza errores: ante cualquier falla devuelve null y se muestra el mensaje original.

export type ChatLang = 'es' | 'en';

export interface ChatTranslation {
  sourceLang: string; // idioma detectado, en minúsculas: "es", "en", "pt", ...
  contentEs: string | null;
  contentEn: string | null;
}

const TIMEOUT_MS = 4000;
// El cliente limita a 500 caracteres, pero `chat:send` es público: se valida también acá
// para no gastar la cuota con mensajes enviados por fuera de la web.
const MAX_CHARS = 500;
const CONTEXT =
  'Live chat of a medical webinar on digestive endoscopy and gastroenterology. ' +
  'Messages are short questions and comments from doctors.';

const TARGET_CODE: Record<ChatLang, string> = {
  es: 'ES-419', // español latinoamericano
  en: 'EN-US',
};

// Si DeepL responde que se agotó la cuota (456) o hay demasiadas solicitudes (429),
// se pausa la traducción un rato para no insistir con cada mensaje.
let pausedUntil = 0;

function getApiKey(): string | null {
  return process.env.DEEPL_API_KEY?.trim() || null;
}

function getEndpoint(apiKey: string): string {
  // Las keys del plan gratuito terminan en ":fx" y usan otro dominio.
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

/** Mensajes que no vale la pena traducir: sin letras (emojis, números, "!!!") o de una sola letra. */
function isTranslatable(text: string): boolean {
  const letters = text.match(/\p{L}/gu);
  return !!letters && letters.length >= 2;
}

/** Texto en minúsculas, sin acentos, signos ni espacios extra (para comparar original y traducción). */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

async function callDeepL(
  apiKey: string,
  text: string,
  target: ChatLang,
  sourceLang?: string,
): Promise<{ text: string; detected: string } | null> {
  const body: Record<string, unknown> = {
    text: [text],
    target_lang: TARGET_CODE[target],
    context: CONTEXT,
  };
  if (sourceLang) body.source_lang = sourceLang.toUpperCase();

  const res = await fetch(getEndpoint(apiKey), {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 456 || res.status === 429) {
    const pauseMin = res.status === 456 ? 30 : 1;
    pausedUntil = Date.now() + pauseMin * 60_000;
    console.warn(
      `[translate] DeepL respondió ${res.status} (${res.status === 456 ? 'cuota agotada' : 'demasiadas solicitudes'}); ` +
        `traducción pausada ${pauseMin} min`,
    );
    return null;
  }
  if (!res.ok) {
    console.warn(`[translate] DeepL respondió ${res.status}`);
    return null;
  }

  const data = (await res.json()) as {
    translations?: { text: string; detected_source_language: string }[];
  };
  const t = data.translations?.[0];
  if (!t) return null;
  return { text: t.text, detected: t.detected_source_language.toLowerCase() };
}

/**
 * Traduce un mensaje a español e inglés (salvo al idioma en que ya está escrito).
 * `hint` es el idioma que eligió quien escribe: se usa para adivinar el idioma original
 * y así, en el caso típico, resolverlo con una sola llamada a DeepL.
 */
export async function translateChatMessage(
  text: string,
  hint: ChatLang = 'es',
): Promise<ChatTranslation | null> {
  const apiKey = getApiKey();
  if (!apiKey || Date.now() < pausedUntil) return null;
  if (!text || text.length > MAX_CHARS || !isTranslatable(text)) return null;

  try {
    const result: ChatTranslation = { sourceLang: '', contentEs: null, contentEn: null };

    // 1) Traducir al idioma "opuesto" al que eligió quien escribe; DeepL detecta el original.
    const firstTarget: ChatLang = hint === 'en' ? 'es' : 'en';
    const first = await callDeepL(apiKey, text, firstTarget);
    if (!first) return null;

    // DeepL devuelve variantes como "en" o "pt"; nos quedamos con el código base.
    const source = first.detected.split('-')[0];
    result.sourceLang = source;
    if (source !== firstTarget) {
      if (firstTarget === 'es') result.contentEs = first.text;
      else result.contentEn = first.text;
    }

    // 2) Si falta el otro idioma (y el original no está en él), una segunda llamada,
    //    indicando el idioma de origen para no volver a detectarlo.
    const other: ChatLang = firstTarget === 'es' ? 'en' : 'es';
    if (source !== other) {
      const second = await callDeepL(apiKey, text, other, source);
      if (second) {
        if (other === 'es') result.contentEs = second.text;
        else result.contentEn = second.text;
      }
    }

    // DeepL a veces devuelve prácticamente el mismo texto (nombres propios, siglas, o mensajes
    // cortos mal detectados como "Excelente!" → "¡Excelente!"): eso no es una traducción.
    const original = normalize(text);
    if (result.contentEs && normalize(result.contentEs) === original) result.contentEs = null;
    if (result.contentEn && normalize(result.contentEn) === original) result.contentEn = null;

    return result;
  } catch (err) {
    console.warn('[translate] Error al traducir:', err instanceof Error ? err.message : err);
    return null;
  }
}
