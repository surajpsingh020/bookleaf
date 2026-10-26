import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authenticateJwt } from '../middleware/auth.js';
import { AuthenticatedRequest, AuthUserPayload } from '../types.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf_jwt_secret_dev_key_2026_eval';

/**
 * POST /api/auth/login
 * Standard email/password authentication
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email and password are required' }
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { author: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
      });
    }

    const payload: AuthUserPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as 'author' | 'admin',
      authorId: user.authorId,
      name: user.author?.name || (user.role === 'admin' ? 'Admin Operations' : 'Author')
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          authorId: user.authorId,
          name: payload.name
        }
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'An unexpected authentication error occurred' }
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current active session profile
 */
router.get('/me', authenticateJwt, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: { author: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User record not found' }
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        authorId: user.authorId,
        name: user.author?.name || (user.role === 'admin' ? 'Admin Operations' : 'Author')
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/auth/demo-users
 * Returns list of seeded accounts to assist reviewer one-click testing
 */
router.get('/demo-users', async (_req: Request, res: Response) => {
  try {
    const authors = await prisma.author.findMany({
      take: 10,
      orderBy: { authorId: 'asc' },
      select: { authorId: true, name: true, email: true }
    });

    return res.json({
      success: true,
      data: {
        admin: { email: 'admin@bookleafpub.com', password: 'admin123' },
        defaultAuthorPassword: 'password123',
        authors
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
