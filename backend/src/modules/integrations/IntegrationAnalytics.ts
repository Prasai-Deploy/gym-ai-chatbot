import { IntegrationAnalyticsRecord } from './integration.types';

const analyticsStore: IntegrationAnalyticsRecord[] = [];

export class IntegrationAnalytics {
  public record(entry: Omit<IntegrationAnalyticsRecord, 'timestamp'>): void {
    analyticsStore.push({ ...entry, timestamp: new Date().toISOString() });
  }

  public getAll(): IntegrationAnalyticsRecord[] {
    return analyticsStore;
  }

  public getByOrg(organizationId: string): IntegrationAnalyticsRecord[] {
    return analyticsStore.filter((r) => r.organizationId === organizationId);
  }

  public getSummary(organizationId: string) {
    const records = this.getByOrg(organizationId);
    const byProvider: Record<string, number> = {};
    records.forEach((r) => {
      byProvider[r.provider] = (byProvider[r.provider] || 0) + 1;
    });
    return { totalEvents: records.length, byProvider };
  }
}

export const integrationAnalytics = new IntegrationAnalytics();
