import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from '@shared/database/repositories/BaseRepository';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { Subscription, Invoice, FeatureUsage, SubscriptionTier, BillingInterval } from '../domain/BillingSchemas';

export class SubscriptionRepository extends BaseRepository<Subscription> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'subscriptions');
  }

  public async getByUserId(userId: string): Promise<Result<Subscription, AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Default Free Subscription if none exists
        const defaultSub: Partial<Subscription> = {
          user_id: userId,
          tier: 'free',
          interval: 'monthly',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false
        };

        const { data: created, error: createErr } = await this.supabase
          .from('subscriptions')
          .upsert(defaultSub, { onConflict: 'user_id' })
          .select()
          .single();

        if (createErr) throw createErr;
        return ok(created as Subscription);
      }

      return ok(data as Subscription);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async upsertSubscription(userId: string, data: Partial<Subscription>): Promise<Result<Subscription, AppError>> {
    try {
      const payload = { ...data, user_id: userId };
      const { data: updated, error } = await this.supabase
        .from('subscriptions')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return ok(updated as Subscription);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getInvoices(userId: string): Promise<Result<Invoice[], AppError>> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ok(data as Invoice[]);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async recordPaymentEvent(eventId: string, eventType: string, payload: any): Promise<Result<boolean, AppError>> {
    try {
      const { error } = await this.supabase
        .from('payment_events')
        .insert({
          event_id: eventId,
          event_type: eventType,
          payload,
          status: 'PROCESSED',
          processed_at: new Date().toISOString()
        });

      if (error) {
        if (error.code === '23505') {
          // Already processed idempotently
          return ok(false);
        }
        throw error;
      }
      return ok(true);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async checkAndUpdateFeatureUsage(userId: string, featureKey: string, limit: number): Promise<Result<{ allowed: boolean; remaining: number }, AppError>> {
    try {
      const now = new Date();
      const { data: existing, error } = await this.supabase
        .from('feature_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('feature_key', featureKey)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!existing || new Date(existing.reset_at) <= now) {
        // Reset or initialize counter
        const resetAt = new Date(now.valueOf() + 24 * 60 * 60 * 1000).toISOString();
        const { data: upserted, error: upErr } = await this.supabase
          .from('feature_usage')
          .upsert({
            user_id: userId,
            feature_key: featureKey,
            usage_count: 1,
            reset_at: resetAt
          }, { onConflict: 'user_id,feature_key' })
          .select()
          .single();

        if (upErr) throw upErr;
        return ok({ allowed: true, remaining: limit - 1 });
      }

      if (existing.usage_count >= limit) {
        return ok({ allowed: false, remaining: 0 });
      }

      // Increment counter
      const { data: updated, error: incErr } = await this.supabase
        .from('feature_usage')
        .update({ usage_count: existing.usage_count + 1 })
        .eq('id', existing.id)
        .select()
        .single();

      if (incErr) throw incErr;
      return ok({ allowed: true, remaining: limit - updated.usage_count });
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }

  public async getAdminRevenueMetrics(): Promise<Result<{ totalMRR: number; totalARR: number; activeSubscriptions: number; failedPaymentsCount: number; tierBreakdown: Record<string, number> }, AppError>> {
    try {
      const { data: subs, error: subErr } = await this.supabase
        .from('subscriptions')
        .select('tier, interval, status');

      if (subErr) throw subErr;

      let totalMRR = 0;
      let totalARR = 0;
      let activeSubs = 0;
      let failedPayments = 0;
      const tierBreakdown: Record<string, number> = { free: 0, pro: 0, elite: 0 };

      for (const s of subs || []) {
        tierBreakdown[s.tier] = (tierBreakdown[s.tier] || 0) + 1;
        if (s.status === 'active') {
          activeSubs++;
          if (s.tier === 'pro') {
            totalMRR += s.interval === 'monthly' ? 19 : 15.83;
            totalARR += s.interval === 'yearly' ? 190 : 228;
          } else if (s.tier === 'elite') {
            totalMRR += s.interval === 'monthly' ? 49 : 40.83;
            totalARR += s.interval === 'yearly' ? 490 : 588;
          }
        } else if (s.status === 'past_due' || s.status === 'incomplete') {
          failedPayments++;
        }
      }

      return ok({
        totalMRR: Math.round(totalMRR),
        totalARR: Math.round(totalARR),
        activeSubscriptions: activeSubs,
        failedPaymentsCount: failedPayments,
        tierBreakdown
      });
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
