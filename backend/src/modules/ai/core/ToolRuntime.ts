import { ToolRegistry } from '../tools/ToolRegistry';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';
import { logger } from '@logger/index';

export class ToolRuntime {
  constructor(private readonly registry: ToolRegistry) {}

  public async executeToolCall(toolCall: any, userId: string): Promise<Result<any, AppError>> {
    const { name, arguments: argsJson } = toolCall.function;
    
    logger.info(`[ToolRuntime] Executing tool ${name} for user ${userId}`);

    const tool = this.registry.getTool(name);
    if (!tool) {
      logger.warn(`[ToolRuntime] Tool ${name} not found`);
      return fail(new AppError(`Tool ${name} not found`, 404));
    }

    let parsedArgs;
    try {
      parsedArgs = typeof argsJson === 'string' ? JSON.parse(argsJson) : argsJson;
    } catch (err) {
      return fail(new AppError('Invalid JSON arguments provided to tool', 400));
    }

    try {
      // Execute the tool (which includes Zod validation internally)
      const result = await tool.execute(parsedArgs, userId);
      return result;
    } catch (err: any) {
      logger.error({ err, name }, '[ToolRuntime] Unhandled tool execution error');
      return fail(new AppError('Internal tool execution error', 500));
    }
  }
}
