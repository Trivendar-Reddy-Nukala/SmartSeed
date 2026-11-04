// ============================================================
// WebSocket Server — Real-time notifications and dashboard updates
// ============================================================

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../config/logger';
import type { TokenPayload } from '@smartseed/shared';

let io: Server;

export function initWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // Notification namespace
  const notifNamespace = io.of('/notifications');
  notifNamespace.on('connection', (socket: Socket) => {
    const user = (socket as any).user as TokenPayload;
    // Join user's personal room and tenant room
    socket.join(`user:${user.userId}`);
    if (user.tenantId) socket.join(`tenant:${user.tenantId}`);
    logger.debug('WebSocket connected', { userId: user.userId, namespace: 'notifications' });

    socket.on('disconnect', () => {
      logger.debug('WebSocket disconnected', { userId: user.userId });
    });
  });

  // Dashboard namespace for real-time updates
  const dashNamespace = io.of('/dashboard');
  dashNamespace.on('connection', (socket: Socket) => {
    const user = (socket as any).user as TokenPayload;
    if (user.tenantId) socket.join(`tenant:${user.tenantId}`);
    logger.debug('Dashboard WebSocket connected', { userId: user.userId });
  });

  logger.info('WebSocket server initialized');
  return io;
}

export function getIO(): Server {
  return io;
}

/**
 * Emit a notification to a specific user
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.of('/notifications').to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emit to all users in a tenant
 */
export function emitToTenant(tenantId: string, event: string, data: unknown): void {
  if (io) {
    io.of('/dashboard').to(`tenant:${tenantId}`).emit(event, data);
  }
}

