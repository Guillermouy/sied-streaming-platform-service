import express from 'express';
import cors from 'cors';
import { healthRouter } from './modules/health/health.routes';
import { eventsRouter } from './modules/events/events.routes';
import { registrationsRouter } from './modules/registrations/registrations.routes';
import { uploadRouter } from './modules/upload/upload.routes';
import { errorHandler } from './middleware/error-handler';
import { UPLOADS_DIR } from './lib/uploads';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api', healthRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/events', eventsRouter);
app.use('/api/events', registrationsRouter);

app.use(errorHandler);
