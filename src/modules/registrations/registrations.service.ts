import type { AttendanceMode, Event, EventRegistration, User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { CreateRegistrationInput } from './registrations.schema';
import { AppError } from '../../middleware/error-handler';
import { sendRegistrationEmail, sendAccessEmail, type EventEmailData } from '../../lib/mail';
import { checkInUrl, generateCheckInCode } from '../../lib/checkinCode';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/** Modos de asistencia que ofrece el evento. */
function allowedModes(event: Event): AttendanceMode[] {
  if (event.modality === 'PRESENCIAL') return ['PRESENCIAL'];
  if (event.modality === 'HIBRIDO') return ['ONLINE', 'PRESENCIAL'];
  return ['ONLINE'];
}

/** Si el cliente no manda modo (frontend viejo), se usa el primero que ofrece el evento. */
function resolveMode(event: Event, requested?: AttendanceMode): AttendanceMode {
  const allowed = allowedModes(event);
  if (!requested) return allowed[0];
  if (!allowed.includes(requested)) {
    throw new AppError(
      400,
      requested === 'PRESENCIAL'
        ? 'Este evento no tiene modalidad presencial'
        : 'Este evento es solo presencial',
    );
  }
  return requested;
}

function emailData(
  event: Event,
  user: User,
  registration: Pick<EventRegistration, 'attendanceMode' | 'checkInCode'>,
): EventEmailData {
  const code = registration.attendanceMode === 'PRESENCIAL' ? registration.checkInCode : null;
  return {
    to: user.email,
    firstName: user.firstName,
    event,
    mode: registration.attendanceMode,
    eventUrl: `${APP_URL}/events/${event.id}`,
    liveUrl: `${APP_URL}/events/${event.id}/live/user/${user.id}`,
    checkInCode: code,
    qrContent: code ? checkInUrl(APP_URL, event.id, code) : null,
  };
}

/** Respuesta pública: nunca devolver el código de la entrada ni datos de otros. */
function publicRegistration(reg: EventRegistration) {
  return {
    id: reg.id,
    eventId: reg.eventId,
    attendanceMode: reg.attendanceMode,
    createdAt: reg.createdAt,
  };
}

/** Crea o actualiza la inscripción con un código de entrada único (reintenta ante colisión). */
async function withFreshCode<T>(fn: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fn(generateCheckInCode());
    } catch (err) {
      const isCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        String(err.meta?.target).includes('checkInCode');
      if (!isCodeCollision) throw err;
    }
  }
  throw new AppError(500, 'No se pudo generar el código de entrada');
}

export async function registerToEvent(eventId: string, data: CreateRegistrationInput) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');
  if (!event.registrationEnabled) {
    throw new AppError(400, 'El registro para este evento no está habilitado');
  }
  const mode = resolveMode(event, data.attendanceMode);

  const profile = {
    firstName: data.firstName,
    lastName: data.lastName,
    country: data.country,
    profile: data.profile,
    specialty: data.specialty ?? null,
    phoneCode: data.phoneCode,
    phoneNumber: data.phoneNumber,
  };
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: profile,
    create: { ...profile, email: data.email },
  });

  const existing = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
  });

  if (existing) {
    if (existing.attendanceMode === mode) {
      throw new AppError(
        409,
        'Ya estás registrado en este evento. Si no encontrás el email, usá "Ya me registré" para recibirlo de nuevo.',
      );
    }
    // Evento híbrido: cambia de modalidad (online <-> presencial).
    const updated =
      mode === 'PRESENCIAL'
        ? await withFreshCode((code) =>
            prisma.eventRegistration.update({
              where: { id: existing.id },
              data: { attendanceMode: 'PRESENCIAL', checkInCode: existing.checkInCode ?? code },
            }),
          )
        : await prisma.eventRegistration.update({
            where: { id: existing.id },
            data: { attendanceMode: 'ONLINE' },
          });
    sendRegistrationEmail(emailData(event, user, updated));
    return { ...publicRegistration(updated), modeChanged: true };
  }

  const registration =
    mode === 'PRESENCIAL'
      ? await withFreshCode((code) =>
          prisma.eventRegistration.create({
            data: {
              userId: user.id,
              eventId,
              privacyAccepted: data.privacyAccepted,
              attendanceMode: 'PRESENCIAL',
              checkInCode: code,
            },
          }),
        )
      : await prisma.eventRegistration.create({
          data: {
            userId: user.id,
            eventId,
            privacyAccepted: data.privacyAccepted,
            attendanceMode: 'ONLINE',
          },
        });

  sendRegistrationEmail(emailData(event, user, registration));
  return publicRegistration(registration);
}

export async function resendAccessLink(eventId: string, email: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    ?? await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!user) {
    throw new AppError(404, 'No encontramos un registro con ese email');
  }

  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
  });
  if (!registration) {
    throw new AppError(404, 'No encontramos un registro con ese email para este evento');
  }

  try {
    await sendAccessEmail(emailData(event, user, registration));
  } catch (err) {
    console.error('[mail] resend access failed:', err);
    throw new AppError(502, 'No pudimos enviar el email. Probá de nuevo en unos minutos.');
  }
  return { success: true, attendanceMode: registration.attendanceMode };
}

export async function sendAccessToAllRegistrants(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId },
    include: { user: true },
  });
  if (registrations.length === 0) {
    throw new AppError(400, 'No hay inscriptos para este evento');
  }

  // Resend limita a ~2 envíos por segundo: espaciamos los envíos y reintentamos una vez.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let sent = 0;
  let failed = 0;
  for (const reg of registrations) {
    const payload = emailData(event, reg.user, reg);
    try {
      await sendAccessEmail(payload);
      sent++;
    } catch {
      await sleep(1500);
      try {
        await sendAccessEmail(payload);
        sent++;
      } catch (err) {
        console.error(`[mail] send-access-all failed for ${reg.user.email}:`, err);
        failed++;
      }
    }
    await sleep(600);
  }
  return { total: registrations.length, sent, failed };
}

export async function getEventRegistrations(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');

  return prisma.eventRegistration.findMany({
    where: { eventId },
    include: { user: true, checkIns: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
}
