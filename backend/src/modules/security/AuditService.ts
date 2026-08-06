import { SecurityAuditLog } from './security.types';
import { logger } from '@logger/index';

export class AuditService {
  public log(entry: Omit<SecurityAuditLog, 'id' | 'timestamp'>): SecurityAuditLog {
    const auditLog: SecurityAuditLog = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    // Log with structured output for SIEM integration
    logger.info(`[AuditService] ${auditLog.severity.toUpperCase()} | org:${auditLog.organizationId} | user:${auditLog.userId || 'system'} | action:${auditLog.action} | entity:${auditLog.entityType}${auditLog.entityId ? ':' + auditLog.entityId : ''} | correlationId:${auditLog.correlationId || 'n/a'}`);

    return auditLog;
  }

  // Pre-defined audit event helpers
  public logAuthLogin(userId: string, orgId: string, ip: string, correlationId: string): SecurityAuditLog {
    return this.log({ organizationId: orgId, userId, action: 'AUTH_LOGIN', entityType: 'session', ipAddress: ip, correlationId, severity: 'low' });
  }

  public logAuthLogout(userId: string, orgId: string, correlationId: string): SecurityAuditLog {
    return this.log({ organizationId: orgId, userId, action: 'AUTH_LOGOUT', entityType: 'session', correlationId, severity: 'low' });
  }

  public logMemberExport(userId: string, orgId: string, correlationId: string): SecurityAuditLog {
    return this.log({ organizationId: orgId, userId, action: 'MEMBER_EXPORT', entityType: 'members', correlationId, severity: 'medium' });
  }

  public logCardRetry(userId: string, orgId: string, invoiceId: string, correlationId: string): SecurityAuditLog {
    return this.log({ organizationId: orgId, userId, action: 'CARD_RETRY', entityType: 'invoice', entityId: invoiceId, correlationId, severity: 'medium' });
  }

  public logGuestPassOverride(userId: string, orgId: string, memberId: string, correlationId: string): SecurityAuditLog {
    return this.log({ organizationId: orgId, userId, action: 'GUEST_PASS_OVERRIDE', entityType: 'member', entityId: memberId, correlationId, severity: 'high' });
  }

  public logGdprErasure(userId: string, orgId: string, targetUserId: string, correlationId: string): SecurityAuditLog {
    return this.log({ organizationId: orgId, userId, action: 'GDPR_ERASURE', entityType: 'member', entityId: targetUserId, correlationId, severity: 'critical' });
  }
}

export const auditService = new AuditService();
