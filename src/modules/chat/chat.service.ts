import { prisma } from '../../lib/prisma';
import type { ChatTranslation } from '../../lib/translate';

// Cache corto de "¿el evento tiene transmisión en inglés?" para no consultar la base en cada mensaje.
const ENGLISH_CACHE_MS = 60_000;
const englishCache = new Map<string, { value: boolean; expires: number }>();

export const chatService = {
  async getRecentMessages(eventId: string, limit = 50) {
    return prisma.chatMessage.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventId: true,
        userId: true,
        senderName: true,
        content: true,
        sourceLang: true,
        contentEs: true,
        contentEn: true,
        createdAt: true,
      },
    }).then(msgs => msgs.reverse());
  },

  async saveMessage(data: {
    eventId: string;
    userId?: string;
    senderName: string;
    content: string;
  }) {
    return prisma.chatMessage.create({
      data: {
        eventId: data.eventId,
        userId: data.userId || null,
        senderName: data.senderName,
        content: data.content,
      },
      select: {
        id: true,
        eventId: true,
        userId: true,
        senderName: true,
        content: true,
        sourceLang: true,
        contentEs: true,
        contentEn: true,
        createdAt: true,
      },
    });
  },

  async saveTranslation(id: string, t: ChatTranslation) {
    return prisma.chatMessage.update({
      where: { id },
      data: { sourceLang: t.sourceLang, contentEs: t.contentEs, contentEn: t.contentEn },
      select: { id: true, sourceLang: true, contentEs: true, contentEn: true },
    });
  },

  /** Solo se traducen los mensajes de eventos con transmisión en inglés (los únicos con selector de idioma). */
  async eventHasEnglish(eventId: string): Promise<boolean> {
    const cached = englishCache.get(eventId);
    if (cached && cached.expires > Date.now()) return cached.value;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { youtubeUrlEn: true },
    });
    const value = Boolean(event?.youtubeUrlEn?.trim());
    englishCache.set(eventId, { value, expires: Date.now() + ENGLISH_CACHE_MS });
    return value;
  },

  async logViewer(data: {
    eventId: string;
    userId?: string;
    sessionId: string;
  }) {
    return prisma.liveViewerLog.create({
      data: {
        eventId: data.eventId,
        userId: data.userId || null,
        sessionId: data.sessionId,
      },
    });
  },

  async getViewerCount(eventId: string) {
    return prisma.liveViewerLog.count({
      where: { eventId },
    });
  },

  async listViewers(eventId: string) {
    return prisma.liveViewerLog.findMany({
      where: { eventId },
      orderBy: { joinedAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        userId: true,
        joinedAt: true,
      },
    }).then(async (logs) => {
      const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))] as string[];
      const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, email: true, country: true },
          })
        : [];
      const userMap = new Map(users.map(u => [u.id, u]));
      return logs.map(log => ({
        ...log,
        user: log.userId ? userMap.get(log.userId) || null : null,
      }));
    });
  },

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        // Sin email: este endpoint es público y los userId viajan en los mensajes del chat.
      },
    });
  },
};
