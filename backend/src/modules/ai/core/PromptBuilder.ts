import { UnifiedAIContextDTO } from '../../intelligence/domain/IntelligenceSchemas';
import { ChatMessage } from '../providers/IAIProvider';

export class PromptBuilder {
  private readonly BASE_SYSTEM_PROMPT = `
You are STRIVA, an elite AI fitness coach.
Your goal is to provide evidence-based fitness, nutrition, and recovery advice.
You MUST NEVER provide medical diagnoses or override a physician's advice.
You have access to a suite of tools. Use them to help the user.
`;

  public buildSystemPrompt(context: UnifiedAIContextDTO): ChatMessage {
    const contextStr = JSON.stringify(context, null, 2);
    const content = `${this.BASE_SYSTEM_PROMPT}\n\nHere is the current unified context for the user:\n${contextStr}`;
    
    return {
      role: 'system',
      content
    };
  }
}
