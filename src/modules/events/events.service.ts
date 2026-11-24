import { prisma } from '../../lib/prisma';
import { CreateEventInput, UpdateEventInput } from './events.schema';

export async function createEvent(data: CreateEventInput) {
  return prisma.event.create({
    data: {
      ...data,
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
}

/** Cantidad de inscriptos presenciales por evento (para mostrar cupo). */
async function inPersonCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  const rows = await prisma.eventRegistration.groupBy({
    by: ['eventId'],
    where: { eventId: { in: eventIds }, attendanceMode: 'PRESENCIAL' },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.eventId, r._count._all]));
}

export async function listEvents() {
  const events = await prisma.event.findMany({
    orderBy: { date: 'desc' },
    include: { _count: { select: { registrations: true, viewerLogs: true } } },
  });
  const counts = await inPersonCounts(events.map((e) => e.id));
  return events.map((e) => ({ ...e, inPersonRegistered: counts.get(e.id) ?? 0 }));
}

export async function getEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true, viewerLogs: true } } },
  });
  if (!event) return null;
  const counts = await inPersonCounts([id]);
  return { ...event, inPersonRegistered: counts.get(id) ?? 0 };
}

export async function updateEvent(id: string, data: UpdateEventInput) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.date) {
    updateData.date = new Date(data.date);
  }
  if ('endDate' in data) {
    updateData.endDate = data.endDate ? new Date(data.endDate) : null;
  }

  return prisma.event.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteEvent(id: string) {
  return prisma.event.delete({ where: { id } });
}
