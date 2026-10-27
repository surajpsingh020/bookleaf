import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

import authRoutes from './routes/authRoutes.js';
import authorRoutes from './routes/authorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BookLeaf Support Portal API',
    aiProvider: process.env.LLM_PROVIDER || 'fallback',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/author', authorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/realtime', realtimeRoutes);

// Optional: Serve client build if available (for production single-port deployment)
const possibleClientPaths = [
  path.join(process.cwd(), '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../../../client/dist')
];
const clientBuildPath = possibleClientPaths.find((p) => fs.existsSync(p));
if (clientBuildPath) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// 404 Handler for API
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// Centralized Error Handling Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred on the server',
    },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 BookLeaf Support API Server running on http://localhost:${PORT}`);
  console.log(`📡 Real-Time SSE Stream live on http://localhost:${PORT}/api/realtime/stream`);
  console.log(`🤖 AI Provider: ${process.env.LLM_PROVIDER || 'fallback'}`);
});
