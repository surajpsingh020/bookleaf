import { prisma } from '../db.js';
import { aiService } from './aiService.js';
import { sseService } from './sseService.js';
import { TicketCategory, TicketPriority, TicketStatus } from '../types.js';

export class TicketService {
  /**
   * Generates next sequential ticket number like BL-TKT-1004
   */
  private async getNextTicketNumber(): Promise<string> {
    const count = await prisma.ticket.count();
    return `BL-TKT-${1001 + count}`;
  }

  /**
   * Creates a ticket from an author, triggers AI triage, and generates a draft response.
   */
  public async createTicket(
    authorId: string,
    data: { bookId?: string | null; subject: string; description: string }
  ) {
    const author = await prisma.author.findUnique({
      where: { authorId }
    });

    if (!author) {
      throw new Error(`Author not found: ${authorId}`);
    }

    let book: any = null;
    if (data.bookId) {
      book = await prisma.book.findUnique({
        where: { bookId: data.bookId }
      });
    }

    // Step 1: AI Stage 1 Auto-Classification & Urgency Scoring
    const triage = await aiService.classifyTicket(
      data.subject,
      data.description,
      author.name,
      book?.title
    );

    const ticketNumber = await this.getNextTicketNumber();

    // Step 2: Persist Ticket to DB
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        authorId,
        bookId: data.bookId || null,
        subject: data.subject,
        description: data.description,
        status: 'Open',
        category: triage.category,
        priority: triage.priority,
        aiClassification: triage.category,
        aiPriority: triage.priority
      },
      include: {
        author: true,
        book: true,
        messages: true
      }
    });

    // Step 3: Trigger AI Stage 2 Grounded Response Draft
    try {
      const draftResult = await aiService.generateDraftResponse({
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category as TicketCategory,
        author: { name: author.name, joinedDate: author.joinedDate },
        book
      });

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { aiDraftResponse: draftResult.draftResponse },
        include: {
          author: true,
          book: true,
          messages: true
        }
      });

      // Step 4: Real-Time SSE Broadcast to both Author and Admin Console
      sseService.broadcastTicketUpdate(updatedTicket, 'ticket_created');
      return updatedTicket;
    } catch (err) {
      console.error('Failed to generate draft, returning created ticket:', err);
      sseService.broadcastTicketUpdate(ticket, 'ticket_created');
      return ticket;
    }
  }

  /**
   * Retrieves all tickets for a specific author (strictly filters out internal notes).
   */
  public async getAuthorTickets(authorId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { authorId },
      include: {
        book: true,
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tickets;
  }

  /**
   * Retrieves a single ticket for an author with access control and internal note stripping.
   */
  public async getAuthorTicketById(authorId: string, ticketId: string) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, authorId },
      include: {
        book: true,
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return ticket;
  }

  /**
   * Admin triage queue with multi-attribute filtering (status, priority, category, search).
   */
  public async getAdminTickets(filters: {
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters.status && filters.status !== 'All') {
      where.status = filters.status;
    }
    if (filters.priority && filters.priority !== 'All') {
      where.priority = filters.priority;
    }
    if (filters.category && filters.category !== 'All') {
      where.category = filters.category;
    }
    if (filters.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search } },
        { subject: { contains: filters.search } },
        { description: { contains: filters.search } },
        { author: { name: { contains: filters.search } } },
        { author: { email: { contains: filters.search } } }
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        author: true,
        book: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    return tickets;
  }

  /**
   * Admin full view for a single ticket.
   */
  public async getAdminTicketById(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        author: true,
        book: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return ticket;
  }

  /**
   * Admin updates ticket attributes (status, overrides, assignment).
   */
  public async updateTicket(
    ticketId: string,
    updates: {
      status?: TicketStatus;
      category?: TicketCategory;
      priority?: TicketPriority;
      assignedTo?: string | null;
      aiDraftResponse?: string;
    }
  ) {
    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updates,
      include: {
        author: true,
        book: true,
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    sseService.broadcastTicketUpdate(updated, 'ticket_updated');
    return updated;
  }

  /**
   * Adds an admin response (visible to author) or private internal note.
   */
  public async addTicketMessage(
    ticketId: string,
    senderRole: 'author' | 'admin',
    senderName: string,
    messageText: string,
    isInternalNote: boolean = false
  ) {
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderRole,
        senderName,
        messageText,
        isInternalNote
      }
    });

    // Auto update status if an admin sends a public reply
    if (senderRole === 'admin' && !isInternalNote) {
      const current = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (current?.status === 'Open') {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'In Progress' }
        });
      }
    }

    const fullTicket = await this.getAdminTicketById(ticketId);
    if (fullTicket) {
      sseService.broadcastTicketUpdate(fullTicket, 'new_message');
    }

    return message;
  }

  /**
   * Re-runs AI draft generation with updated parameters or agent request.
   */
  public async regenerateDraft(ticketId: string) {
    const ticket = await this.getAdminTicketById(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const draft = await aiService.generateDraftResponse({
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category as TicketCategory,
      author: { name: ticket.author.name, joinedDate: ticket.author.joinedDate },
      book: ticket.book
    });

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { aiDraftResponse: draft.draftResponse },
      include: {
        author: true,
        book: true,
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    sseService.broadcastTicketUpdate(updated, 'ticket_updated');
    return updated;
  }
}

export const ticketService = new TicketService();
