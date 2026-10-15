import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { GroqProvider } from '../../src/modules/ai/providers/GroqProvider';
import {
  AIProviderError,
  AIProviderConfigError,
  AIProviderRateLimitError,
  AIProviderTimeoutError,
  AIProviderNetworkError,
  AIModelNotFoundError,
  AIServiceUnavailableError,
} from '../../src/modules/ai/providers/AIProviderError';
import { AgentRunner } from '../../src/modules/ai/agents/AgentRunner';
import { AIUsageRepository } from '../../src/modules/ai/repositories/AIUsageRepository';
import { MemoryEngine } from '../../src/modules/ai/agents/MemoryEngine';

describe('STRIVA V2 Phase 13B-1 — GroqProvider Reliability & Fallback Suite', () => {
  const originalFetch = globalThis.fetch;
  let recordedUsage: any[] = [];

  const createMockUsageRepo = () => {
    return {
      recordUsage: vi.fn(async (record: any) => {
        recordedUsage.push(record);
        return { isFailure: () => false, value: record };
      }),
      getUserAnalytics: vi.fn(async () => []),
    } as unknown as AIUsageRepository;
  };

  const createMockMemoryEngine = () => {
    return {
      getRecentMemories: vi.fn(async () => []),
      extractAndStoreMemories: vi.fn(async () => {}),
      buildContextSummary: vi.fn(async () => ''),
      processTurnForCandidateMemories: vi.fn(async () => []),
      persistCandidate: vi.fn(async () => {}),
    } as unknown as MemoryEngine;
  };

  beforeEach(() => {
    recordedUsage = [];
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Successful Primary Inference
  // --------------------------------------------------------------------------
  it('1. successful primary inference returns primary model and exact token accounting', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'chatcmpl-primary-ok',
        model: 'openai/gpt-oss-20b',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Primary model response: form looks solid.' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 42,
          completion_tokens: 18,
          total_tokens: 60,
        },
      }),
    } as any);

    const response = await provider.generateCompletion([{ role: 'user', content: 'Check my squat form' }], []);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const sentBody = JSON.parse(fetchCall[1].body);
    expect(sentBody.model).toBe('openai/gpt-oss-20b');
    expect(fetchCall[1].signal).toBeDefined();

    expect(response.message.content).toBe('Primary model response: form looks solid.');
    expect(response.model).toBe('openai/gpt-oss-20b');
    expect(response.provider).toBe('groq');
    expect(response.usage).toEqual({
      prompt_tokens: 42,
      completion_tokens: 18,
      total_tokens: 60,
    });
  });

  // --------------------------------------------------------------------------
  // 2. Request Timeout & Aborted Requests
  // --------------------------------------------------------------------------
  it('2a. primary timeout throws explicit AIProviderTimeoutError (504, TIMEOUT_ERROR) when no fallback configured', async () => {
    const provider = new GroqProvider('gsk_test_mock_key', 'openai/gpt-oss-20b', undefined, 15000);

    const timeoutError = new Error('The operation was aborted due to timeout');
    timeoutError.name = 'TimeoutError';
    globalThis.fetch = vi.fn().mockRejectedValue(timeoutError);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow(AIProviderTimeoutError);

    try {
      await provider.generateCompletion([{ role: 'user', content: 'hello' }], []);
    } catch (err: any) {
      expect(err).toBeInstanceOf(AIProviderTimeoutError);
      expect(err.statusCode).toBe(504);
      expect(err.category).toBe('TIMEOUT_ERROR');
      expect(err.provider).toBe('groq');
      expect(err.message).toContain('15000ms');
    }
  });

  it('2b. DOMException AbortError is cleanly translated into AIProviderTimeoutError', async () => {
    const provider = new GroqProvider('gsk_test_mock_key', 'openai/gpt-oss-20b', '', 15000);

    const abortError = new Error('The user aborted a request.');
    abortError.name = 'AbortError';
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow(AIProviderTimeoutError);
  });

  // --------------------------------------------------------------------------
  // 3. Eligible Primary Failure Followed by Successful Fallback
  // --------------------------------------------------------------------------
  it('3a. primary 429 rate limit triggers fallback to secondary model and succeeds', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    const mockFetch = vi.fn()
      // First call (primary): 429 Rate Limit
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded: TPM limit reached for model',
      } as any)
      // Second call (fallback): 200 OK
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chatcmpl-fallback-ok',
          model: 'qwen/qwen3.8-27b',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Fallback model response: rest 90 seconds.' },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 25,
            total_tokens: 75,
          },
        }),
      } as any);

    globalThis.fetch = mockFetch;

    const response = await provider.generateCompletion([{ role: 'user', content: 'Workout recovery advice' }], []);

    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Verify first call used primary model
    const primaryBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(primaryBody.model).toBe('openai/gpt-oss-20b');

    // Verify second call used fallback model
    const fallbackBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(fallbackBody.model).toBe('qwen/qwen3.8-27b');

    // Verify returned response reflects fallback model
    expect(response.message.content).toBe('Fallback model response: rest 90 seconds.');
    expect(response.model).toBe('qwen/qwen3.8-27b');
    expect(response.usage?.total_tokens).toBe(75);
  });

  it('3b. primary 503 service unavailable triggers fallback to secondary model and succeeds', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Fallback OK' } }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
          model: 'qwen/qwen3.8-27b',
        }),
      } as any);

    const response = await provider.generateCompletion([{ role: 'user', content: 'hi' }], []);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(response.model).toBe('qwen/qwen3.8-27b');
  });

  it('3c. primary 404 model not found triggers fallback to secondary model and succeeds', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'deprecated-model-v1',
      'qwen/qwen3.8-27b',
      15000
    );

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Model not found: deprecated-model-v1',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Recovered from model 404' } }],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
          model: 'qwen/qwen3.8-27b',
        }),
      } as any);

    const response = await provider.generateCompletion([{ role: 'user', content: 'hi' }], []);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(response.model).toBe('qwen/qwen3.8-27b');
  });

  it('3d. primary timeout triggers fallback to secondary model and succeeds', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    const timeoutErr = new Error('Timeout');
    timeoutErr.name = 'TimeoutError';

    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(timeoutErr)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Fallback after primary timeout' } }],
          usage: { prompt_tokens: 15, completion_tokens: 15, total_tokens: 30 },
          model: 'qwen/qwen3.8-27b',
        }),
      } as any);

    const response = await provider.generateCompletion([{ role: 'user', content: 'hi' }], []);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(response.message.content).toBe('Fallback after primary timeout');
    expect(response.model).toBe('qwen/qwen3.8-27b');
  });

  // --------------------------------------------------------------------------
  // 4. Fallback Failure Handling & Bounded Attempts
  // --------------------------------------------------------------------------
  it('4. fallback failure stops cleanly after exactly 2 attempts without infinite loops or recursion', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit on primary',
      } as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable on fallback',
      } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(AIServiceUnavailableError);

    // Bounded: Primary once, fallback at most once (total 2 attempts)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  // --------------------------------------------------------------------------
  // 5. Missing / Invalid Fallback Configuration
  // --------------------------------------------------------------------------
  it('5a. when fallback model is undefined, primary failure throws immediately without fallback attempt', async () => {
    const provider = new GroqProvider('gsk_test_mock_key', 'openai/gpt-oss-20b', undefined, 15000);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit reached',
    } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(AIProviderRateLimitError);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('5b. when fallback model is identical to primary model, fallback is skipped to prevent duplicate failure', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-20b',
      15000
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(AIServiceUnavailableError);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // 6. Non-Retryable Errors (Auth, Validation, Missing Key)
  // --------------------------------------------------------------------------
  it('6a. 401 Unauthorized is non-retryable and fails immediately without fallback attempt', async () => {
    const provider = new GroqProvider(
      'invalid_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid API Key',
    } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(AIProviderConfigError);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('6b. 403 Forbidden is non-retryable and fails immediately without fallback attempt', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden: Account suspended',
    } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(AIProviderConfigError);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('6c. 400 Bad Request is non-retryable and fails immediately without fallback attempt', async () => {
    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request: Malformed parameter',
    } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(AIProviderError);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('6d. empty GROQ_API_KEY throws AIProviderConfigError without calling network', async () => {
    const provider = new GroqProvider('', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b');

    globalThis.fetch = vi.fn();

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hi' }], [])
    ).rejects.toThrow(AIProviderConfigError);

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // 7. Token Accounting & Analytics Persistence Integrity (AgentRunner Integration)
  // --------------------------------------------------------------------------
  it('7a. successful fallback writes exactly ONE analytics record with fallback model and accurate tokens', async () => {
    const usageRepo = createMockUsageRepo();
    const memoryEngine = createMockMemoryEngine();

    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      15000
    );

    // Primary fails 429, fallback succeeds
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit on primary',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'qwen/qwen3.8-27b',
          choices: [
            {
              message: { role: 'assistant', content: 'Target 150g protein daily.' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 110, completion_tokens: 40, total_tokens: 150 },
        }),
      } as any);

    const runner = new AgentRunner(provider, memoryEngine, usageRepo);
    const result = await runner.run(
      'How much protein do I need?',
      { userId: 'usr-member-1', organizationId: null, conversationId: 'conv-101', userRole: 'Member' }
    );

    expect(result.message.content).toBe('Target 150g protein daily.');
    expect(result.model).toBe('qwen/qwen3.8-27b');
    expect(result.tokensUsed).toBe(150);

    // Verify analytics persistence called EXACTLY ONCE
    expect(usageRepo.recordUsage).toHaveBeenCalledTimes(1);
    expect(recordedUsage).toHaveLength(1);

    const record = recordedUsage[0];
    expect(record.success).toBe(true);
    expect(record.model).toBe('qwen/qwen3.8-27b');
    expect(record.provider).toBe('groq');
    expect(record.promptTokens).toBe(110);
    expect(record.completionTokens).toBe(40);
    expect(record.totalTokens).toBe(150);
    expect(record.errorCategory).toBeNull();
  });

  it('7b. aborted/timed out requests are NOT recorded as successful completions in analytics', async () => {
    const usageRepo = createMockUsageRepo();
    const memoryEngine = createMockMemoryEngine();

    const provider = new GroqProvider(
      'gsk_test_mock_key',
      'openai/gpt-oss-20b',
      undefined, // No fallback
      15000
    );

    const timeoutErr = new Error('Timeout');
    timeoutErr.name = 'TimeoutError';
    globalThis.fetch = vi.fn().mockRejectedValue(timeoutErr);

    const runner = new AgentRunner(provider, memoryEngine, usageRepo);

    await expect(
      runner.run(
        'Generate an advanced workout split',
        { userId: 'usr-member-1', organizationId: null, conversationId: 'conv-102', userRole: 'Member' }
      )
    ).rejects.toThrow(AIProviderTimeoutError);

    // Verify analytics recorded failure, NOT success
    expect(usageRepo.recordUsage).toHaveBeenCalledTimes(1);
    expect(recordedUsage).toHaveLength(1);

    const record = recordedUsage[0];
    expect(record.success).toBe(false);
    expect(record.errorCategory).toBe('TIMEOUT_ERROR');
    expect(record.promptTokens).toBeNull();
    expect(record.completionTokens).toBeNull();
    expect(record.totalTokens).toBeNull();
  });
});
