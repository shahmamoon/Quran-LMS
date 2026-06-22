import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TESTS_DIR = path.resolve(__dirname, '..');
export const AUTH_DIR  = path.join(TESTS_DIR, '.auth');

export const authFile = (role: 'admin' | 'teacher' | 'student') =>
  path.join(AUTH_DIR, `${role}.json`);
