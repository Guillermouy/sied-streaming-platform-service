import { Router } from 'express';
import { requireAdmin } from '../../lib/auth';
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

registrationsRouter.post(
  '/:eventId/send-access-all',
  requireAdmin,
  registrationsController.sendAccessToAll,
);

registrationsRouter.get(
  '/:eventId/registrations',
  requireAdmin,
  registrationsController.listRegistrations,
);
