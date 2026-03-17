import { Router } from 'express';
import { chatService } from './chat.service';

export const chatRouter = Router();

chatRouter.get('/:eventId/chat/messages', async (req, res, next) => {
  try {
    const messages = await chatService.getRecentMessages(req.params.eventId);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/:eventId/viewers/count', async (req, res, next) => {
  try {
    const count = await chatService.getViewerCount(req.params.eventId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/:eventId/viewers', async (req, res, next) => {
  try {
    const viewers = await chatService.listViewers(req.params.eventId);
    res.json(viewers);
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/:eventId/viewer-user/:userId', async (req, res, next) => {
  try {
    const user = await chatService.getUserById(req.params.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});
