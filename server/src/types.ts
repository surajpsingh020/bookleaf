import { Request } from 'express';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: 'author' | 'admin';
  authorId?: string | null;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: Record<string, any>;
}

export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
] as const;

export type TicketCategory = typeof TICKET_CATEGORIES[number];

export const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type TicketPriority = typeof TICKET_PRIORITIES[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatus = typeof TICKET_STATUSES[number];
