import { AgentId, AgentDefinition } from './agent.types';
import { AGENT_DEFINITIONS } from './AgentRegistry';

export class AgentOrchestrator {
  /**
   * Automatic agent routing: select best agent based on trigger keyword matching.
   * Falls back to 'fitness_coach' (Coach Trinity) as default.
   */
  public routeMessage(userMessage: string, userRole?: string): AgentId {
    const lowerMsg = userMessage.toLowerCase();

    // Role-based forced routing
    if (userRole === 'Gym Manager' || userRole === 'Organization Owner') {
      const businessAgent = AGENT_DEFINITIONS['business_advisor'];
      if (businessAgent.triggerKeywords.some((kw) => lowerMsg.includes(kw))) {
        return 'business_advisor';
      }
    }

    if (userRole === 'Trainer' || userRole === 'Personal Trainer') {
      const trainerAgent = AGENT_DEFINITIONS['trainer_copilot'];
      if (trainerAgent.triggerKeywords.some((kw) => lowerMsg.includes(kw))) {
        return 'trainer_copilot';
      }
    }

    // Score each agent by keyword match count
    const scores: { agentId: AgentId; score: number }[] = Object.values(AGENT_DEFINITIONS).map((def) => ({
      agentId: def.id,
      score: def.triggerKeywords.filter((kw) => lowerMsg.includes(kw)).length,
    }));

    scores.sort((a, b) => b.score - a.score);

    // Return best match if score > 0, else default to fitness_coach
    const best = scores[0];
    return best.score > 0 ? best.agentId : 'fitness_coach';
  }

  public getAgentDefinition(agentId: AgentId): AgentDefinition {
    return AGENT_DEFINITIONS[agentId];
  }

  public listAgents(): AgentDefinition[] {
    return Object.values(AGENT_DEFINITIONS);
  }
}

export const agentOrchestrator = new AgentOrchestrator();
