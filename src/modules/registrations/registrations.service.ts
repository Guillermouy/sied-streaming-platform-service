import { prisma } from '../../lib/prisma';
import { CreateRegistrationInput } from './registrations.schema';
import { AppError } from '../../middleware/error-handler';
import { sendRegistrationEmail } from '../../lib/mail';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

export async function registerToEvent(
  eventId: string,
  data: CreateRegistrationInput,
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');
  if (!event.registrationEnabled) {
    throw new AppError(400, 'El registro para este evento no está habilitado');
  }

  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      country: data.country,
    },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      country: data.country,
    },
  });

  const existing = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
  });

  if (existing) {
    throw new AppError(409, 'Ya estás registrado en este evento');
  }

  const registration = await prisma.eventRegistration.create({
    data: {
      userId: user.id,
      eventId,
      privacyAccepted: data.privacyAccepted,
    },
    include: { user: true, event: true },
  });

  sendRegistrationEmail({
    to: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    eventTitle: event.title,
    eventDate: event.date.toISOString(),
    eventStartTime: event.startTime,
    eventEndTime: event.endTime,
    eventTimezone: event.timezone,
    eventSpeakers: event.speakers,
    eventUrl: `${APP_URL}/events/${event.id}`,
  });

  return registration;
}

export async function getEventRegistrations(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');

  return prisma.eventRegistration.findMany({
    where: { eventId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });
}
