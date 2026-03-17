import { prisma } from '../../lib/prisma';

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
        createdAt: true,
      },
    });
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
        email: true,
      },
    });
  },
};
