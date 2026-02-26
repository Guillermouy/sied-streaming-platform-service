import { Router } from 'express';
import * as registrationsController from './registrations.controller';

export const registrationsRouter = Router();

registrationsRouter.post(
  '/:eventId/register',
  registrationsController.register,
);

registrationsRouter.get(
  '/:eventId/registrations',
  registrationsController.listRegistrations,
);
