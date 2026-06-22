import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateSessionSchema } from '../schemas/validation.schemas.js';
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting } from '../services/zoom.service.js';
import { createGoogleMeetEvent, deleteGoogleCalendarEvent } from '../services/google-meet.service.js';
import { isDailyConfigured, createDailyRoom, deleteDailyRoom } from '../services/daily.service.js';
import { isR2Configured, getPresignedUploadUrl, deleteRecording, keyFromUrl, getRecordingStream } from '../services/r2.service.js';
import { verifyAccessToken } from '../utils/jwt.utils.js';
import { Role, SessionStatus } from '@prisma/client';
import { env } from '../config/env.js';

/**
 * Generate a realistic-looking demo Zoom meeting for local development.
 * The URLs look real so the UI renders correctly, but they won't work in
 * a real Zoom client — intended only for demo / UI testing purposes.
 */
function generateDemoZoomData(topic: string) {
  const meetingId = String(Math.floor(Math.random() * 90_000_000_000) + 10_000_000_000);
  const password = Math.random().toString(36).substring(2, 8).toUpperCase();
  const encoded = Buffer.from(topic).toString('base64').substring(0, 16);
  return {
    id: meetingId,
    joinUrl: `https://zoom.us/j/${meetingId}?pwd=${password}`,
    startUrl: `https://zoom.us/s/${meetingId}?zak=${encoded}`,
    password,
    isDemo: true,
  };
}

const router = Router();

// GET /api/sessions/:id/recording/download — registered BEFORE router.use(authenticate)
// because browser <a download> links can't set Authorization headers.
// Auth is handled manually: Bearer header OR ?token= query param.
router.get('/:id/recording/download', async (req: AuthRequest, res) => {
  // Resolve token from header or query param
  const raw = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : (req.query.token as string | undefined);

  if (!raw) { errorResponse(res, 'Unauthorized', 401); return; }
  try {
    const payload = verifyAccessToken(raw);
    req.user = { userId: payload.userId, role: payload.role as Role };
  } catch {
    errorResponse(res, 'Unauthorized', 401); return;
  }

  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    select: { id: true, recordingUrl: true, groupId: true, hostId: true, attendances: { select: { userId: true } } },
  });
  if (!session || !session.recordingUrl) { errorResponse(res, 'Recording not found', 404); return; }

  // Access control: staff always allowed; students must be an attendee or group member
  const userId = req.user.userId;
  const isStaff = req.user.role === Role.ADMIN || req.user.role === Role.TEACHER;
  if (!isStaff) {
    const isAttendee = session.attendances.some((a) => a.userId === userId);
    let inGroup = false;
    if (!isAttendee && session.groupId) {
      inGroup = !!(await prisma.groupMember.findFirst({ where: { groupId: session.groupId, userId }, select: { id: true } }));
    }
    if (!isAttendee && !inGroup) { errorResponse(res, 'Forbidden', 403); return; }
  }

  try {
    const key = keyFromUrl(session.recordingUrl);
    const filename = key.split('/').pop() ?? 'recording.mp4';
    const stream = await getRecordingStream(key);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  } catch {
    errorResponse(res, 'Failed to retrieve recording', 500);
  }
});

router.use(authenticate);

