import { httpClient } from './httpClient';

export type EntitlementState =
  | 'DEMO'
  | 'TRIAL'
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'EXPIRED'
  | 'CANCELLED';

export interface EntitlementLimits {
  ai_queries_daily: number;
  ai_plans_monthly: number;
  pt_assignment: boolean;
  history_days: number;
  [key: string]: any;
}

export interface EntitlementInfo {
  state: EntitlementState;
  hasAccess: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  tier: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  limits?: EntitlementLimits;
  entitlement?: any;
  subscription?: any;
}

export const entitlementApi = {
  getStatus: async (): Promise<EntitlementInfo> => {
    const res: any = await httpClient.get('/billing/status');
    // httpClient interceptor returns response.data directly.
    // If backend returns { success: true, data: { ... } }, res.data contains the payload.
    const data = res?.data || res;
    return {
      state: data.state,
      hasAccess: Boolean(data.hasAccess),
      daysRemaining: typeof data.daysRemaining === 'number' ? data.daysRemaining : 0,
      trialEndsAt: data.trialEndsAt || null,
      currentPeriodEnd: data.currentPeriodEnd || null,
      tier: data.tier || 'free',
      status: data.status || 'unknown',
      cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
      limits: data.limits,
      entitlement: data.entitlement,
      subscription: data.subscription,
    };
  },
};
