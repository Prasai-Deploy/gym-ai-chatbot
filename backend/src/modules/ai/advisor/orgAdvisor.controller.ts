import { Request, Response, NextFunction } from 'express';
import { AgentRunner } from '../agents/AgentRunner';
import { ConversationManager } from '../core/ConversationManager';
import { StreamManager } from '../core/StreamManager';
import { ValidationError, ForbiddenError } from '@errors/AppError';

export class OrgAdvisorController {
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
      const orgContext = req.organizationContext;

      if (!orgContext || !orgContext.organizationId) {
        throw new ForbiddenError('Tenant organization context required for Gym Owner Advisor');
      }

      const orgId = orgContext.organizationId;
      const userRole = orgContext.roleKey || (req as any).user.role || 'Organization Owner';
      const acceptsEventStream = req.headers.accept?.includes('text/event-stream') || stream === true;

      if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
        throw new ValidationError('Message or prompt string is required', {});
      }

      // Ensure conversation exists or create tenant-scoped conversation
      let activeConvId = conversationId;
      if (!activeConvId) {
        const titleSnippet = userPrompt.length > 35 ? `${userPrompt.substring(0, 32)}...` : userPrompt;
        const createRes = await this.convManager.createConversation(userId, titleSnippet, {
          organizationId: orgId,
          scope: 'organization_advisor',
        });
        if (createRes.isSuccess()) {
          activeConvId = createRes.value.id;
        }
      }

      // Fetch message history with tenant/user verification
      const historyRes = await this.convManager.getHistory(activeConvId || '', {
        userId,
        organizationId: orgId,
      });
      const history = historyRes.isSuccess() ? historyRes.value : [];

      // Append user message
      await this.convManager.appendMessage(activeConvId || '', 'user', userPrompt);

      if (acceptsEventStream) {
        this.streamManager.initSSE(res);
        const agentRes = await this.agentRunner.run(
          userPrompt,
          {
            userId,
            organizationId: orgId,
            conversationId: activeConvId || '',
            userRole,
            scope: 'organization_advisor',
          },
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
        {
          userId,
          organizationId: orgId,
          conversationId: activeConvId || '',
          userRole,
          scope: 'organization_advisor',
        },
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
        this.streamManager.sendError(res, (err as any).message || 'B2B Advisor runtime error');
        return;
      }
      next(err);
    }
  };

  public listConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const orgId = req.organizationContext?.organizationId;

      const result = await this.convManager.listConversations(userId, {
        organizationId: orgId,
        scope: 'organization_advisor',
      });

      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const orgId = req.organizationContext?.organizationId;

      const result = await this.convManager.getHistory(req.params.id, {
        userId,
        organizationId: orgId,
      });

      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public renameConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const orgId = req.organizationContext?.organizationId;
      const { title } = req.body;

      if (!title) throw new ValidationError('Title is required', {});

      const result = await this.convManager.renameConversation(req.params.id, title, userId, orgId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, data: result.value });
    } catch (err) {
      next(err);
    }
  };

  public deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const orgId = req.organizationContext?.organizationId;

      const result = await this.convManager.deleteConversation(req.params.id, userId, orgId);
      if (result.isFailure()) throw result.error;
      return res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  public getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.organizationContext?.organizationId || '';
      const analytics = await this.agentRunner.getAnalytics(orgId);
      return res.status(200).json({ success: true, data: { analytics } });
    } catch (err) {
      next(err);
    }
  };
}