// GET /api/sessions — students see sessions for their groups or enrolled subjects
router.get('/', async (req: AuthRequest, res) => {
  let where: Record<string, unknown> = {};

  if (req.user?.role === Role.TEACHER) {
    where = { hostId: req.user.userId };
  } else if (req.user?.role === Role.STUDENT) {
    // Students see only sessions scheduled WITH them: a group they belong to,
    // or a session they were explicitly added to (1-on-1 / direct attendance).
    // Subject enrolment alone does NOT grant visibility — that would expose a
    // session to every student in the subject, not just the intended attendee.
    const userId = req.user.userId;
    const groupIds = (await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })).map((g) => g.groupId);

    where = {
      OR: [
        // Sessions for groups the student belongs to
        ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
        // Sessions they were explicitly added to (attendance record)
        { attendances: { some: { userId } } },
      ],
    };
  }
  // ADMIN: no filter → sees all

  const sessions = await prisma.session.findMany({
    where,
    include: {
      host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      subject: { select: { id: true, title: true, color: true } },
      group: { select: { id: true, name: true } },
      attendances: {
        take: 1,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
      _count: { select: { attendances: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  const safeSessions = sessions.map((s) => {
    const isHost = req.user?.userId === s.hostId || req.user?.role === Role.ADMIN;
    // For 1-on-1 sessions (no group, single attendee), expose the student
    const student = !s.groupId && s.attendances.length === 1 ? s.attendances[0].user : null;
    return { ...s, zoomStartUrl: isHost ? s.zoomStartUrl : undefined, student };
  });

  successResponse(res, safeSessions);
});

// POST /api/sessions
router.post('/', requireRole(Role.ADMIN, Role.TEACHER), validate(CreateSessionSchema), async (req: AuthRequest, res) => {
  const { title, description, subjectId, groupId, studentId, hostId: bodyHostId, scheduledAt, durationMinutes, zoomJoinUrl: manualZoomUrl, recurringDays, recurringUntil } = req.body as {
    title: string;
    description?: string;
    subjectId?: string;
    groupId?: string;
    studentId?: string;
    hostId?: string;
    scheduledAt: string;
    durationMinutes?: number;
    recurringDays?: number[];
    recurringUntil?: string;
    zoomJoinUrl?: string;
  };

  // Teacher is always the host; admin passes the subject's teacher as hostId
  const hostId = req.user!.role === Role.TEACHER ? req.user!.userId : (bodyHostId ?? req.user!.userId);
  const dur = durationMinutes ?? 60;
  const startDate = new Date(scheduledAt);

  const isPlaceholderCreds =
    env.ZOOM_ACCOUNT_ID === 'placeholder' ||
    env.ZOOM_CLIENT_ID === 'placeholder' ||
    env.ZOOM_CLIENT_SECRET === 'placeholder';

  // Build list of dates to create sessions for
  const dates: Date[] = [];
  if (recurringDays && recurringDays.length > 0 && recurringUntil) {
    const until = new Date(recurringUntil);
    until.setHours(23, 59, 59, 999);
    const cursor = new Date(startDate);
    while (cursor <= until) {
      if (recurringDays.includes(cursor.getDay())) {
        const d = new Date(cursor);
        d.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
        dates.push(d);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (dates.length === 0) {
      errorResponse(res, 'No matching dates in the selected range', 400);
      return;
    }
    if (dates.length > 100) {
      errorResponse(res, 'Too many sessions — choose a shorter date range (max 100)', 400);
      return;
    }
  } else {
    dates.push(startDate);
  }

  // Resolve which meeting provider is active
  const providerSetting = await prisma.setting.findUnique({ where: { key: 'meeting_provider' } });
  const meetingProvider = providerSetting?.value ?? 'zoom';

  const createOneSession = async (sessionDate: Date) => {
    let zoomData: { id: string; joinUrl: string; startUrl: string; password: string } | null = null;
    let googleMeetLink: string | null = null;
    let googleCalendarEventId: string | null = null;
    let dailyRoomName: string | null = null;
    let dailyJoinUrl: string | null = null;

    if (meetingProvider === 'google_meet') {
      try {
        const result = await createGoogleMeetEvent({
          title,
          startTime: sessionDate,
          durationMinutes: dur,
          description,
          hostUserId: hostId,
        });
        googleMeetLink = result.meetLink;
        googleCalendarEventId = result.eventId;
      } catch (err) {
        console.error('Google Meet creation failed:', err);
      }
    } else if (meetingProvider === 'daily_co' && isDailyConfigured()) {
      try {
        // Room expires 1 hour after the session ends to allow rejoining
        const expiresAt = new Date(sessionDate.getTime() + (dur + 60) * 60 * 1000);
        const room = await createDailyRoom(sessionDate.getTime().toString(), expiresAt);
        dailyRoomName = room.name;
        dailyJoinUrl = room.url;
      } catch (err) {
        console.error('Daily.co room creation failed:', err);
      }
    } else if (!isPlaceholderCreds) {
      try {
        zoomData = await createZoomMeeting({
          topic: title,
          startTime: sessionDate,
          durationMinutes: dur,
          agenda: description,
        }, hostId);
      } catch (err) {
        console.error('Zoom meeting creation failed:', err);
      }
    }

    if (!zoomData && !googleMeetLink && !dailyJoinUrl && !manualZoomUrl && env.NODE_ENV === 'development') {
      zoomData = generateDemoZoomData(title);
    }

    const session = await prisma.session.create({
      data: {
        title,
        description,
        subjectId: subjectId || null,
        groupId: groupId || null,
        hostId,
        scheduledAt: sessionDate,
        durationMinutes: dur,
        zoomMeetingId: zoomData?.id ?? null,
        zoomJoinUrl: googleMeetLink ?? dailyJoinUrl ?? zoomData?.joinUrl ?? (manualZoomUrl || null),
        zoomStartUrl: googleMeetLink ?? dailyJoinUrl ?? zoomData?.startUrl ?? (manualZoomUrl || null),
        zoomPassword: zoomData?.password ?? null,
        googleCalendarEventId: googleCalendarEventId ?? null,
        dailyRoomName: dailyRoomName ?? null,
      },
      include: {
        host: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, title: true, color: true } },
        group: { select: { id: true, name: true } },
      },
    });

    if (session.groupId) {
      const members = await prisma.groupMember.findMany({ where: { groupId: session.groupId } });
      await Promise.all(
        members.map((m) =>
          prisma.sessionAttendance.upsert({
            where: { sessionId_userId: { sessionId: session.id, userId: m.userId } },
            update: {},
            create: { sessionId: session.id, userId: m.userId },
          })
        )
      );
    }

    if (studentId && !session.groupId) {
      await prisma.sessionAttendance.upsert({
        where: { sessionId_userId: { sessionId: session.id, userId: studentId } },
        update: {},
        create: { sessionId: session.id, userId: studentId },
      });
    }

    return session;
  };

  try {
    // Sequential — not parallel — so Zoom API calls don't burst and hit
    // per-second rate limits, which silently drops meeting links on some sessions.
    const sessions: Awaited<ReturnType<typeof createOneSession>>[] = [];
    for (const date of dates) {
      sessions.push(await createOneSession(date));
    }
    if (sessions.length === 1) {
      successResponse(res, sessions[0], 201);
    } else {
      successResponse(res, { sessions, count: sessions.length }, 201);
    }
  } catch (err) {
    console.error('Session create error:', err);
    errorResponse(res, 'Failed to create session', 500);
  }
});

// GET /api/sessions/:id
router.get('/:id', async (req: AuthRequest, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.id },
    include: {
      host: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      subject: { select: { id: true, title: true, color: true } },
      group: { select: { id: true, name: true } },
      attendances: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
    },
  });
  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  // ── Access control ──────────────────────────────────────────
  // ADMIN and the host teacher can always view. A STUDENT may view only if
  // they are an attendee or a member of the session's group. Otherwise 404
  // (not 403) so we don't reveal that the session exists.
  const userId = req.user?.userId;
  const isAdmin = req.user?.role === Role.ADMIN;
  const isHost = userId === session.hostId;

  let allowed = isAdmin || isHost;
  if (!allowed && userId) {
    const isAttendee = session.attendances.some((a) => a.userId === userId);
    let inGroup = false;
    if (!isAttendee && session.groupId) {
      inGroup = !!(await prisma.groupMember.findFirst({
        where: { groupId: session.groupId, userId },
        select: { id: true },
      }));
    }
    allowed = isAttendee || inGroup;
  }

  if (!allowed) { errorResponse(res, 'Session not found', 404); return; }

  const safe = { ...session, zoomStartUrl: (isAdmin || isHost) ? session.zoomStartUrl : undefined };
  successResponse(res, safe);
});

// PUT /api/sessions/:id
router.put('/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { title, description, scheduledAt, durationMinutes, subjectId, groupId, zoomJoinUrl: manualZoomUrl } = req.body as Record<string, unknown>;
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  const providerSetting = await prisma.setting.findUnique({ where: { key: 'meeting_provider' } });
  const meetingProvider = providerSetting?.value ?? 'zoom';

  if (meetingProvider === 'zoom' && session.zoomMeetingId) {
    try {
      await updateZoomMeeting(session.zoomMeetingId, {
        topic: title as string,
        startTime: scheduledAt ? new Date(scheduledAt as string) : undefined,
        durationMinutes: durationMinutes as number,
        agenda: description as string,
      }, session.hostId);
    } catch (err) { console.error('Zoom update failed:', err); }
  }

  // Auto-generate a meeting link if session has none and no manual URL was provided
  let newZoomData: { id: string; joinUrl: string; startUrl: string; password?: string } | null = null;
  let newGoogleMeetLink: string | null = null;
  let newGoogleEventId: string | null = null;

  if (!session.zoomJoinUrl && !manualZoomUrl && session.hostId) {
    if (meetingProvider === 'google_meet') {
      try {
        const result = await createGoogleMeetEvent({
          title: (title as string) ?? session.title,
          startTime: scheduledAt ? new Date(scheduledAt as string) : session.scheduledAt,
          durationMinutes: (durationMinutes as number) ?? session.durationMinutes,
          description: (description as string) ?? session.description ?? undefined,
          hostUserId: session.hostId,
        });
        newGoogleMeetLink = result.meetLink;
        newGoogleEventId = result.eventId;
      } catch (err) { console.error('Google Meet creation on update failed:', err); }
    } else {
      try {
        newZoomData = await createZoomMeeting({
          topic: (title as string) ?? session.title,
          startTime: scheduledAt ? new Date(scheduledAt as string) : session.scheduledAt,
          durationMinutes: (durationMinutes as number) ?? session.durationMinutes,
          agenda: (description as string) ?? session.description ?? undefined,
        }, session.hostId);
      } catch (err) { console.error('Zoom meeting creation on update failed:', err); }
    }
  }

  const updated = await prisma.session.update({
    where: { id: req.params.id },
    data: {
      title: title as string,
      description: description as string,
      scheduledAt: scheduledAt ? new Date(scheduledAt as string) : undefined,
      durationMinutes: durationMinutes as number,
      subjectId: (subjectId as string) || null,
      groupId: (groupId as string) || null,
      // Apply meeting link: Google Meet > new Zoom > manual URL > no change
      ...(newGoogleMeetLink ? {
        zoomJoinUrl: newGoogleMeetLink,
        zoomStartUrl: newGoogleMeetLink,
        googleCalendarEventId: newGoogleEventId,
      } : newZoomData ? {
        zoomMeetingId: newZoomData.id,
        zoomJoinUrl: newZoomData.joinUrl,
        zoomStartUrl: newZoomData.startUrl,
        zoomPassword: newZoomData.password ?? null,
      } : !session.zoomJoinUrl && manualZoomUrl ? {
        zoomJoinUrl: manualZoomUrl as string,
        zoomStartUrl: manualZoomUrl as string,
      } : {}),
    },
    include: {
      host: { select: { id: true, firstName: true, lastName: true } },
      subject: { select: { id: true, title: true, color: true } },
      group: { select: { id: true, name: true } },
    },
  });
  successResponse(res, updated);
});

