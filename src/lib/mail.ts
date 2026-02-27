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

function buildHtml(data: RegistrationEmailData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1B4965;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">SIED</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Sociedad Interamericana de Endoscopía Digestiva</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;">
              <h2 style="margin:0 0 8px;color:#1E293B;font-size:20px;font-weight:700;">¡Registro confirmado!</h2>
              <p style="margin:0 0 24px;color:#64748B;font-size:15px;line-height:1.6;">
                Hola <strong style="color:#1E293B;">${data.firstName}</strong>, te confirmamos que tu registro al siguiente evento fue exitoso.
              </p>

              <!-- Event card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <h3 style="margin:0 0 16px;color:#1B4965;font-size:18px;font-weight:700;">${data.eventTitle}</h3>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:100px;vertical-align:top;">Fecha</td>
                        <td style="padding:6px 0;color:#1E293B;font-size:14px;">${formatDate(data.eventDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top;">Horario</td>
                        <td style="padding:6px 0;color:#1E293B;font-size:14px;">${data.eventStartTime} – ${data.eventEndTime} (${data.eventTimezone})</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top;">Expositores</td>
                        <td style="padding:6px 0;color:#1E293B;font-size:14px;">${data.eventSpeakers}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${data.eventUrl}" style="display:inline-block;background-color:#1B4965;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Ver evento
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#94A3B8;font-size:13px;line-height:1.6;text-align:center;">
                El día del evento, ingresá al link de arriba para acceder a la transmisión en vivo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0F2D40;padding:20px 32px;border-radius:0 0 12px 12px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;">
                &copy; ${new Date().getFullYear()} SIED — Sociedad Interamericana de Endoscopía Digestiva
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

Accedé al evento: ${data.eventUrl}

El día del evento, ingresá al link para acceder a la transmisión en vivo.

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
<body style="margin:0;padding:0;background-color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f7fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1B4965;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">SIED</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Sociedad Interamericana de Endoscopía Digestiva</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;">
              <h2 style="margin:0 0 8px;color:#1E293B;font-size:20px;font-weight:700;">Tu acceso al evento</h2>
              <p style="margin:0 0 24px;color:#64748B;font-size:15px;line-height:1.6;">
                Hola <strong style="color:#1E293B;">${data.firstName}</strong>, aquí tenés el enlace para acceder a la transmisión en vivo del evento.
              </p>

              <!-- Event card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <h3 style="margin:0 0 16px;color:#1B4965;font-size:18px;font-weight:700;">${data.eventTitle}</h3>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:100px;vertical-align:top;">Fecha</td>
                        <td style="padding:6px 0;color:#1E293B;font-size:14px;">${formatDate(data.eventDate)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top;">Horario</td>
                        <td style="padding:6px 0;color:#1E293B;font-size:14px;">${data.eventStartTime} – ${data.eventEndTime} (${data.eventTimezone})</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top;">Expositores</td>
                        <td style="padding:6px 0;color:#1E293B;font-size:14px;">${data.eventSpeakers}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <a href="${data.liveUrl}" style="display:inline-block;background-color:#C0392B;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      &#9654;&nbsp; Acceder a la transmisión
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${data.eventUrl}" style="display:inline-block;background-color:#1B4965;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">
                      Ver detalles del evento
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#94A3B8;font-size:13px;line-height:1.6;text-align:center;">
                Hacé clic en el botón de arriba el día del evento para ver la transmisión en vivo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0F2D40;padding:20px 32px;border-radius:0 0 12px 12px;text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px;">
                &copy; ${new Date().getFullYear()} SIED — Sociedad Interamericana de Endoscopía Digestiva
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
