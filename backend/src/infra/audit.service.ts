import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ClockService } from './clock.service';
import { AuditPayload, GENESIS_HASH, StoredAuditEntry, computeHash, verifyChain } from '../domain/audit-chain';

export interface Actor {
  id: string | null;
  email: string;
  name: string;
  role: string;
}

export const SYSTEM_ACTOR: Actor = { id: null, email: 'system@sakshi.local', name: 'JaanchSetu scheduler', role: 'SYSTEM' };

export interface AuditInput {
  actor: Actor;
  action: string;
  entityType: string;
  entityId?: string | null;
  detail?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  // In-process mutex: MongoDB has no advisory locks; single-process is sufficient for this prototype.
  private _lock: Promise<void> = Promise.resolve();

  constructor(private prisma: PrismaService, private clock: ClockService) {}

  async log(input: AuditInput): Promise<{ seq: number; hash: string }> {
    const clockDate = await this.clock.demoDate();
    let resolve!: () => void;
    const next = new Promise<void>((r) => (resolve = r));
    const prev = this._lock;
    this._lock = next;
    try {
      await prev;
      const last = await this.prisma.auditLog.findFirst({ orderBy: { seq: 'desc' }, select: { hash: true, seq: true } });
      const prevHash = last?.hash ?? GENESIS_HASH;
      const seq = (last?.seq ?? 0) + 1;
      const at = new Date();
      const payload: AuditPayload = {
        at: at.toISOString(),
        clockDate,
        actorId: input.actor.id,
        actorEmail: input.actor.email,
        actorRole: input.actor.role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        detail: JSON.parse(JSON.stringify(input.detail ?? {})),
      };
      const hash = computeHash(prevHash, payload);
      const row = await this.prisma.auditLog.create({
        data: {
          seq,
          at,
          clockDate,
          actorId: payload.actorId,
          actorEmail: payload.actorEmail,
          actorRole: payload.actorRole,
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          detail: payload.detail as any,
          prevHash,
          hash,
        },
      });
      return { seq: row.seq, hash: row.hash };
    } finally {
      resolve();
    }
  }

  async verify() {
    const rows = await this.prisma.auditLog.findMany({ orderBy: { seq: 'asc' } });
    const entries: StoredAuditEntry[] = rows.map((r) => ({
      seq: r.seq,
      at: r.at.toISOString(),
      clockDate: r.clockDate,
      actorId: r.actorId,
      actorEmail: r.actorEmail,
      actorRole: r.actorRole,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      detail: r.detail,
      prevHash: r.prevHash,
      hash: r.hash,
    }));
    return verifyChain(entries);
  }
}
