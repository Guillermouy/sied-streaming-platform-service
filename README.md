# SIED Server

Backend API para la plataforma de eventos de SIED.

## Stack

Express, TypeScript, Prisma, Zod, Resend

## Setup

```bash
npm install
cp .env.example .env   # completar con credenciales
npx prisma generate
npx prisma migrate dev
npm run dev
```

El server corre en `http://localhost:3001`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con hot reload |
| `npm run build` | Build de producción |
| `npm run start` | Inicia en producción |
| `npm run db:migrate` | Migraciones en desarrollo |
| `npm run db:migrate:deploy` | Migraciones en producción |
| `npm run db:generate` | Genera el cliente Prisma |
| `npm run db:seed` | Carga datos de ejemplo |

## Deploy en Railway

- **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command:** `npm run start`
- **Variables de entorno:** `DATABASE_URL`, `PORT`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`
