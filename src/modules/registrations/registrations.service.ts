import { prisma } from '../../lib/prisma';
import { CreateRegistrationInput } from './registrations.schema';
import { AppError } from '../../middleware/error-handler';
import { sendRegistrationEmail, sendAccessEmail } from '../../lib/mail';

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
      profile: data.profile,
      specialty: data.specialty ?? null,
      phoneCode: data.phoneCode,
      phoneNumber: data.phoneNumber,
    },
    create: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      country: data.country,
      profile: data.profile,
      specialty: data.specialty ?? null,
      phoneCode: data.phoneCode,
      phoneNumber: data.phoneNumber,
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

export async function resendAccessLink(eventId: string, email: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new AppError(404, 'Evento no encontrado');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, 'No encontramos un registro con ese email');
  }

  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId: user.id, eventId } },
  });

  if (!registration) {
    throw new AppError(404, 'No encontramos un registro con ese email para este evento');
  }

  await sendAccessEmail({
    to: email,
    firstName: user.firstName,
    eventTitle: event.title,
    eventDate: event.date.toISOString(),
    eventStartTime: event.startTime,
    eventEndTime: event.endTime,
    eventTimezone: event.timezone,
    eventSpeakers: event.speakers,
    liveUrl: `${APP_URL}/events/${event.id}/live`,
    eventUrl: `${APP_URL}/events/${event.id}`,
  });

  return { success: true };
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
