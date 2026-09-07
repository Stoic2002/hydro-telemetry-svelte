import { httpAuditRepository } from './http-audit-repository';
import type { AuditRepository } from './audit-repository';

export const auditRepository: AuditRepository = httpAuditRepository;
