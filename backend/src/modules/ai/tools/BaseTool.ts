import { z } from 'zod';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface ToolContext {
  userId: string;
  organizationId?: string;
  userRole?: string;
}

export abstract class BaseTool<TInput = any, TOutput = any> {
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly inputSchema: z.ZodSchema<TInput>;
  public readonly requiredRole?: string | string[];

  protected abstract executeImpl(input: TInput, context: ToolContext): Promise<Result<TOutput, AppError>>;

  public async execute(input: unknown, context: string | ToolContext): Promise<Result<TOutput, AppError>> {
    const ctx: ToolContext = typeof context === 'string' ? { userId: context } : context;

    // 1. Validation
    const parsed = this.inputSchema.safeParse(input);
    if (!parsed.success) {
      return fail(new AppError(`Validation failed for tool ${this.name}: ${JSON.stringify(parsed.error.format())}`, 400));
    }

    // 2. Execution via domain services
    return this.executeImpl(parsed.data, ctx);
  }

  public getDefinition(): any {
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: { type: 'object', properties: {} }
      }
    };
  }
}

// Ensure `fail` is available if needed by subclasses without importing Result everywhere
import { fail } from '@shared/core/Result';
