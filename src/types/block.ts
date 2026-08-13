export type RecurrenceType = 'daily' | 'weekly' | 'weekdays' | 'custom';

export interface Recurrence {
  type: RecurrenceType;
  days?: number[];
  until_date?: string;
}

export interface Block {
  id: string;
  title: string;
  date: string;
  start_min: number;
  duration_min: number;
  notes: string;
  recurrence?: Recurrence | null;
  created_at: number;
}

export type CalendarView = 'day' | 'week' | 'month';
