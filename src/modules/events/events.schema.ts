import { z } from 'zod';
import { isValidYouTubeUrl } from '../../lib/youtube';

export const createEventSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  shortDescription: z.string().min(1, 'La descripción corta es obligatoria'),
  longDescription: z.string().optional(),
  speakers: z.string().min(1, 'Debe indicar al menos un expositor'),
  date: z.string().min(1, 'La fecha es obligatoria'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora: HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora: HH:MM'),
  timezone: z.string().min(1, 'La zona horaria es obligatoria'),
  youtubeUrl: z
    .string()
    .optional()
    .refine((val) => !val || isValidYouTubeUrl(val), {
      message: 'URL de YouTube inválida',
    }),
  status: z.enum(['DRAFT', 'PUBLISHED', 'LIVE', 'FINISHED']).optional(),
  coverImage: z.string().optional(),
  accessText: z.string().optional(),
  registrationEnabled: z.boolean().optional(),
  liveEnabled: z.boolean().optional(),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
