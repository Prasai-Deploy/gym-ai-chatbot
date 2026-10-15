import { MemoryCandidate, MemoryCategory } from './memory.types';

export class MemoryExtractor {
  /**
   * Extracts potential durable memory candidates from user input string.
   */
  public extractCandidates(
    userMessage: string,
    userId: string,
    organizationId: string,
    agentId: string = 'trinetra'
  ): MemoryCandidate[] {
    if (!userMessage || userMessage.trim().length === 0) {
      return [];
    }

    const text = userMessage.trim().toLowerCase();
    const candidates: MemoryCandidate[] = [];

    // Filter out purely transient/ephemeral statements
    if (this.isTransientStatement(text)) {
      return [];
    }

    // 1. SCHEDULE / WORKOUT TIME PREFERENCES
    if (/prefer\s+(?:training|working\s+out|exercising)\s+in\s+the\s+evening|train\s+at\s+night|evening\s+workouts/i.test(text)) {
      candidates.push({
        category: 'SCHEDULE',
        key: 'preferred_workout_time',
        value: 'evening',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    } else if (/prefer\s+(?:training|working\s+out|exercising)\s+in\s+the\s+morning|train\s+in\s+the\s+morning|morning\s+workouts/i.test(text)) {
      candidates.push({
        category: 'SCHEDULE',
        key: 'preferred_workout_time',
        value: 'morning',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    } else if (/prefer\s+(?:training|working\s+out|exercising)\s+in\s+the\s+afternoon|afternoon\s+workouts/i.test(text)) {
      candidates.push({
        category: 'SCHEDULE',
        key: 'preferred_workout_time',
        value: 'afternoon',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    }

    // 2. NUTRITION / DIETARY PREFERENCES
    if (/(?:don't\s+eat\s+meat|i'm\s+vegetarian|i\s+am\s+vegetarian)/i.test(text)) {
      candidates.push({
        category: 'NUTRITION',
        key: 'dietary_preference',
        value: 'vegetarian',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    } else if (/(?:i'm\s+vegan|i\s+am\s+vegan|plant-based)/i.test(text)) {
      candidates.push({
        category: 'NUTRITION',
        key: 'dietary_preference',
        value: 'vegan',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    } else if (/(?:keto|ketogenic\s+diet)/i.test(text)) {
      candidates.push({
        category: 'NUTRITION',
        key: 'dietary_preference',
        value: 'keto',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    } else if (/(?:lactose\s+intolerant|no\s+dairy)/i.test(text)) {
      candidates.push({
        category: 'NUTRITION',
        key: 'dietary_preference',
        value: 'lactose_intolerant',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    }

    // 3. GOALS / FITNESS TARGETS
    if (/(?:goal\s+is\s+to\s+gain\s+lean\s+muscle|build\s+muscle|gain\s+muscle|hypertrophy)/i.test(text)) {
      candidates.push({
        category: 'GOALS',
        key: 'primary_goal',
        value: 'build_muscle',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    } else if (/(?:goal\s+is\s+to\s+lose\s+fat|fat\s+loss|weight\s+loss|cut)/i.test(text)) {
      candidates.push({
        category: 'GOALS',
        key: 'primary_goal',
        value: 'fat_loss',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    }

    // 4. EQUIPMENT & ACCESS
    if (/(?:train\s+at\s+home|dumbbells\s+at\s+home|only\s+have\s+dumbbells|home\s+gym)/i.test(text)) {
      candidates.push({
        category: 'EQUIPMENT',
        key: 'equipment_access',
        value: 'home_dumbbells',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    } else if (/(?:full\s+gym\s+access|commercial\s+gym|gym\s+membership)/i.test(text)) {
      candidates.push({
        category: 'EQUIPMENT',
        key: 'equipment_access',
        value: 'full_gym',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    }

    // 5. COACHING STYLE
    if (/(?:keep\s+(?:your\s+)?answers?\s+short|concise\s+advice|prefer\s+short|short\s+practical|be\s+brief)/i.test(text)) {
      candidates.push({
        category: 'COACHING_STYLE',
        key: 'preferred_coaching_style',
        value: 'concise',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    }

    // 6. TRAINING PREFERENCES
    if (/(?:prefer\s+strength\s+training|love\s+lifting|like\s+heavy\s+weights)/i.test(text)) {
      candidates.push({
        category: 'TRAINING',
        key: 'workout_preference',
        value: 'strength_training',
        confidence: 'high',
        source: 'explicit',
        userId,
        organizationId,
        agentId,
      });
    }

    return candidates;
  }

  private isTransientStatement(text: string): boolean {
    const transientPatterns = [
      /^i'm\s+tired\s+today$/i,
      /^i\s+feel\s+sick$/i,
      /^i\s+ate\s+pizza\s+just\s+now$/i,
      /^my\s+head\s+hurts$/i,
      /^hello\s*(?:coach|trinetra)?$/i,
      /^hi$/i,
      /^what's\s+up$/i,
      /^can\s+you\s+log\s+my\s+workout\??$/i,
    ];
    return transientPatterns.some((pattern) => pattern.test(text));
  }
}

export const memoryExtractor = new MemoryExtractor();
