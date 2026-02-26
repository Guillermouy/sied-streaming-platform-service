import { Request, Response, NextFunction } from 'express';
import { createRegistrationSchema } from './registrations.schema';
import * as registrationsService from './registrations.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createRegistrationSchema.parse(req.body);
    const registration = await registrationsService.registerToEvent(
      req.params.eventId,
      data,
    );
    res.status(201).json(registration);
  } catch (err) {
    next(err);
  }
}

export async function listRegistrations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const registrations = await registrationsService.getEventRegistrations(
      req.params.eventId,
    );
    res.json(registrations);
  } catch (err) {
    next(err);
  }
}
