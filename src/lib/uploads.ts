import path from 'path';
import fs from 'fs';

export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
