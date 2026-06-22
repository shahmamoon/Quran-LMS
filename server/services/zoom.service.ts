import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoomTokenCache {
  token: string;
  expiresAt: number;
}

interface ZoomMeeting {
  id: string;
  joinUrl: string;
  startUrl: string;
  password: string;
}

interface CreateMeetingParams {
  topic: string;
  startTime: Date;
  durationMinutes: number;
  timezone?: string;
  agenda?: string;
}

export interface ZoomUserTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// ─── Global S2S token (fallback account) ─────────────────────────────────────

let globalTokenCache: ZoomTokenCache | null = null;

async function getGlobalAccessToken(): Promise<string> {
  const now = Date.now();
  if (globalTokenCache && globalTokenCache.expiresAt > now + 60_000) {
    return globalTokenCache.token;
  }

  const credentials = Buffer.from(
    `${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${env.ZOOM_ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom S2S OAuth failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  globalTokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return globalTokenCache.token;
}

// ─── Per-user OAuth token (with auto-refresh) ─────────────────────────────────

export async function getUserAccessToken(userId: string): Promise<string | null> {
  if (!env.ZOOM_OAUTH_CLIENT_ID || !env.ZOOM_OAUTH_CLIENT_SECRET) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { zoomAccessToken: true, zoomRefreshToken: true, zoomTokenExpiry: true },
  });

  if (!user?.zoomAccessToken || !user.zoomRefreshToken || !user.zoomTokenExpiry) {
    return null;
  }

  // Token still valid — return as-is
  if (user.zoomTokenExpiry.getTime() > Date.now() + 60_000) {
    return user.zoomAccessToken;
  }

  // Expired — refresh it
  const credentials = Buffer.from(
    `${env.ZOOM_OAUTH_CLIENT_ID}:${env.ZOOM_OAUTH_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=refresh_token&refresh_token=${encodeURIComponent(user.zoomRefreshToken)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (!res.ok) {
    // Refresh failed (token revoked or expired) — clear stored tokens
    await prisma.user.update({
      where: { id: userId },
      data: { zoomAccessToken: null, zoomRefreshToken: null, zoomTokenExpiry: null },
    });
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      zoomAccessToken: data.access_token,
      zoomRefreshToken: data.refresh_token,
      zoomTokenExpiry: expiresAt,
    },
  });

  return data.access_token;
}

// ─── OAuth helpers (used by zoom.routes.ts) ───────────────────────────────────

export function buildZoomAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.ZOOM_OAUTH_CLIENT_ID!,
    redirect_uri: env.ZOOM_REDIRECT_URI!,
    state,
  });
  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

export async function exchangeZoomCode(code: string): Promise<ZoomUserTokens> {
  const credentials = Buffer.from(
    `${env.ZOOM_OAUTH_CLIENT_ID}:${env.ZOOM_OAUTH_CLIENT_SECRET}`
  ).toString('base64');

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.ZOOM_REDIRECT_URI!,
  });

  const res = await fetch(`https://zoom.us/oauth/token?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom code exchange failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// ─── Meeting operations ───────────────────────────────────────────────────────

async function resolveToken(hostUserId?: string): Promise<string> {
  if (hostUserId) {
    const userToken = await getUserAccessToken(hostUserId);
    if (userToken) return userToken;
  }
  return getGlobalAccessToken();
}

export async function createZoomMeeting(
  params: CreateMeetingParams,
  hostUserId?: string
): Promise<ZoomMeeting> {
  const token = await resolveToken(hostUserId);

  const body = {
    topic: params.topic,
    type: 2,
    start_time: params.startTime.toISOString(),
    duration: params.durationMinutes,
    timezone: params.timezone ?? 'UTC',
    agenda: params.agenda ?? '',
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: false,
      waiting_room: true,
      auto_recording: 'none',
    },
  };

  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create Zoom meeting: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    id: number;
    join_url: string;
    start_url: string;
    password: string;
  };

  return {
    id: String(data.id),
    joinUrl: data.join_url,
    startUrl: data.start_url,
    password: data.password,
  };
}

export async function updateZoomMeeting(
  meetingId: string,
  params: Partial<CreateMeetingParams>,
  hostUserId?: string
): Promise<void> {
  const token = await resolveToken(hostUserId);

  const body: Record<string, unknown> = {};
  if (params.topic) body.topic = params.topic;
  if (params.startTime) body.start_time = params.startTime.toISOString();
  if (params.durationMinutes) body.duration = params.durationMinutes;
  if (params.agenda) body.agenda = params.agenda;

  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Failed to update Zoom meeting: ${res.status} ${err}`);
  }
}

export async function deleteZoomMeeting(
  meetingId: string,
  hostUserId?: string
): Promise<void> {
  const token = await resolveToken(hostUserId);

  const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Failed to delete Zoom meeting: ${res.status} ${err}`);
  }
}
