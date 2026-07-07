import { z } from 'zod';
import { Result } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export abstract class BaseTool<TInput, TOutput> {
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly inputSchema: z.ZodSchema<TInput>;
  
  // This is the core logic the tool implements
  protected abstract executeImpl(input: TInput, userId: string): Promise<Result<TOutput, AppError>>;

  // This is the public interface the runtime calls
  public async execute(input: unknown, userId: string): Promise<Result<TOutput, AppError>> {
    // 1. Validation
    const parsed = this.inputSchema.safeParse(input);
    if (!parsed.success) {
      return fail(new AppError(`Validation failed for tool ${this.name}`, 400));
    }

    // 2. Execution (the subclass handles business logic via services)
    return this.executeImpl(parsed.data, userId);
  }

  // Generate OpenAI/Groq compatible tool definition
  public getDefinition(): any {
    // A simplified conversion from Zod to JSON Schema would go here.
    // For this vertical slice, we'll return a stub.
    return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: { type: 'object', properties: {} } // In a real app, use zod-to-json-schema
      }
    };
  }
}

// Ensure `fail` is available if needed by subclasses without importing Result everywhere
import { fail } from '@shared/core/Result';
