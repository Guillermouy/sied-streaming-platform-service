import { Router } from 'express';
import * as eventsController from './events.controller';

export const eventsRouter = Router();

eventsRouter.post('/', eventsController.create);
eventsRouter.get('/', eventsController.list);
eventsRouter.get('/:id', eventsController.getById);
eventsRouter.patch('/:id', eventsController.update);
eventsRouter.delete('/:id', eventsController.remove);
