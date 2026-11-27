import type { Server } from 'socket.io';
import { chatService } from './chat.service';
import { translateChatMessage, type ChatLang } from '../../lib/translate';

const MAX_MESSAGE_CHARS = 500;

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

    socket.on(
      'chat:send',
      async (data: { eventId: string; userId?: string; senderName: string; content: string; lang?: string }) => {
        const { eventId, userId, senderName, content } = data;

        if (typeof content !== 'string' || !content.trim() || !eventId) return;

        let message;
        try {
          message = await chatService.saveMessage({
            eventId,
            userId,
            senderName,
            content: content.trim().slice(0, MAX_MESSAGE_CHARS),
          });

          io.to(`event:${eventId}`).emit('chat:message', message);
        } catch (err) {
          socket.emit('chat:error', { message: 'Error al enviar mensaje' });
          return;
        }

        // Traducción automática: el mensaje ya se mostró en su idioma original; cuando llega
        // la traducción se envía como actualización. Si falla, el chat sigue normalmente.
        try {
          if (!(await chatService.eventHasEnglish(eventId))) return;
          const hint: ChatLang = data.lang === 'en' ? 'en' : 'es';
          const translation = await translateChatMessage(message.content, hint);
          if (!translation) return;
          const updated = await chatService.saveTranslation(message.id, translation);
          io.to(`event:${eventId}`).emit('chat:translation', updated);
        } catch (err) {
          console.warn('[chat] No se pudo traducir el mensaje', message.id, err instanceof Error ? err.message : err);
        }
      },
    );

    socket.on('disconnect', () => {
      // cleanup if needed
    });
  });
}