// PUT /api/sessions/:id/status
router.put('/:id/status', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { status } = req.body as { status: SessionStatus };
  const session = await prisma.session.update({ where: { id: req.params.id }, data: { status } });
  successResponse(res, session);
});

// DELETE /api/sessions/:id
router.delete('/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  if (session.zoomMeetingId) {
    try { await deleteZoomMeeting(session.zoomMeetingId, session.hostId); } catch (err) { console.error('Zoom delete failed:', err); }
  } else if (session.googleCalendarEventId) {
    try { await deleteGoogleCalendarEvent(session.googleCalendarEventId, session.hostId); } catch (err) { console.error('Google Calendar event delete failed:', err); }
  } else if (session.dailyRoomName) {
    try { await deleteDailyRoom(session.dailyRoomName); } catch (err) { console.error('Daily.co room delete failed:', err); }
  }

  // Delete attendance records first — SessionAttendance has no cascade, Postgres will reject the delete otherwise
  await prisma.sessionAttendance.deleteMany({ where: { sessionId: req.params.id } });
  await prisma.session.delete({ where: { id: req.params.id } });
  successResponse(res, { message: 'Session deleted' });
});

// POST /api/sessions/:id/join — record attendance (staff only)
// Students must not self-enroll: the recording download route uses attendances to
// gate access, so a student who knows a session cuid could otherwise gain access
// to recordings for sessions they were never part of.
router.post('/:id/join', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  if (!req.user) { errorResponse(res, 'Unauthorized', 401); return; }
  const record = await prisma.sessionAttendance.upsert({
    where: { sessionId_userId: { sessionId: req.params.id, userId: req.user.userId } },
    update: {},
    create: { sessionId: req.params.id, userId: req.user.userId },
  });
  successResponse(res, record, 201);
});

