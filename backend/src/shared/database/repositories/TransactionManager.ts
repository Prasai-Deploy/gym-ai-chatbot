import { SupabaseClient } from '@supabase/supabase-js';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

/**
 * Supabase/PostgREST does not natively support long-lived interactive
 * transactions from the client (e.g., BEGIN; ...; COMMIT;).
 * Instead, atomic multi-table operations must be executed via RPC functions.
 * This Manager acts as a semantic wrapper for calling those transactional RPCs.
 */
export class TransactionManager {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Executes a database RPC function that contains its own internal SQL transaction.
   * @param rpcName The name of the Postgres function to execute
   * @param payload The JSON payload to pass to the function
   */
  public async executeTransaction<T>(
    rpcName: string,
    payload: any
  ): Promise<Result<T, AppError>> {
    try {
      const { data, error } = await this.supabase.rpc(rpcName, payload);
      
      if (error) {
        return fail(new AppError(`Transaction failed: ${error.message}`, 500));
      }
      
      return ok(data as T);
    } catch (err: any) {
      return fail(new AppError(err.message, 500));
    }
  }
}
