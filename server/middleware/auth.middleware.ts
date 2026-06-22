import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils.js';
import { errorResponse } from '../utils/response.utils.js';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: { userId: string; role: Role };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    errorResponse(res, 'Unauthorized', 401);
    return;
  }
  const token = header.split(' ')[1];
  if (!token) {
    errorResponse(res, 'Unauthorized', 401);
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, role: payload.role as Role };
    next();
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      errorResponse(res, 'Forbidden', 403);
      return;
    }
    next();
  };
}
