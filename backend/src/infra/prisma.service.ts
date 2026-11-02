import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import '../config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

/** No-op on MongoDB: immutability is enforced at the application layer (no delete/update API for AuditLog). */
export async function ensureAuditImmutability(_prisma: PrismaClient) {
  // PostgreSQL trigger not applicable to MongoDB.
}
