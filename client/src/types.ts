export interface User {
  id: string;
  email: string;
  role: 'author' | 'admin';
  authorId?: string | null;
  name?: string;
}

export interface Book {
  bookId: string;
  authorId: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: string;
  mrp: number | null;
  authorRoyaltyPerCopy: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
}

export interface Author {
  authorId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedDate: string;
  books?: Book[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderRole: 'author' | 'admin';
  senderName: string;
  messageText: string;
  isInternalNote: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  authorId: string;
  author?: Author;
  bookId?: string | null;
  book?: Book | null;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  aiClassification?: string | null;
  aiPriority?: string | null;
  aiDraftResponse?: string | null;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}
