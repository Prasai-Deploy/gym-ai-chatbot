import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqProvider } from '../../src/modules/ai/providers/GroqProvider';
import {
  AIProviderConfigError,
  AIProviderNetworkError,
  AIProviderRateLimitError,
  AIProviderError,
} from '../../src/modules/ai/providers/AIProviderError';

describe('Groq AI Provider Reliability & Failure Handling Suite', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('16. missing GROQ_API_KEY → explicit AIProviderConfigError', async () => {
    const provider = new GroqProvider('');

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow(AIProviderConfigError);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow('GROQ_API_KEY is missing or unconfigured');
  });

  it('17. network error → explicit AIProviderNetworkError', async () => {
    const provider = new GroqProvider('gsk_test_mock_key');

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.groq.com'));

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow(AIProviderNetworkError);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow('Failed to reach Groq API');
  });

  it('18. provider API error (e.g. 500 or 401) → explicit AIProviderError', async () => {
    const provider = new GroqProvider('gsk_test_mock_key');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error from Groq',
    } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow(AIProviderError);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow('Groq API request failed with status 500');
  });

  it('19. rate-limit response (429) → explicit AIProviderRateLimitError', async () => {
    const provider = new GroqProvider('gsk_test_mock_key');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded: TPM limit reached',
    } as any);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow(AIProviderRateLimitError);

    await expect(
      provider.generateCompletion([{ role: 'user', content: 'hello' }], [])
    ).rejects.toThrow('Groq API rate limit exceeded');
  });

  it('20. no static stub AI response is ever returned upon error', async () => {
    const provider = new GroqProvider('gsk_test_mock_key');

    // Simulate failure
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    } as any);

    try {
      const response = await provider.generateCompletion(
        [{ role: 'user', content: 'start my workout now' }],
        []
      );
      // If code reached here, it failed the requirement
      expect(response).toBeUndefined();
    } catch (err: any) {
      expect(err).toBeInstanceOf(AIProviderError);
      expect((err as any).message).not.toContain('I am your STRIVA AI Coach');
    }
  });

  it('21. successful completion returns actual usage and model metadata', async () => {
    const provider = new GroqProvider('gsk_test_mock_key');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'chatcmpl-123',
        model: 'compound-beta',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Warm up with 5 mins of cardio.' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 45,
          completion_tokens: 15,
          total_tokens: 60,
        },
      }),
    } as any);

    const response = await provider.generateCompletion([{ role: 'user', content: 'What is my warmup?' }], []);

    expect(response.message.content).toBe('Warm up with 5 mins of cardio.');
    expect(response.finish_reason).toBe('stop');
    expect(response.usage?.prompt_tokens).toBe(45);
    expect(response.usage?.completion_tokens).toBe(15);
    expect(response.usage?.total_tokens).toBe(60);
    expect(response.model).toBe('compound-beta');
    expect(response.provider).toBe('groq');
  });
});
