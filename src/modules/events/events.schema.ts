import { z } from 'zod';
import { isValidYouTubeUrl } from '../../lib/youtube';

const eventFields = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  shortDescription: z.string().min(1, 'La descripción corta es obligatoria'),
  longDescription: z.string().optional(),
  speakers: z.string().min(1, 'Debe indicar al menos un expositor'),
  date: z.string().min(1, 'La fecha es obligatoria'),
  endDate: z.string().optional().nullable(),
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

// La fecha de fin es opcional (la mayoría de los eventos son de un solo día).
// Si se indica, no puede ser anterior a la fecha de inicio.
function endDateNotBeforeStart(data: { date?: string; endDate?: string | null }): boolean {
  if (!data.date || !data.endDate) return true;
  return data.endDate >= data.date;
}

const endDateIssue = {
  message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  path: ['endDate'],
};

export const createEventSchema = eventFields.refine(
  endDateNotBeforeStart,
  endDateIssue
);

export const updateEventSchema = eventFields.partial().refine(
  endDateNotBeforeStart,
  endDateIssue
);

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
