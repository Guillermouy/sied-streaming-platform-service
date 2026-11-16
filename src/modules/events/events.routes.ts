import { Router } from 'express';
import { requireAdmin } from '../../lib/auth';
import * as eventsController from './events.controller';

export const eventsRouter = Router();

eventsRouter.post('/', requireAdmin, eventsController.create);
eventsRouter.get('/', requireAdmin, eventsController.list);
eventsRouter.get('/:id', eventsController.getById);
eventsRouter.patch('/:id', requireAdmin, eventsController.update);
eventsRouter.delete('/:id', requireAdmin, eventsController.remove);