// POST /api/sessions/:id/attendance — bulk mark
router.post('/:id/attendance', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { userIds } = req.body as { userIds: string[] };
  const records = await Promise.all(
    userIds.map((uid) =>
      prisma.sessionAttendance.upsert({
        where: { sessionId_userId: { sessionId: req.params.id, userId: uid } },
        update: {},
        create: { sessionId: req.params.id, userId: uid },
      })
    )
  );
  successResponse(res, records);
});

// POST /api/sessions/backfill-zoom — give demo Zoom links to all sessions missing one (dev only, admin)
router.post('/backfill-zoom', requireRole(Role.ADMIN), async (_req, res) => {
  if (env.NODE_ENV !== 'development') {
    errorResponse(res, 'Only available in development', 403); return;
  }
  const sessions = await prisma.session.findMany({
    where: { zoomJoinUrl: null },
    select: { id: true, title: true },
  });
  const updated = await Promise.all(
    sessions.map((s) => {
      const demo = generateDemoZoomData(s.title);
      return prisma.session.update({
        where: { id: s.id },
        data: {
          zoomMeetingId: demo.id,
          zoomJoinUrl: demo.joinUrl,
          zoomStartUrl: demo.startUrl,
          zoomPassword: demo.password,
        },
      });
    })
  );
  successResponse(res, { patched: updated.length, sessions: updated.map((s) => s.title) });
});

