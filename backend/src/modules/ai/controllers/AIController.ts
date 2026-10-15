import { Request, Response, NextFunction } from 'express';
import { AgentRunner } from '../agents/AgentRunner';
import { ConversationManager } from '../core/ConversationManager';
import { StreamManager } from '../core/StreamManager';
import { ValidationError, ForbiddenError, AuthError } from '@errors/AppError';

export class AIController {
  private streamManager = new StreamManager();

  constructor(
    private readonly agentRunner: AgentRunner,
    private readonly convManager: ConversationManager
  ) {}

  public chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, prompt, conversationId, stream } = req.body;
      const userPrompt = message || prompt;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role || 'Member';
      const orgId = req.organizationContext?.organizationId || '';
      const acceptsEventStream = req.headers.accept?.includes('text/event-stream') || stream === true;

      if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
        throw new ValidationError('Message or prompt string is required', {});
      }

      // Ensure conversation exists or create one
      let activeConvId = conversationId;
      if (!activeConvId) {
        const createRes = await this.convManager.createConversation(userId, userPrompt.substring(0, 30));
        if (createRes.isSuccess()) {
          activeConvId = createRes.value.id;
        }
      } else {
        // Enforce ownership: reject attempts to inject into another user's conversation
        const ownershipCheck = await this.convManager.getHistory(activeConvId, { userId, organizationId: orgId });
        if (ownershipCheck.isFailure()) {
          throw new ForbiddenError('Conversation not found or access denied');
        }
      }

      // Fetch message history for context
      const historyRes = await this.convManager.getHistory(activeConvId || '', { userId, organizationId: orgId });
      const history = historyRes.isSuccess() ? historyRes.value : [];

      // Append user message
      await this.convManager.appendMessage(activeConvId || '', 'user', userPrompt);

      if (acceptsEventStream) {
        this.streamManager.initSSE(res);
        const agentRes = await this.agentRunner.run(
          userPrompt,
          { userId, organizationId: orgId, conversationId: activeConvId || '', userRole },
          history,
          res,
          true
        );
        if (agentRes?.message?.content) {
          await this.convManager.appendMessage(activeConvId || '', 'assistant', agentRes.message.content);
        }
        return;
      }

      // Standard JSON response
      const response = await this.agentRunner.run(
        userPrompt,
        { userId, organizationId: orgId, conversationId: activeConvId || '', userRole },
        history
      );

      // Append assistant message to DB
      await this.convManager.appendMessage(activeConvId || '', 'assistant', response.message.content);

      return res.status(200).json({
        success: true,
        data: {
          conversationId: activeConvId,
          agentId: response.agentId,
          message: response.message.content,
          toolsCalled: response.toolsCalled,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          totalTokens: response.totalTokens,
          durationMs: response.durationMs,
          model: response.model,
          provider: response.provider,
        },
      });
    } catch (err) {
      if (res.headersSent) {
        this.streamManager.sendError(res, (err as any).message || 'AI Runtime error');
        return;
      }
      next(err);
    }
  };

  public listConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.convManager.listConversations(userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const orgId = req.organizationContext?.organizationId;
      const result = await this.convManager.getHistory(req.params.id, { userId, organizationId: orgId });
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public renameConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { title } = req.body;
      if (!title) throw new ValidationError('Title is required', {});

      const result = await this.convManager.renameConversation(req.params.id, title, userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.convManager.deleteConversation(req.params.id, userId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Retrieves consumer AI usage analytics for the authenticated user.
   * Exclusively queries records where user_id matches verified context and organization_id IS NULL.
   * Parameter overrides via query or body are strictly ignored.
   */
  public getUserAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new AuthError('Authentication required');
      }

      let limit = 50;
      if (req.query.limit) {
        const parsedLimit = parseInt(req.query.limit as string, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          limit = Math.min(parsedLimit, 100);
        }
      }

      const result = await this.agentRunner.getUserAnalyticsSummary(userId, limit);
      if (result.isFailure()) {
        throw result.error;
      }

      return res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (err) {
      next(err);
    }
  };
}
