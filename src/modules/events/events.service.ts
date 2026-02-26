import { prisma } from '../../lib/prisma';
import { CreateEventInput, UpdateEventInput } from './events.schema';

export async function createEvent(data: CreateEventInput) {
  return prisma.event.create({
    data: {
      ...data,
      date: new Date(data.date),
    },
  });
}

export async function listEvents() {
  return prisma.event.findMany({
    orderBy: { date: 'desc' },
    include: { _count: { select: { registrations: true } } },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
}

export async function updateEvent(id: string, data: UpdateEventInput) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.date) {
    updateData.date = new Date(data.date);
  }

  return prisma.event.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteEvent(id: string) {
  return prisma.event.delete({ where: { id } });
}
