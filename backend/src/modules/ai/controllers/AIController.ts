import { Request, Response, NextFunction } from 'express';
import { IAIProvider } from '../providers/IAIProvider';
import { ConversationManager } from '../core/ConversationManager';
import { PromptBuilder } from '../core/PromptBuilder';
import { ToolRuntime } from '../core/ToolRuntime';
import { SafetyGuard } from '../safety/SafetyGuard';
import { ToolRegistry } from '../tools/ToolRegistry';
import { ValidationError, AppError } from '@errors/AppError';
import { logger } from '@logger/index';

// We mock ContextBuilder for this slice since it lives in the intelligence domain
interface IMockContextBuilder {
  buildUnifiedContext(userId: string): Promise<any>;
}

export class AIController {
  constructor(
    private readonly provider: IAIProvider,
    private readonly convManager: ConversationManager,
    private readonly promptBuilder: PromptBuilder,
    private readonly toolRuntime: ToolRuntime,
    private readonly safetyGuard: SafetyGuard,
    private readonly registry: ToolRegistry,
    private readonly contextBuilder: IMockContextBuilder
  ) {}

  public chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, conversationId } = req.body;
      const userId = (req as any).user.id;

      if (!message) throw new ValidationError('Message is required', {});

      // 1. Safety check on user input
      const safetyRes = await this.safetyGuard.evaluatePrompt(message);
      if (safetyRes.isFailure()) throw safetyRes.error;

      // 2. Load or Create Conversation
      const convRes = await this.convManager.getOrCreateConversation(userId, conversationId);
      if (convRes.isFailure()) throw convRes.error;
      const activeConvId = convRes.value;

      // 3. Append user message
      await this.convManager.appendMessage(activeConvId, { role: 'user', content: message });

      // 4. Build Context
      const contextRes = await this.contextBuilder.buildUnifiedContext(userId);
      if (!contextRes.isSuccess) throw new AppError('Failed to build context', 500); // Hacky unwrap for slice
      const systemPrompt = this.promptBuilder.buildSystemPrompt(contextRes.value as any);

      // 5. Load History
      const historyRes = await this.convManager.getHistory(activeConvId);
      if (historyRes.isFailure()) throw historyRes.error;
      
      const messages = [systemPrompt, ...historyRes.value];

      // 6. Get tool definitions
      const tools = this.registry.getAllDefinitions();

      // 7. Call AI Provider
      const completionRes = await this.provider.generateCompletion(messages, tools);
      const assistantMessage = completionRes.message;

      // 8. Handle tool calls (orchestration loop)
      if (completionRes.finish_reason === 'tool_calls' && assistantMessage.tool_calls) {
        // Append the assistant's tool call request to history
        await this.convManager.appendMessage(activeConvId, assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          // Execute tool securely
          const toolResult = await this.toolRuntime.executeToolCall(toolCall, userId);
          
          // Append the tool result
          await this.convManager.appendMessage(activeConvId, {
            role: 'tool',
            content: toolResult.isSuccess() ? JSON.stringify(toolResult.value) : JSON.stringify({ error: toolResult.error }),
            tool_call_id: toolCall.id
          });
        }
        
        // In a full implementation, we would loop back and call the AI Provider again with the new tool output.
        // For this slice, we'll just return the tool execution result.
        return res.status(200).json({ success: true, data: { status: 'tools_executed', conversationId: activeConvId } });
      }

      // 9. Standard Text Response
      // Evaluate output safety
      const outputSafety = await this.safetyGuard.evaluateResponse(assistantMessage.content);
      if (outputSafety.isFailure()) throw outputSafety.error;

      // Append assistant message
      await this.convManager.appendMessage(activeConvId, assistantMessage);

      return res.status(200).json({ success: true, data: { message: assistantMessage.content, conversationId: activeConvId } });
    } catch (err) {
      next(err);
    }
  };
}
