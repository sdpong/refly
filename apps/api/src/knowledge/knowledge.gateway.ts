import { Request } from 'express';
import { Logger } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { Server, Hocuspocus } from '@hocuspocus/server';
import { Logger as HocuspocusLogger } from '@hocuspocus/extension-logger';
import { Database } from '@hocuspocus/extension-database';
import { OnGatewayConnection, WebSocketGateway } from '@nestjs/websockets';
import { MinioService } from '../common/minio.service';
import { PrismaService } from '../common/prisma.service';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../auth/dto';
import { Resource, User } from '@prisma/client';

interface NoteContext {
  resource: Resource;
  user: User;
}

@WebSocketGateway(1234, {
  cors: {
    origin: '*',
  },
})
export class NoteWsGateway implements OnGatewayConnection {
  private server: Hocuspocus;
  private logger = new Logger(NoteWsGateway.name);

  constructor(
    private minio: MinioService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.server = Server.configure({
      port: 1234,
      extensions: [
        new HocuspocusLogger(),
        new Database({
          fetch: async ({ context }: { context: NoteContext }) => {
            const { resource } = context;
            if (!resource.stateStorageKey) return null;
            try {
              return await this.minio.downloadData(resource.stateStorageKey);
            } catch (err) {
              this.logger.error(`fetch state failed for ${resource}, err: ${err.stack}`);
              return null;
            }
          },
          store: async ({ state, context }: { state: Buffer; context: NoteContext }) => {
            const { resource } = context;
            if (!resource.stateStorageKey) {
              resource.stateStorageKey = `state/${resource.resourceId}`;
              await this.prisma.resource.update({
                where: { resourceId: resource.resourceId },
                data: { stateStorageKey: resource.stateStorageKey },
              });
            }
            await this.minio.uploadData(resource.stateStorageKey, state);
          },
        }),
      ],
      onAuthenticate: async ({ token, documentName }) => {
        const decoded = jwt.verify(token, this.config.getOrThrow('auth.jwt.secret'));
        if (!decoded) {
          throw new Error('Not authorized!');
        }
        let payload: JwtPayload;
        if (typeof decoded === 'string') {
          payload = JSON.parse(decoded);
        } else {
          payload = decoded as JwtPayload;
        }

        const resource = await this.prisma.resource.findFirst({
          where: { resourceId: documentName, deletedAt: null },
        });
        if (resource.userId !== Number(payload.id)) {
          throw new Error(`user not authorized: ${documentName}`);
        }
        if (resource.readOnly) {
          throw new Error(`read-only resource: ${documentName}`);
        }
        const user = await this.prisma.user.findUnique({
          where: { id: Number(payload.id) },
        });
        if (!user) {
          throw new Error(`user not found`);
        }

        // Set contextual data to use it in other hooks
        return { user, resource } as NoteContext;
      },
    });
  }

  handleConnection(connection: WebSocket, request: Request): void {
    this.server.handleConnection(connection, request);
  }
}
