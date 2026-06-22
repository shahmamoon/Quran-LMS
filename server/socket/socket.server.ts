import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.utils.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

interface AuthSocket extends Socket {
  userId?: string;
  userRole?: string;
}

// Module-level singleton so routes can call getIo() without threading io everywhere
let _io: SocketServer | null = null;

/** Returns the initialised Socket.IO server. Throws if called before initSocketServer(). */
export function getIo(): SocketServer {
  if (!_io) throw new Error('[Socket] getIo() called before initSocketServer()');
  return _io;
}

export function initSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    if (!socket.userId) return;
    if (env.NODE_ENV !== 'production') {
      console.log(`[Socket] User ${socket.userId} connected`);
    }

    // Mark user as seen on connect — fire-and-forget, never fail the connection
    prisma.user.update({ where: { id: socket.userId }, data: { lastSeenAt: new Date() } }).catch(() => null);

    // Join personal room for targeted notifications
    socket.join(`user:${socket.userId}`);

    // Join conversation rooms — verify the user is actually a participant first
    socket.on('join:conversation', async (conversationId: string) => {
      if (!socket.userId) return;
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId: socket.userId } },
      }).catch(() => null);
      if (!participant) {
        socket.emit('error', { message: 'Not a participant in this conversation' });
        return;
      }
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Send message via socket — verify sender is a participant before writing to DB
    socket.on('message:send', async (data: { conversationId: string; content: string; type?: string }) => {
      if (!socket.userId) return;
      try {
        // Authorization: must be a participant to send
        const participant = await prisma.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId: data.conversationId, userId: socket.userId } },
        });
        if (!participant) {
          socket.emit('error', { message: 'Not a participant in this conversation' });
          return;
        }

        const message = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: socket.userId,
            content: data.content,
            type: (data.type as 'TEXT' | 'FILE') ?? 'TEXT',
          },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        });

        // Update sender's lastReadAt so they don't count their own message as unread
        prisma.conversationParticipant.updateMany({
          where: { conversationId: data.conversationId, userId: socket.userId },
          data: { lastReadAt: new Date() },
        }).catch(() => null);

        // Broadcast to conversation room (all active viewers)
        io.to(`conv:${data.conversationId}`).emit('message:new', message);

        // Also push to each recipient's personal room for unread count updates
        // (covers users who aren't currently viewing the chat)
        const allParticipants = await prisma.conversationParticipant.findMany({
          where: { conversationId: data.conversationId, userId: { not: socket.userId } },
          select: { userId: true },
        });
        allParticipants.forEach(({ userId }) => {
          io.to(`user:${userId}`).emit('chat:unread', {
            conversationId: data.conversationId,
            message: { id: message.id, content: message.content, sender: message.sender, createdAt: message.createdAt },
          });
        });
      } catch {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Presence heartbeat — client emits every 2 min while connected
    socket.on('heartbeat', () => {
      if (!socket.userId) return;
      prisma.user.update({ where: { id: socket.userId }, data: { lastSeenAt: new Date() } }).catch(() => null);
    });

    // Typing indicators — no DB write, membership assumed from prior join:conversation
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', { userId: socket.userId, conversationId });
    });
    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', { userId: socket.userId, conversationId });
    });

    socket.on('disconnect', () => {
      if (env.NODE_ENV !== 'production') {
        console.log(`[Socket] User ${socket.userId} disconnected`);
      }
    });
  });

  _io = io; // store singleton reference
  return io;
}

// Helper to push a notification to a specific user
export function pushNotification(
  io: SocketServer,
  userId: string,
  notification: { title: string; body: string; type: string; link?: string }
) {
  io.to(`user:${userId}`).emit('notification:new', notification);
}
