import { Resend } from 'resend';
import {
  formatEventDateRange,
  googleCalendarUrl,
  timezoneLabel,
} from './eventTime';
import { checkInQrPng, formatCheckInCode } from './checkinCode';

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resend = new Resend(apiKey);
  return resend;
}

const APP_URL = () => process.env.APP_URL || 'http://localhost:5173';
const FROM = () => `SIED <${process.env.RESEND_FROM_EMAIL || 'no-reply@siedonline.org'}>`;
const QR_CID = 'entrada-sied-qr';

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export interface MailEvent {
  id: string;
  title: string;
  date: Date;
  endDate: Date | null;
  startTime: string;
  endTime: string;
  timezone: string;
  speakers: string;
  modality: 'ONLINE' | 'PRESENCIAL' | 'HIBRIDO';
  venueName: string | null;
  venueAddress: string | null;
}

export interface EventEmailData {
  to: string;
  firstName: string;
  event: MailEvent;
  mode: 'ONLINE' | 'PRESENCIAL';
  eventUrl: string;
  liveUrl: string;
  /** Solo presencial: código de la entrada y contenido del QR. */
  checkInCode?: string | null;
  qrContent?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Helpers de plantilla (HTML para clientes de email: tablas + estilos inline)
// ─────────────────────────────────────────────────────────────

const C = {
  bg: '#eef3f9',
  card: '#ffffff',
  navy: '#2f4a86',
  navyDark: '#1d3263',
  blue: '#1f5fae',
  sky: '#00aeef',
  text: '#1a2238',
  muted: '#4a5674',
  soft: '#6b7894',
  line: '#dbe4f0',
  panel: '#f4f8fd',
  panelLine: '#d6e6f5',
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Botón "a prueba de Outlook": color sólido en la celda y en el link. */
function button(href: string, label: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const primary = variant === 'primary';
  const bg = primary ? C.blue : '#ffffff';
  const color = primary ? '#ffffff' : C.blue;
  const border = primary ? C.blue : C.panelLine;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="${bg}" style="background-color:${bg};border:1px solid ${border};border-radius:10px;">
        <a href="${escapeHtml(href)}" target="_blank"
           style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;color:${color};text-decoration:none;border-radius:10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function detailRow(label: string, valueHtml: string): string {
  return `
  <tr>
    <td valign="top" style="padding:7px 12px 7px 0;width:104px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${C.soft};">${label}</td>
    <td valign="top" style="padding:7px 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.text};">${valueHtml}</td>
  </tr>`;
}

function mapsUrl(event: MailEvent): string {
  const q = [event.venueName, event.venueAddress].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function eventCard(event: MailEvent, opts: { showVenue: boolean }): string {
  const rows = [
    detailRow('Fecha', escapeHtml(formatEventDateRange(event.date, event.endDate))),
    detailRow(
      'Horario',
      `${escapeHtml(event.startTime)} a ${escapeHtml(event.endTime)} <span style="color:${C.soft};">(${escapeHtml(timezoneLabel(event.timezone))})</span>`,
    ),
    detailRow('Expositores', escapeHtml(event.speakers)),
  ];
  if (opts.showVenue && (event.venueName || event.venueAddress)) {
    const venue = [
      event.venueName ? `<strong>${escapeHtml(event.venueName)}</strong>` : '',
      event.venueAddress ? escapeHtml(event.venueAddress) : '',
    ]
      .filter(Boolean)
      .join('<br>');
    rows.push(
      detailRow(
        'Lugar',
        `${venue}<br><a href="${escapeHtml(mapsUrl(event))}" target="_blank" style="color:${C.blue};font-weight:600;text-decoration:underline;">Ver en el mapa</a>`,
      ),
    );
  }
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:${C.panel};border:1px solid ${C.panelLine};border-radius:12px;">
    <tr>
      <td style="padding:20px 22px;">
        <p style="margin:0 0 12px;font-family:${FONT};font-size:19px;line-height:1.35;font-weight:700;color:${C.navyDark};">${escapeHtml(event.title)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>
      </td>
    </tr>
  </table>`;
}

function calendarLink(event: MailEvent, mode: 'ONLINE' | 'PRESENCIAL', eventUrl: string): string {
  const location =
    mode === 'PRESENCIAL'
      ? [event.venueName, event.venueAddress].filter(Boolean).join(', ') || eventUrl
      : eventUrl;
  const url = googleCalendarUrl({
    title: `${event.title} — SIED`,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    timezone: event.timezone,
    details: `Más información: ${eventUrl}`,
    location,
  });
  return `<a href="${escapeHtml(url)}" target="_blank" style="color:${C.blue};font-weight:600;text-decoration:underline;">Agregar a Google Calendar</a>`;
}

function paragraph(html: string, extra = ''): string {
  return `<p style="margin:0 0 18px;font-family:${FONT};font-size:16px;line-height:1.65;color:${C.muted};${extra}">${html}</p>`;
}

function note(html: string): string {
  return `<p style="margin:18px 0 0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.soft};text-align:center;">${html}</p>`;
}

/** Bloque del QR para la entrada presencial (imagen embebida + código en texto). */
function qrBlock(code: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="margin:4px 0 22px;background-color:#ffffff;border:2px dashed ${C.panelLine};border-radius:14px;">
    <tr>
      <td align="center" style="padding:24px 16px 20px;">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.soft};">Tu entrada presencial</p>
        <img src="cid:${QR_CID}" width="220" height="220" alt="Código QR de tu entrada"
             style="display:block;margin:10px auto 12px;width:220px;height:220px;border:0;">
        <p style="margin:0;font-family:'SFMono-Regular',Consolas,'Courier New',monospace;font-size:24px;font-weight:700;letter-spacing:.14em;color:${C.navyDark};">${escapeHtml(formatCheckInCode(code))}</p>
        <p style="margin:10px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.muted};">
          Mostrá este QR en la acreditación (desde el celular o impreso).<br>
          Si el QR no se puede escanear, presentá el código que figura arriba.
        </p>
      </td>
    </tr>
  </table>`;
}

function layout(opts: {
  preheader: string;
  kicker: string;
  heading: string;
  body: string;
  footerNote: string;
}): string {
  const logoUrl = `${APP_URL()}/email/logo-sied.png`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(opts.heading)}</title>
  <style>
    @media (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .heading { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background-color:${C.bg};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:600px;background-color:${C.card};border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
          <!-- Marca -->
          <tr>
            <td class="px" style="padding:22px 32px;border-top:5px solid ${C.sky};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:14px;">
                    <img src="${escapeHtml(logoUrl)}" width="64" height="45" alt="SIED" style="display:block;width:64px;height:auto;border:0;">
                  </td>
                  <td valign="middle" style="font-family:${FONT};font-size:14px;line-height:1.35;font-weight:700;color:${C.navyDark};">
                    Sociedad Interamericana de<br>Endoscopía Digestiva
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Encabezado -->
          <tr>
            <td class="px" bgcolor="${C.navy}" style="background-color:${C.navy};padding:26px 32px;">
              <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9fd8f5;">${escapeHtml(opts.kicker)}</p>
              <h1 class="heading" style="margin:0;font-family:${FONT};font-size:28px;line-height:1.2;font-weight:800;color:#ffffff;">${escapeHtml(opts.heading)}</h1>
            </td>
          </tr>
          <!-- Contenido -->
          <tr>
            <td class="px" style="padding:28px 32px 32px;">
              ${opts.body}
            </td>
          </tr>
          <!-- Pie -->
          <tr>
            <td class="px" style="padding:20px 32px;background-color:${C.panel};border-top:1px solid ${C.line};">
              <p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.soft};">${opts.footerNote}</p>
              <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.soft};">
                &copy; ${new Date().getFullYear()} SIED &mdash; Sociedad Interamericana de Endoscopía Digestiva
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// Plantillas
// ─────────────────────────────────────────────────────────────

type Built = { subject: string; html: string; text: string; withQr: boolean };

function plainDetails(event: MailEvent, showVenue: boolean): string {
  const lines = [
    event.title,
    `Fecha: ${formatEventDateRange(event.date, event.endDate)}`,
    `Horario: ${event.startTime} a ${event.endTime} (${timezoneLabel(event.timezone)})`,
    `Expositores: ${event.speakers}`,
  ];
  if (showVenue && (event.venueName || event.venueAddress)) {
    lines.push(`Lugar: ${[event.venueName, event.venueAddress].filter(Boolean).join(', ')}`);
  }
  return lines.join('\n');
}

/** Email online: confirmación de registro (kind=registration) o reenvío del acceso (kind=access). */
function buildOnline(data: EventEmailData, kind: 'registration' | 'access'): Built {
  const { event } = data;
  const isRegistration = kind === 'registration';
  const heading = isRegistration ? 'Registro confirmado' : 'Tu acceso a la transmisión';
  const intro = isRegistration
    ? `Hola <strong style="color:${C.text};">${escapeHtml(data.firstName)}</strong>, tu registro fue exitoso. Te esperamos en la transmisión en vivo.`
    : `Hola <strong style="color:${C.text};">${escapeHtml(data.firstName)}</strong>, este es tu enlace personal para ver la transmisión en vivo.`;

  const body = `
    ${paragraph(intro)}
    ${eventCard(event, { showVenue: false })}
    <div style="height:24px;line-height:24px;">&nbsp;</div>
    ${button(data.liveUrl, 'Ver la transmisión en vivo')}
    <div style="height:12px;line-height:12px;">&nbsp;</div>
    ${button(data.eventUrl, 'Ver detalles del evento', 'secondary')}
    ${note(`El día del evento usá el botón azul: es tu enlace personal, no lo compartas.<br>${calendarLink(event, 'ONLINE', data.eventUrl)}`)}`;

  return {
    subject: isRegistration ? `Registro confirmado: ${event.title}` : `Tu acceso: ${event.title}`,
    withQr: false,
    html: layout({
      preheader: `${event.title} · ${formatEventDateRange(event.date, event.endDate)}`,
      kicker: 'Evento online',
      heading,
      body,
      footerNote: 'Recibiste este email porque te registraste en un evento de SIED.',
    }),
    text: `${heading}

Hola ${data.firstName}, ${isRegistration ? 'tu registro fue exitoso.' : 'este es tu enlace personal para ver la transmisión en vivo.'}

${plainDetails(event, false)}

Ver la transmisión en vivo (enlace personal): ${data.liveUrl}
Detalles del evento: ${data.eventUrl}

SIED — Sociedad Interamericana de Endoscopía Digestiva`,
  };
}

/** Email presencial: entrada con QR (sirve tanto para la confirmación como para el reenvío). */
function buildInPerson(data: EventEmailData, kind: 'registration' | 'access'): Built {
  const { event } = data;
  const code = data.checkInCode!;
  const isRegistration = kind === 'registration';
  const heading = isRegistration ? 'Tu entrada está confirmada' : 'Tu entrada al evento';
  const hybridNote =
    event.modality === 'HIBRIDO'
      ? note(
          `Si no podés asistir de forma presencial, también podés <a href="${escapeHtml(data.liveUrl)}" target="_blank" style="color:${C.blue};font-weight:600;text-decoration:underline;">seguirlo online</a> con tu enlace personal.`,
        )
      : '';

  const body = `
    ${paragraph(`Hola <strong style="color:${C.text};">${escapeHtml(data.firstName)}</strong>, ${isRegistration ? 'tu inscripción presencial fue confirmada.' : 'te reenviamos tu entrada presencial.'} Guardá este email: lo vas a necesitar para ingresar.`)}
    ${qrBlock(code)}
    ${eventCard(event, { showVenue: true })}
    <div style="height:24px;line-height:24px;">&nbsp;</div>
    ${button(data.eventUrl, 'Ver detalles del evento')}
    ${note(calendarLink(event, 'PRESENCIAL', data.eventUrl))}
    ${hybridNote}`;

  return {
    subject: isRegistration ? `Tu entrada: ${event.title}` : `Tu entrada (reenvío): ${event.title}`,
    withQr: true,
    html: layout({
      preheader: `Tu código de ingreso: ${formatCheckInCode(code)} · ${event.title}`,
      kicker: 'Entrada presencial',
      heading,
      body,
      footerNote: 'Esta entrada es personal. Recibiste este email porque te inscribiste de forma presencial en un evento de SIED.',
    }),
    text: `${heading}

Hola ${data.firstName}, ${isRegistration ? 'tu inscripción presencial fue confirmada.' : 'te reenviamos tu entrada presencial.'}

Tu código de ingreso: ${formatCheckInCode(code)}
Presentá el QR adjunto o este código en la acreditación.

${plainDetails(event, true)}

Detalles del evento: ${data.eventUrl}${event.modality === 'HIBRIDO' ? `\nSi no podés ir, seguilo online: ${data.liveUrl}` : ''}

SIED — Sociedad Interamericana de Endoscopía Digestiva`,
  };
}

export function buildEventEmail(data: EventEmailData, kind: 'registration' | 'access'): Built {
  return data.mode === 'PRESENCIAL' && data.checkInCode
    ? buildInPerson(data, kind)
    : buildOnline(data, kind);
}

// ─────────────────────────────────────────────────────────────
// Envío
// ─────────────────────────────────────────────────────────────

async function sendBuilt(to: string, built: Built, qrContent?: string | null): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn('[mail] RESEND_API_KEY not set, skipping email');
    return;
  }
  const attachments =
    built.withQr && qrContent
      ? [
          {
            filename: 'entrada-sied.png',
            content: await checkInQrPng(qrContent),
            contentId: QR_CID,
          },
        ]
      : undefined;

  const { error } = await client.emails.send({
    from: FROM(),
    to,
    subject: built.subject,
    text: built.text,
    html: built.html,
    attachments,
  });
  if (error) throw new Error(error.message);
}

/** Email al registrarse (online o entrada presencial con QR). No lanza errores. */
export async function sendRegistrationEmail(data: EventEmailData): Promise<void> {
  try {
    await sendBuilt(data.to, buildEventEmail(data, 'registration'), data.qrContent);
    console.log(`[mail] Registration email (${data.mode}) sent to ${data.to}`);
  } catch (err) {
    console.error('[mail] Failed to send registration email:', err);
  }
}

/** Reenvío del acceso / entrada. Lanza error si falla (lo usan el reenvío y el envío masivo). */
export async function sendAccessEmail(data: EventEmailData): Promise<void> {
  await sendBuilt(data.to, buildEventEmail(data, 'access'), data.qrContent);
  console.log(`[mail] Access email (${data.mode}) sent to ${data.to}`);
}

// ─────────────────────────────────────────────────────────────
// Curso disponible (lo usa otro flujo; mismo diseño)
// ─────────────────────────────────────────────────────────────

interface CourseAvailableEmailData {
  to: string;
  firstName: string;
  eventTitle: string;
  courseUrl: string;
}

export function buildCourseAvailableEmail(data: CourseAvailableEmailData): Built {
  const body = `
    ${paragraph(`Hola <strong style="color:${C.text};">${escapeHtml(data.firstName)}</strong>, las clases de hoy del curso al que te registraste ya están publicadas en la plataforma de cursos de SIED.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:${C.panel};border:1px solid ${C.panelLine};border-radius:12px;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0 0 6px;font-family:${FONT};font-size:19px;line-height:1.35;font-weight:700;color:${C.navyDark};">${escapeHtml(data.eventTitle)}</p>
        <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.muted};">Podés ver el contenido cuando quieras.</p>
      </td></tr>
    </table>
    <div style="height:24px;line-height:24px;">&nbsp;</div>
    ${button(data.courseUrl, 'Ir al curso')}
    ${note('Si tenés alguna consulta, respondé este email. ¡Buen aprendizaje!')}`;
  return {
    subject: 'Curso de Jóvenes Endoscopistas: las clases de hoy quedaron publicadas',
    withQr: false,
    html: layout({
      preheader: 'Las clases de hoy ya están disponibles',
      kicker: 'Curso SIED',
      heading: 'Las clases de hoy ya están publicadas',
      body,
      footerNote: 'Recibiste este email porque estás inscripto en un curso de SIED.',
    }),
    text: `Las clases de hoy ya están publicadas

Hola ${data.firstName}, las clases de hoy del curso al que te registraste ya están publicadas.

${data.eventTitle}

Ir al curso: ${data.courseUrl}

SIED — Sociedad Interamericana de Endoscopía Digestiva`,
  };
}

export async function sendCourseAvailableEmail(data: CourseAvailableEmailData): Promise<void> {
  try {
    await sendBuilt(data.to, buildCourseAvailableEmail(data));
    console.log(`[mail] Course-available email sent to ${data.to}`);
  } catch (err) {
    console.error('[mail] Failed to send course-available email:', err);
  }
}
