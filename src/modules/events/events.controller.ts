import { Request, Response, NextFunction } from 'express';
import { createEventSchema, updateEventSchema } from './events.schema';
import * as eventsService from './events.service';
import { AppError } from '../../middleware/error-handler';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createEventSchema.parse(req.body);
    const event = await eventsService.createEvent(data);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const events = await eventsService.listEvents();
    res.json(events);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await eventsService.getEventById(req.params.id);
    if (!event) throw new AppError(404, 'Evento no encontrado');
    res.json(event);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateEventSchema.parse(req.body);
    const event = await eventsService.updateEvent(req.params.id, data);
    res.json(event);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await eventsService.deleteEvent(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
