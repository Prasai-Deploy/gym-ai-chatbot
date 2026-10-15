import { ToolRegistry } from '../tools/ToolRegistry';
import { ToolPermissionEngine } from '../safety/ToolPermissionEngine';
import { ToolContext } from '../tools/BaseTool';
import { Result, ok, fail } from '@shared/core/Result';
import { AppError, NotFoundError } from '@errors/AppError';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@logger/index';

export class ToolExecutor {
  private readonly permissionEngine = new ToolPermissionEngine();

  constructor(
    private readonly registry: ToolRegistry,
    private readonly supabase?: SupabaseClient
  ) {}

  public async executeToolCall(
    toolName: string,
    argsInput: any,
    context: ToolContext,
    conversationId?: string
  ): Promise<Result<any, AppError>> {
    const startTime = Date.now();
    logger.info(`[ToolExecutor] Invoking tool '${toolName}' for user '${context.userId}'`);

    const tool = this.registry.getTool(toolName);
    if (!tool) {
      return fail(new NotFoundError(`Tool '${toolName}' not registered`));
    }

    let parsedArgs: any = argsInput;
    if (typeof argsInput === 'string') {
      try {
        parsedArgs = JSON.parse(argsInput);
      } catch (e) {
        return fail(new AppError(`Invalid JSON arguments for tool '${toolName}'`, 400));
      }
    }

    // Security & Permission Enforcement
    const permRes = this.permissionEngine.validateToolExecution(tool, context, parsedArgs);
    if (permRes.isFailure()) {
      logger.warn(`[ToolExecutor] Permission denied for tool '${toolName}' (User: ${context.userId}, Role: ${context.userRole})`);
      return fail(permRes.error);
    }

    try {
      const result = await tool.execute(parsedArgs, context);
      const latencyMs = Date.now() - startTime;

      // Log tool execution to ai_tool_executions table
      if (this.supabase) {
        try {
          await this.supabase.from('ai_tool_executions').insert({
            conversation_id: conversationId || null,
            user_id: context.userId,
            tool_name: toolName,
            input_payload: parsedArgs,
            output_payload: result.isSuccess() ? result.value : null,
            status: result.isSuccess() ? 'SUCCESS' : 'ERROR',
            error_message: result.isFailure() ? result.error.message : null,
            latency_ms: latencyMs,
          });
        } catch (err: any) {
          logger.error({ err }, '[ToolExecutor] Failed to log tool execution');
        }
      }

      return result;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      logger.error({ err, toolName }, '[ToolExecutor] Tool execution exception');

      if (this.supabase) {
        try {
          await this.supabase.from('ai_tool_executions').insert({
            conversation_id: conversationId || null,
            user_id: context.userId,
            tool_name: toolName,
            input_payload: parsedArgs,
            output_payload: null,
            status: 'ERROR',
            error_message: err.message,
            latency_ms: latencyMs,
          });
        } catch {}
      }

      return fail(new AppError(`Tool '${toolName}' execution failed: ${err.message}`, 500));
    }
  }
}
