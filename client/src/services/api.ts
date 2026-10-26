import { User, Book, Ticket, TicketMessage } from '../types';

const API_BASE = '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('bookleaf_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('bookleaf_token', token);
  } else {
    localStorage.removeItem('bookleaf_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.error?.message || `Request failed with status ${response.status}`);
  }

  return data.data;
}

// Auth API
export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<User>('/auth/me'),

  getDemoUsers: () =>
    request<{
      admin: { email: string; password: string };
      defaultAuthorPassword: string;
      authors: Array<{ authorId: string; name: string; email: string }>;
    }>('/auth/demo-users'),

  // Author API
  getAuthorBooks: () =>
    request<{
      author: {
        authorId: string;
        name: string;
        email: string;
        phone: string;
        city: string;
        joinedDate: string;
      };
      summary: {
        totalBooks: number;
        totalCopiesSold: number;
        totalRoyaltyEarned: number;
        totalRoyaltyPaid: number;
        totalRoyaltyPending: number;
      };
      books: Book[];
    }>('/author/books'),

  getAuthorTickets: () => request<Ticket[]>('/author/tickets'),

  getAuthorTicketById: (id: string) => request<Ticket>(`/author/tickets/${id}`),

  createTicket: (data: { bookId?: string | null; subject: string; description: string }) =>
    request<Ticket>('/author/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  sendAuthorMessage: (ticketId: string, messageText: string) =>
    request<TicketMessage>(`/author/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ messageText }),
    }),

  // Admin API
  getAdminTickets: (params?: { status?: string; priority?: string; category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<Ticket[]>(`/admin/tickets${queryString}`);
  },

  getAdminTicketById: (id: string) => request<Ticket>(`/admin/tickets/${id}`),

  updateAdminTicket: (
    id: string,
    updates: {
      status?: string;
      category?: string;
      priority?: string;
      assignedTo?: string | null;
      aiDraftResponse?: string;
    }
  ) =>
    request<Ticket>(`/admin/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  sendAdminMessage: (ticketId: string, messageText: string, isInternalNote: boolean = false) =>
    request<TicketMessage>(`/admin/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ messageText, isInternalNote }),
    }),

  regenerateAiDraft: (ticketId: string) =>
    request<Ticket>(`/admin/tickets/${ticketId}/ai-regenerate`, {
      method: 'POST',
    }),

  getAdminStats: () =>
    request<{
      total: number;
      open: number;
      inProgress: number;
      resolved: number;
      critical: number;
    }>('/admin/stats'),
};
