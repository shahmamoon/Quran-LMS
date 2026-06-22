import { Request } from 'express';
import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';

interface AuditRequest extends Request {
  user?: { userId: string };
}

/**
 * Fire-and-forget audit log writer.
 * Never throws — a failed audit must never fail the parent request.
 */
export function logAudit(
  req: AuditRequest,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): void {
  prisma.auditLog
    .create({
      data: {
        userId: req.user?.userId ?? null,
        action,
        resource,
        resourceId: resourceId ?? null,
        metadata: metadata as Prisma.InputJsonObject | undefined,
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    })
    .catch((err) => console.error('[audit]', err));
}
