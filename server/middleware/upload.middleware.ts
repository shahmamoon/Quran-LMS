import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helper: make a disk-storage Multer instance for a given dir ─
function makeDiskStorage(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

// ─── Quiz submission attachments (10 MB, docs + images) ──────────
const QUIZ_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

export const quizUpload = multer({
  storage: makeDiskStorage(path.resolve('uploads', 'quiz-submissions')),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (QUIZ_ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, Word documents, and images (JPG/PNG) are allowed'));
  },
});

// ─── Lesson resource attachments (50 MB, broad file types) ───────
const LESSON_ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4',
  'audio/mpeg', 'audio/mp3',
  'text/plain',
  'application/zip',
]);

export const lessonUpload = multer({
  storage: makeDiskStorage(path.resolve('uploads', 'lesson-attachments')),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (LESSON_ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error('File type not supported. Allowed: PDF, Word, PowerPoint, Excel, images, MP4, MP3, TXT, ZIP'));
  },
});

