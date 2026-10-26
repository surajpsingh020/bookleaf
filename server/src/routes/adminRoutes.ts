import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateJwt, requireAdmin } from '../middleware/auth.js';
import { AuthenticatedRequest, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../types.js';
import { ticketService } from '../services/ticketService.js';
import { prisma } from '../db.js';

const router = Router();

// Protect all admin routes with JWT and admin role check
router.use(authenticateJwt);
router.use(requireAdmin);

const updateTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedTo: z.string().nullable().optional(),
  aiDraftResponse: z.string().optional()
});

const adminMessageSchema = z.object({
  messageText: z.string().min(1, 'Message cannot be empty'),
  isInternalNote: z.boolean().default(false)
});

/**
 * GET /api/admin/tickets
 * Main operations queue with multi-dimensional filtering
 */
router.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, priority, category, search } = req.query;

    const tickets = await ticketService.getAdminTickets({
      status: status as string,
      priority: priority as string,
      category: category as string,
      search: search as string
    });

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
 * GET /api/admin/tickets/:id
 * Full ticket inspector view including private notes and author catalog snapshot
 */
router.get('/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticket = await ticketService.getAdminTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found' }
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
 * PATCH /api/admin/tickets/:id
 * Updates status, overrides AI category/priority, or assigns ticket to agent
 */
router.patch('/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = updateTicketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update attributes',
          details: validation.error.errors
        }
      });
    }

    const updated = await ticketService.updateTicket(req.params.id, validation.data);
    return res.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/admin/tickets/:id/messages
 * Sends public response to author (transitions status to In Progress) OR records private internal note
 */
router.post('/tickets/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = adminMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid message payload',
          details: validation.error.errors
        }
      });
    }

    const { messageText, isInternalNote } = validation.data;
    const adminName = req.user?.name || 'Admin Operations';

    const message = await ticketService.addTicketMessage(
      req.params.id,
      'admin',
      adminName,
      messageText,
      isInternalNote
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

/**
 * POST /api/admin/tickets/:id/ai-regenerate
 * Re-runs AI draft generation with knowledge base grounding
 */
router.post('/tickets/:id/ai-regenerate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await ticketService.regenerateDraft(req.params.id);
    return res.json({
      success: true,
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/admin/stats
 * Dashboard summary statistics
 */
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [total, open, inProgress, resolved, critical] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'Open' } }),
      prisma.ticket.count({ where: { status: 'In Progress' } }),
      prisma.ticket.count({ where: { status: 'Resolved' } }),
      prisma.ticket.count({ where: { priority: 'Critical', status: { in: ['Open', 'In Progress'] } } })
    ]);

    return res.json({
      success: true,
      data: {
        total,
        open,
        inProgress,
        resolved,
        critical
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

export default router;
