import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import Redis from 'ioredis';
import { multiplayerService } from '../../services/multiplayer.service';

export class WebSocketServer {
  private io: Server;
  private subRedis: Redis;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.subRedis = new Redis(env.REDIS_URL);
    multiplayerService.setSocketServer(this.io);
    this.setupMiddleware();
    this.setupConnectionHandlers();
    this.setupRedisSubscriber();
  }

  private setupMiddleware(): void {
    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
          id: string;
          username: string;
          role: string;
          nation_id: string | null;
        };

        socket.data.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      logger.info(`WebSocket Client connected: ${user.username} (ID: ${user.id})`);

      if (user.nation_id) {
        const nationRoom = `nation:${user.nation_id}`;
        socket.join(nationRoom);
        logger.info(`User ${user.username} joined room ${nationRoom}`);
      }

      socket.on('cabinet:join', async (data: { role: string }) => {
        try {
          const nationId = user.nation_id;
          if (!nationId) throw new Error('You do not govern a nation');
          await multiplayerService.assignRole(nationId, user.id, user.id, data.role);
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('disconnect', () => {
        logger.info(`WebSocket Client disconnected: ${user.username}`);
      });
    });
  }

  private setupRedisSubscriber(): void {
    this.subRedis.subscribe('tick:completed', (err, count) => {
      if (err) {
        logger.error('Failed to subscribe to Redis tick:completed channel:', err);
      } else {
        logger.info(`Subscribed to Redis channels. Total active subscriptions: ${count}`);
      }
    });

    this.subRedis.on('message', (channel, message) => {
      if (channel === 'tick:completed') {
        try {
          const { nationId } = JSON.parse(message);
          const nationRoom = `nation:${nationId}`;
          logger.info(`Redis PubSub: Tick completed for nation ${nationId}. Broadcasting to WebSocket room.`);

          this.io.to(nationRoom).emit('tick:updated', { nationId, timestamp: new Date().toISOString() });
        } catch (error) {
          logger.error('Failed to process tick:completed Pub/Sub message:', error);
        }
      }
    });
  }

  public getIO(): Server {
    return this.io;
  }
}
