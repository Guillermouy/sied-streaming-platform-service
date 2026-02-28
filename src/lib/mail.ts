import { Resend } from 'resend';

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resend = new Resend(apiKey);
  return resend;
}

interface RegistrationEmailData {
  to: string;
  firstName: string;
  lastName: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  eventTimezone: string;
  eventSpeakers: string;
  eventUrl: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const emailStyles = {
  body: "margin:0;padding:0;background-color:#070d1f;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;",
  outer:
    'background-color:#070d1f;padding:28px 12px;background-image:radial-gradient(circle at 10% 8%, rgba(49,61,136,0.65) 0%, rgba(49,61,136,0) 42%),radial-gradient(circle at 90% 14%, rgba(31,126,162,0.56) 0%, rgba(31,126,162,0) 38%),radial-gradient(circle at 50% 100%, rgba(63,38,111,0.62) 0%, rgba(63,38,111,0) 44%);',
  container:
    'max-width:620px;width:100%;background-color:#111a33;border:1px solid rgba(189,204,255,0.2);border-radius:20px;overflow:hidden;box-shadow:0 28px 60px rgba(3,8,27,0.45);',
  header:
    'padding:28px 28px 22px;background-color:#101937;border-bottom:1px solid rgba(189,204,255,0.22);text-align:left;',
  headerBadge:
    'display:inline-block;padding:6px 12px;border-radius:999px;background-color:rgba(52,214,201,0.14);border:1px solid rgba(52,214,201,0.45);color:#73efe5;font-size:11px;line-height:1;font-weight:700;letter-spacing:.08em;text-transform:uppercase;',
  headerTitle:
    'margin:14px 0 0;color:#f2f6ff;font-size:22px;line-height:1.2;font-weight:700;letter-spacing:.02em;',
  headerSubtitle: 'margin:6px 0 0;color:#c1cae0;font-size:13px;line-height:1.5;',
  content: 'padding:28px;',
  h2: 'margin:0 0 10px;color:#f2f6ff;font-size:24px;line-height:1.2;font-weight:700;',
  paragraph: 'margin:0 0 20px;color:#c1cae0;font-size:15px;line-height:1.7;',
  card:
    'margin:0 0 22px;background:linear-gradient(165deg, rgba(30,45,86,0.88) 0%, rgba(17,26,51,0.75) 100%);border:1px solid rgba(189,204,255,0.22);border-radius:14px;',
  cardInner: 'padding:20px;',
  cardTitle: 'margin:0 0 14px;color:#f2f6ff;font-size:18px;line-height:1.3;font-weight:650;',
  label:
    'padding:5px 0;color:#95a4c8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;width:106px;',
  value: 'padding:5px 0;color:#f2f6ff;font-size:14px;line-height:1.5;',
  primaryButton:
    'display:inline-block;background:linear-gradient(135deg,#6d7eff 0%,#34d6c9 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:10px;',
  secondaryButton:
    'display:inline-block;background-color:rgba(189,204,255,0.12);border:1px solid rgba(189,204,255,0.3);color:#f2f6ff;font-size:14px;font-weight:700;text-decoration:none;padding:11px 24px;border-radius:10px;',
  footer:
    'padding:18px 28px;background-color:#0a1022;border-top:1px solid rgba(189,204,255,0.2);color:#95a4c8;font-size:12px;line-height:1.6;text-align:center;',
};

function buildEventDetailsRows(data: {
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  eventTimezone: string;
  eventSpeakers: string;
}): string {
  return `
    <tr>
      <td style="${emailStyles.label}">Fecha</td>
      <td style="${emailStyles.value}">${formatDate(data.eventDate)}</td>
    </tr>
    <tr>
      <td style="${emailStyles.label}">Horario</td>
      <td style="${emailStyles.value}">${data.eventStartTime} - ${data.eventEndTime} (${data.eventTimezone})</td>
    </tr>
    <tr>
      <td style="${emailStyles.label}">Expositores</td>
      <td style="${emailStyles.value}">${data.eventSpeakers}</td>
    </tr>
  `;
}

function buildHtml(data: RegistrationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${emailStyles.body}">
  <table width="100%" cellpadding="0" cellspacing="0" style="${emailStyles.outer}">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="${emailStyles.container}">
          <tr>
            <td style="${emailStyles.header}">
              <span style="${emailStyles.headerBadge}">SIED Streaming</span>
              <h1 style="${emailStyles.headerTitle}">Sociedad Interamericana de Endoscopia Digestiva</h1>
              <p style="${emailStyles.headerSubtitle}">Confirmacion de registro</p>
            </td>
          </tr>
          <tr>
            <td style="${emailStyles.content}">
              <h2 style="${emailStyles.h2}">Registro confirmado</h2>
              <p style="${emailStyles.paragraph}">
                Hola <strong style="color:#f2f6ff;">${data.firstName}</strong>, tu registro al evento fue exitoso.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="${emailStyles.card}">
                <tr>
                  <td style="${emailStyles.cardInner}">
                    <h3 style="${emailStyles.cardTitle}">${data.eventTitle}</h3>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      ${buildEventDetailsRows(data)}
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <a href="${data.eventUrl}/live" style="${emailStyles.primaryButton}">
                      Acceder a la transmisi&oacute;n en vivo
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${data.eventUrl}" style="${emailStyles.secondaryButton}">
                      Ver detalles del evento
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;color:#95a4c8;font-size:13px;line-height:1.65;text-align:center;">
                El d&iacute;a del evento, ingres&aacute; al bot&oacute;n principal para ver la transmisi&oacute;n en vivo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="${emailStyles.footer}">
              <p style="margin:0;">
                &copy; ${new Date().getFullYear()} SIED - Sociedad Interamericana de Endoscopia Digestiva
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

function buildText(data: RegistrationEmailData): string {
  return `¡Registro confirmado!

Hola ${data.firstName}, te confirmamos que tu registro al siguiente evento fue exitoso.

${data.eventTitle}
Fecha: ${formatDate(data.eventDate)}
Horario: ${data.eventStartTime} – ${data.eventEndTime} (${data.eventTimezone})
Expositores: ${data.eventSpeakers}

Acceder a la transmisión en vivo: ${data.eventUrl}/live
Ver detalles del evento: ${data.eventUrl}

El día del evento, ingresá al primer enlace para ver la transmisión en vivo.

SIED — Sociedad Interamericana de Endoscopía Digestiva`;
}

interface AccessEmailData {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
  eventTimezone: string;
  eventSpeakers: string;
  liveUrl: string;
  eventUrl: string;
}

function buildAccessHtml(data: AccessEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="${emailStyles.body}">
  <table width="100%" cellpadding="0" cellspacing="0" style="${emailStyles.outer}">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="${emailStyles.container}">
          <tr>
            <td style="${emailStyles.header}">
              <span style="${emailStyles.headerBadge}">SIED Streaming</span>
              <h1 style="${emailStyles.headerTitle}">Sociedad Interamericana de Endoscopia Digestiva</h1>
              <p style="${emailStyles.headerSubtitle}">Acceso al evento en vivo</p>
            </td>
          </tr>
          <tr>
            <td style="${emailStyles.content}">
              <h2 style="${emailStyles.h2}">Tu acceso al evento</h2>
              <p style="${emailStyles.paragraph}">
                Hola <strong style="color:#f2f6ff;">${data.firstName}</strong>, aqui tienes el enlace para acceder a la transmision en vivo.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="${emailStyles.card}">
                <tr>
                  <td style="${emailStyles.cardInner}">
                    <h3 style="${emailStyles.cardTitle}">${data.eventTitle}</h3>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      ${buildEventDetailsRows(data)}
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <a href="${data.liveUrl}" style="${emailStyles.primaryButton}">
                      Acceder a la transmision
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${data.eventUrl}" style="${emailStyles.secondaryButton}">
                      Ver detalles del evento
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;color:#95a4c8;font-size:13px;line-height:1.65;text-align:center;">
                Ingresa al boton principal el dia del evento para iniciar la transmision en vivo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="${emailStyles.footer}">
              <p style="margin:0;">
                &copy; ${new Date().getFullYear()} SIED - Sociedad Interamericana de Endoscopia Digestiva
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

function buildAccessText(data: AccessEmailData): string {
  return `Tu acceso al evento

Hola ${data.firstName}, aquí tenés el enlace para acceder a la transmisión en vivo del evento.

${data.eventTitle}
Fecha: ${formatDate(data.eventDate)}
Horario: ${data.eventStartTime} – ${data.eventEndTime} (${data.eventTimezone})
Expositores: ${data.eventSpeakers}

Acceder a la transmisión: ${data.liveUrl}
Ver detalles del evento: ${data.eventUrl}

Hacé clic en el enlace el día del evento para ver la transmisión en vivo.

SIED — Sociedad Interamericana de Endoscopía Digestiva`;
}

export async function sendAccessEmail(data: AccessEmailData): Promise<void> {
  const client = getClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@siedonline.org';

  if (!client) {
    console.warn('[mail] RESEND_API_KEY not set, skipping email');
    return;
  }

  try {
    await client.emails.send({
      from: `SIED <${fromEmail}>`,
      to: data.to,
      subject: `Tu acceso: ${data.eventTitle}`,
      text: buildAccessText(data),
      html: buildAccessHtml(data),
    });
    console.log(`[mail] Access email sent to ${data.to}`);
  } catch (err) {
    console.error('[mail] Failed to send access email:', err);
  }
}

export async function sendRegistrationEmail(data: RegistrationEmailData): Promise<void> {
  const client = getClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@siedonline.org';

  if (!client) {
    console.warn('[mail] RESEND_API_KEY not set, skipping email');
    return;
  }

  try {
    await client.emails.send({
      from: `SIED <${fromEmail}>`,
      to: data.to,
      subject: `Registro confirmado: ${data.eventTitle}`,
      text: buildText(data),
      html: buildHtml(data),
    });
    console.log(`[mail] Registration email sent to ${data.to}`);
  } catch (err) {
    console.error('[mail] Failed to send registration email:', err);
  }
}
