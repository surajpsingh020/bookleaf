import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sseService } from '../services/sseService.js';
import { AuthUserPayload } from '../types.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf_jwt_secret_dev_key_2026_eval';

/**
 * GET /api/realtime/stream
 * Server-Sent Events endpoint for real-time ticket updates and message streaming.
 * Accepts JWT either via Authorization header or ?token= query parameter
 * (enabling native browser EventSource connections).
 */
router.get('/stream', (req: Request, res: Response) => {
  const token =
    (req.query.token as string) ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token required for SSE connection' }
    });
  }

  let user: AuthUserPayload;
  try {
    user = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired SSE token' }
    });
  }

  // Set standard SSE HTTP headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `${user.userId}-${Date.now()}`;
  sseService.addClient({
    id: clientId,
    userId: user.userId,
    role: user.role,
    authorId: user.authorId,
    res
  });
});

export default router;
