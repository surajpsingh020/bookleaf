import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt, requireRole } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types.js';
import { catalogService } from '../services/catalogService.js';
import { ticketService } from '../services/ticketService.js';

const router = Router();

// Protect all author routes with JWT and author/admin role
router.use(authenticateJwt);
router.use(requireRole('author'));

const createTicketSchema = z.object({
  bookId: z.string().nullable().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(150, 'Subject cannot exceed 150 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description cannot exceed 2000 characters')
});

/**
 * GET /api/author/books
 * Returns author's published & in-production books with full royalty breakdown
 */
router.get('/books', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user?.authorId;
    if (!authorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AUTHOR_PROFILE', message: 'User is not linked to an author profile' }
      });
    }

    const catalog = await catalogService.getAuthorCatalog(authorId);
    return res.json({
      success: true,
      data: catalog
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/author/tickets
 * Returns all tickets submitted by the logged-in author
 */
router.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user?.authorId;
    if (!authorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AUTHOR_PROFILE', message: 'User is not linked to an author profile' }
      });
    }

    const tickets = await ticketService.getAuthorTickets(authorId);
    return res.json({
      success: true,
      data: tickets
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/author/tickets
 * Raises a new support query; triggers AI triage and response draft
 */
router.post('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user?.authorId;
    if (!authorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AUTHOR_PROFILE', message: 'User is not linked to an author profile' }
      });
    }

    const validation = createTicketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ticket submission parameters',
          details: validation.error.errors
        }
      });
    }

    const ticket = await ticketService.createTicket(authorId, validation.data);
    return res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error: any) {
    console.error('Create ticket error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/author/tickets/:id
 * Retrieves ticket thread and admin replies
 */
router.get('/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user?.authorId;
    if (!authorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AUTHOR_PROFILE', message: 'User is not linked to an author profile' }
      });
    }

    const ticket = await ticketService.getAuthorTicketById(authorId, req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found or unauthorized access' }
      });
    }

    return res.json({
      success: true,
      data: ticket
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/author/tickets/:id/messages
 * Author adds a follow-up reply in ticket thread
 */
router.post('/tickets/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authorId = req.user?.authorId;
    const { messageText } = req.body;

    if (!authorId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_AUTHOR_PROFILE', message: 'User is not linked to an author profile' }
      });
    }

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message text cannot be empty' }
      });
    }

    const ticket = await ticketService.getAuthorTicketById(authorId, req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found or unauthorized' }
      });
    }

    const message = await ticketService.addTicketMessage(
      ticket.id,
      'author',
      req.user?.name || 'Author',
      messageText.trim(),
      false
    );

    return res.status(201).json({
      success: true,
      data: message
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

export default router;
