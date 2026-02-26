import { z } from 'zod';

export const createRegistrationSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().min(1, 'El apellido es obligatorio'),
  email: z.string().email('Email inválido'),
  country: z.string().min(1, 'El país es obligatorio'),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Debe aceptar la política de privacidad' }),
  }),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
