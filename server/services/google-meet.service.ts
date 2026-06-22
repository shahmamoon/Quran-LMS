import { google } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

interface CreateMeetParams {
  title: string;
  startTime: Date;
  durationMinutes: number;
  description?: string;
  hostUserId: string;
}

interface MeetResult {
  eventId: string;
  meetLink: string;
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

export function isGoogleConfigured(): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

export function buildGoogleAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state,
  });
}

export async function exchangeGoogleCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Google OAuth did not return required tokens');
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000),
  };
}

/** Resolves a valid access token for the given user, refreshing silently if expired. */
async function resolveAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
  });

  if (!user?.googleAccessToken || !user.googleRefreshToken) {
    throw new Error('Google Calendar not connected for this user');
  }

  const fiveMinutes = 5 * 60 * 1000;
  const isExpired = !user.googleTokenExpiry || user.googleTokenExpiry.getTime() - Date.now() < fiveMinutes;

  if (!isExpired) return user.googleAccessToken;

  // Silently refresh
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token) throw new Error('Failed to refresh Google access token');

  const expiresAt = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : new Date(Date.now() + 3600_000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: credentials.access_token,
      googleTokenExpiry: expiresAt,
    },
  });

  return credentials.access_token;
}

export async function createGoogleMeetEvent(params: CreateMeetParams): Promise<MeetResult> {
  const accessToken = await resolveAccessToken(params.hostUserId);

  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: client });

  const endTime = new Date(params.startTime.getTime() + params.durationMinutes * 60_000);

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: params.title,
      description: params.description ?? '',
      start: { dateTime: params.startTime.toISOString(), timeZone: 'UTC' },
      end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      conferenceData: {
        createRequest: {
          requestId: `buildai-${params.hostUserId}-${params.startTime.getTime()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  });

  const meetLink =
    event.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ?? '';

  if (!meetLink) throw new Error('Google Meet link not returned from Calendar API');

  return { eventId: event.data.id!, meetLink };
}

export async function deleteGoogleCalendarEvent(eventId: string, hostUserId: string): Promise<void> {
  const accessToken = await resolveAccessToken(hostUserId);
  const client = getOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: 'v3', auth: client });
  await calendar.events.delete({ calendarId: 'primary', eventId }).catch((err) => {
    console.error('Google Calendar event delete failed:', err);
  });
}
