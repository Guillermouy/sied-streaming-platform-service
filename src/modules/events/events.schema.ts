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
  // Stream opcional en inglés (eventos bilingües). Vacío = solo español.
  youtubeUrlEn: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || isValidYouTubeUrl(val), {
      message: 'URL de YouTube (inglés) inválida',
    }),
  // Modalidad: online (default), presencial o híbrido (online + presencial).
  modality: z.enum(['ONLINE', 'PRESENCIAL', 'HIBRIDO']).optional(),
  venueName: z.string().max(200).optional().nullable(),
  venueAddress: z.string().max(300).optional().nullable(),
  // Tope opcional de inscriptos presenciales (null = sin límite).
  inPersonCapacity: z
    .number({ invalid_type_error: 'El cupo debe ser un número' })
    .int('El cupo debe ser un número entero')
    .min(1, 'El cupo debe ser al menos 1')
    .max(100000)
    .optional()
    .nullable(),
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

// Si el evento tiene parte presencial, el lugar es obligatorio.
function venueRequiredWhenInPerson(data: {
  modality?: string;
  venueName?: string | null;
  venueAddress?: string | null;
}): boolean {
  if (!data.modality || data.modality === 'ONLINE') return true;
  return Boolean(data.venueAddress?.trim());
}

const venueIssue = {
  message: 'Indicá la dirección del evento presencial',
  path: ['venueAddress'],
};

const endDateIssue = {
  message: 'La fecha de fin no puede ser anterior a la fecha de inicio',
  path: ['endDate'],
};

export const createEventSchema = eventFields
  .refine(endDateNotBeforeStart, endDateIssue)
  .refine(venueRequiredWhenInPerson, venueIssue);

export const updateEventSchema = eventFields
  .partial()
  .refine(endDateNotBeforeStart, endDateIssue)
  .refine(venueRequiredWhenInPerson, venueIssue);

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
