import { Router } from 'express';
import * as registrationsController from './registrations.controller';

export const registrationsRouter = Router();

registrationsRouter.post(
  '/:eventId/register',
  registrationsController.register,
);

registrationsRouter.post(
  '/:eventId/resend-access',
  registrationsController.resendAccess,
);

registrationsRouter.get(
  '/:eventId/registrations',
  registrationsController.listRegistrations,
);
