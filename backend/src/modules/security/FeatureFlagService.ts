import { FeatureFlagKey, OrgPlan } from './security.types';

// Plan → Feature flag availability matrix
const PLAN_FEATURES: Record<OrgPlan, FeatureFlagKey[]> = {
  starter: [
    'ai_trinity_copilot',
    'custom_workout_plans',
    'realtime_occupancy',
    'two_factor_auth',
  ],
  growth: [
    'ai_trinity_copilot',
    'multi_location_access',
    'pos_terminal',
    'automated_dunning',
    'advanced_analytics',
    'bulk_member_import',
    'custom_workout_plans',
    'realtime_occupancy',
    'gdpr_export',
    'two_factor_auth',
  ],
  enterprise: [
    'ai_trinity_copilot',
    'multi_location_access',
    'pos_terminal',
    'automated_dunning',
    'advanced_analytics',
    'white_label_branding',
    'api_access',
    'bulk_member_import',
    'custom_workout_plans',
    'realtime_occupancy',
    'gdpr_export',
    'sso_saml',
    'two_factor_auth',
  ],
};

// Environment-level overrides (for dev/staging)
const ENV_OVERRIDES: Partial<Record<FeatureFlagKey, boolean>> = {
  ai_trinity_copilot: true,
};

export class FeatureFlagService {
  private env = process.env.NODE_ENV || 'production';

  public isEnabled(flag: FeatureFlagKey, orgPlan: OrgPlan): boolean {
    // Development overrides
    if (this.env === 'development' && ENV_OVERRIDES[flag] !== undefined) {
      return ENV_OVERRIDES[flag]!;
    }
    return PLAN_FEATURES[orgPlan]?.includes(flag) ?? false;
  }

  public getFlagsForPlan(orgPlan: OrgPlan): FeatureFlagKey[] {
    return PLAN_FEATURES[orgPlan] || [];
  }

  public requireFeature(flag: FeatureFlagKey, orgPlan: OrgPlan): void {
    if (!this.isEnabled(flag, orgPlan)) {
      throw new Error(`Feature '${flag}' is not available on the '${orgPlan}' plan.`);
    }
  }
}

export const featureFlagService = new FeatureFlagService();
