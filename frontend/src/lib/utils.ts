import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, formatStr: string = 'EEEE, do MMMM') {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}mins`;
  if (mins === 0) return `${hours}hr`;
  return `${hours}hr ${mins}mins`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
  }).format(amount);
}

export function getDateRange(days: number = 14): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
}

export function groupSeatsByRow<T extends { row: string; number: number }>(seats: T[]) {
  const grouped: Record<string, T[]> = {};
  for (const seat of seats) {
    if (!grouped[seat.row]) {
      grouped[seat.row] = [];
    }
    grouped[seat.row].push(seat);
  }
  // Sort seats within each row by number
  for (const row of Object.keys(grouped)) {
    grouped[row].sort((a, b) => a.number - b.number);
  }
  return grouped;
}