// ─── Recording upload / delete ────────────────────────────────
// GET /api/sessions/:id/recording/upload-url — returns a presigned R2 PUT URL.
// Browser uploads directly to R2, bypassing the server and Cloudflare's 100 MB limit.
router.get('/:id/recording/upload-url', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  const uploadSetting = await prisma.setting.findUnique({ where: { key: 'recording_upload_enabled' } });
  if (uploadSetting?.value !== 'true') { errorResponse(res, 'Recording upload is disabled', 503); return; }
  if (!isR2Configured()) { errorResponse(res, 'Recording storage is not configured', 503); return; }

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  if (req.user?.role === Role.TEACHER && session.hostId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const key = `recordings/${session.id}/${randomUUID()}.mp4`;
  const uploadUrl = await getPresignedUploadUrl(key);
  successResponse(res, { uploadUrl, key });
});

// POST /api/sessions/:id/recording/confirm — called after browser finishes PUT to R2.
// Saves the key, deletes any previous recording.
router.post('/:id/recording/confirm', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  const uploadSetting = await prisma.setting.findUnique({ where: { key: 'recording_upload_enabled' } });
  if (uploadSetting?.value !== 'true') { errorResponse(res, 'Recording upload is disabled', 503); return; }
  if (!isR2Configured()) { errorResponse(res, 'Recording storage is not configured', 503); return; }

  const { key } = req.body as { key?: string };
  if (!key || !key.startsWith(`recordings/${req.params.id}/`)) { errorResponse(res, 'Invalid key', 400); return; }

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  if (req.user?.role === Role.TEACHER && session.hostId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  if (session.recordingUrl) {
    try { await deleteRecording(keyFromUrl(session.recordingUrl)); } catch { /* best-effort */ }
  }

  await prisma.session.update({ where: { id: session.id }, data: { recordingUrl: key } });
  successResponse(res, { recordingUrl: key });
});

// DELETE /api/sessions/:id/recording — teacher or admin removes recording
router.delete('/:id/recording', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  if (!isR2Configured()) { errorResponse(res, 'Recording storage is not configured', 503); return; }

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  if (req.user?.role === Role.TEACHER && session.hostId !== req.user.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  if (!session.recordingUrl) { errorResponse(res, 'No recording to delete', 404); return; }

  try { await deleteRecording(keyFromUrl(session.recordingUrl)); } catch { /* best-effort */ }

  await prisma.session.update({ where: { id: session.id }, data: { recordingUrl: null } });
  successResponse(res, { message: 'Recording deleted' });
});

export default router;
