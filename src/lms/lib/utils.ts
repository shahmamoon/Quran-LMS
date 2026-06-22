import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`;
}

export function initials(user: { firstName: string; lastName: string }) {
  return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
}

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...opts,
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Date + time WITH the viewer's local timezone abbreviation, e.g.
 * "Jun 3, 2026, 10:00 AM EDT". The abbreviation is whatever the viewer's
 * browser is set to, so each person sees the same instant in their own zone.
 */
export function formatDateTimeTz(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(date));
}

export function formatRelative(date: string | Date) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function sessionStatusColor(status: string) {
  switch (status) {
    case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
    case 'LIVE': return 'bg-green-100 text-green-700';
    case 'COMPLETED': return 'bg-slate-100 text-slate-600';
    case 'CANCELLED': return 'bg-red-100 text-red-600';
    default: return 'bg-slate-100 text-slate-600';
  }
}
