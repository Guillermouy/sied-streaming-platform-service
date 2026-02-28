import { z } from 'zod';

const PROFILES = [
  'Médico especialista',
  'Residente',
  'Médico general',
  'Profesional otra área de la salud',
  'Estudiante de medicina',
  'Enfermera(o)',
  'Otro',
] as const;

export const createRegistrationSchema = z
  .object({
    firstName: z.string().min(1, 'El nombre es obligatorio'),
    lastName: z.string().min(1, 'El apellido es obligatorio'),
    email: z.string().email('Email inválido'),
    country: z.string().min(1, 'El país es obligatorio'),
    profile: z.enum(PROFILES, {
      errorMap: () => ({ message: 'El perfil es obligatorio' }),
    }),
    specialty: z.string().optional(),
    phoneCode: z.string().min(1, 'El código de país es obligatorio'),
    phoneNumber: z
      .string()
      .min(1, 'El número de celular es obligatorio')
      .regex(/^\d+$/, 'Solo se permiten números'),
    privacyAccepted: z.literal(true, {
      errorMap: () => ({ message: 'Debe aceptar la política de privacidad' }),
    }),
  })
  .refine(
    (data) =>
      data.profile !== 'Médico especialista' ||
      (data.specialty && data.specialty.length > 0),
    {
      message: 'La especialidad es obligatoria para Médico especialista',
      path: ['specialty'],
    },
  );

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
