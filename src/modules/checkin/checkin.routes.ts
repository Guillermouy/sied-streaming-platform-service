import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../lib/auth';
import { checkIn, undoCheckIn } from './checkin.service';

const checkInSchema = z
  .object({
    code: z.string().max(500).optional(),
    registrationId: z.string().max(100).optional(),
  })
  .refine((d) => d.code || d.registrationId, { message: 'Falta el código de la entrada' });

export const checkinRouter = Router();

checkinRouter.post('/:eventId/checkin', requireAdmin, async (req, res, next) => {
  try {
    const input = checkInSchema.parse(req.body);
    res.json(await checkIn(req.params.eventId, input));
  } catch (err) {
    next(err);
  }
});

checkinRouter.delete('/:eventId/checkin/:registrationId', requireAdmin, async (req, res, next) => {
  try {
    res.json(await undoCheckIn(req.params.eventId, req.params.registrationId));
  } catch (err) {
    next(err);
  }
});
