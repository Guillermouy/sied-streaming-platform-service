import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error-handler';
import { normalizeCheckInCode } from '../../lib/checkinCode';
import { todayInTimezone } from '../../lib/eventTime';

export type CheckInResult =
  | 'OK' // ingreso registrado ahora
  | 'ALREADY' // ya había ingresado hoy
  | 'OTHER_EVENT' // la entrada es de otro evento
  | 'NOT_FOUND' // código inexistente
  | 'NOT_IN_PERSON'; // la inscripción es online

const attendeeSelect = {
  firstName: true,
  lastName: true,
  email: true,
  country: true,
  profile: true,
  specialty: true,
} as const;

/**
 * Valida una entrada. Acepta `code` (lo que lee el escáner o se tipea) o
 * `registrationId` (acreditación manual desde la lista).
 */
export async function checkIn(eventId: string, input: { code?: string; registrationId?: string }) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');

  let registration;
  if (input.registrationId) {
    registration = await prisma.eventRegistration.findUnique({
      where: { id: input.registrationId },
      include: { user: { select: attendeeSelect }, event: { select: { id: true, title: true } } },
    });
  } else {
    const code = normalizeCheckInCode(input.code || '');
    if (code.length < 4) return { result: 'NOT_FOUND' as CheckInResult };
    registration = await prisma.eventRegistration.findUnique({
      where: { checkInCode: code },
      include: { user: { select: attendeeSelect }, event: { select: { id: true, title: true } } },
    });
  }

  if (!registration) return { result: 'NOT_FOUND' as CheckInResult };
  if (registration.eventId !== eventId) {
    return {
      result: 'OTHER_EVENT' as CheckInResult,
      attendee: registration.user,
      otherEventTitle: registration.event.title,
    };
  }
  if (registration.attendanceMode !== 'PRESENCIAL') {
    return { result: 'NOT_IN_PERSON' as CheckInResult, attendee: registration.user };
  }

  const day = todayInTimezone(event.timezone);
  try {
    const created = await prisma.checkIn.create({
      data: { registrationId: registration.id, day },
    });
    return {
      result: 'OK' as CheckInResult,
      attendee: registration.user,
      registrationId: registration.id,
      checkedInAt: created.createdAt,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await prisma.checkIn.findUnique({
        where: { registrationId_day: { registrationId: registration.id, day } },
      });
      return {
        result: 'ALREADY' as CheckInResult,
        attendee: registration.user,
        registrationId: registration.id,
        checkedInAt: existing?.createdAt ?? null,
      };
    }
    throw err;
  }
}

/** Deshace el ingreso de hoy (por si se acreditó a la persona equivocada). */
export async function undoCheckIn(eventId: string, registrationId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');
  const registration = await prisma.eventRegistration.findUnique({ where: { id: registrationId } });
  if (!registration || registration.eventId !== eventId) {
    throw new AppError(404, 'Inscripción no encontrada');
  }
  const day = todayInTimezone(event.timezone);
  const { count } = await prisma.checkIn.deleteMany({ where: { registrationId, day } });
  return { removed: count };
}
