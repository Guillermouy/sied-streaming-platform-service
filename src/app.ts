import express from 'express';
import cors from 'cors';
import path from 'path';
import { healthRouter } from './modules/health/health.routes';
import { eventsRouter } from './modules/events/events.routes';
import { registrationsRouter } from './modules/registrations/registrations.routes';
import { uploadRouter } from './modules/upload/upload.routes';
import { errorHandler } from './middleware/error-handler';

export const app = express();

app.use(cors());
app.use(express.json());

const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

app.use('/api', healthRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/events', eventsRouter);
app.use('/api/events', registrationsRouter);

app.use(errorHandler);
