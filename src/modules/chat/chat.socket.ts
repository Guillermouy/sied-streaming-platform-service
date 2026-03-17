import type { Server } from 'socket.io';
import { chatService } from './chat.service';

export function registerChatHandlers(io: Server) {
  io.on('connection', (socket) => {
    socket.on('chat:join', async (data: { eventId: string; userId?: string; sessionId: string }) => {
      const { eventId, userId, sessionId } = data;
      socket.join(`event:${eventId}`);

      try {
        await chatService.logViewer({ eventId, userId, sessionId });
      } catch {
        // viewer logging is best-effort
      }

      try {
        const messages = await chatService.getRecentMessages(eventId);
        socket.emit('chat:history', messages);
      } catch {
        socket.emit('chat:history', []);
      }
    });

    socket.on('chat:send', async (data: { eventId: string; userId?: string; senderName: string; content: string }) => {
      const { eventId, userId, senderName, content } = data;

      if (!content || !content.trim() || !eventId) return;

      try {
        const message = await chatService.saveMessage({
          eventId,
          userId,
          senderName,
          content: content.trim(),
        });

        io.to(`event:${eventId}`).emit('chat:message', message);
      } catch (err) {
        socket.emit('chat:error', { message: 'Error al enviar mensaje' });
      }
    });

    socket.on('disconnect', () => {
      // cleanup if needed
    });
  });
}
