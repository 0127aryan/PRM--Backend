import { LlmClientService } from './llm-client.service';
import { LlmConfigService } from './llm-config.service';

describe('LlmClientService', () => {
  const llmConfig = {
    resolve: jest.fn(),
  } as unknown as LlmConfigService;

  const availability = {
    markUnavailable: jest.fn(),
  } as unknown as import('./llm-availability.service').LlmAvailabilityService;

  const service = new LlmClientService(llmConfig, availability);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('throws when LLM is not configured', async () => {
    (llmConfig.resolve as jest.Mock).mockResolvedValue(null);
    await expect(service.complete('hello')).rejects.toThrow(
      'LLM is not configured',
    );
  });

  it('parses OpenAI-compatible chat completion response', async () => {
    (llmConfig.resolve as jest.Mock).mockResolvedValue({
      provider: 'groq',
      host: 'https://api.groq.com/openai/v1',
      apiKey: 'test-key',
      model: 'gemma2-9b-it',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"matches":[]}' } }],
      }),
    }) as unknown as typeof fetch;

    const result = await service.complete('rank employees', { jsonMode: true });
    expect(result).toBe('{"matches":[]}');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      }),
    );
  });

  it('parses Ollama generate response', async () => {
    (llmConfig.resolve as jest.Mock).mockResolvedValue({
      provider: 'ollama',
      host: 'http://164.52.211.238/api/generate',
      apiKey: 'test-key',
      model: 'gemma3:12b-it-q8_0',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: '{"matches":[]}' }),
    }) as unknown as typeof fetch;

    const result = await service.complete('rank employees', { jsonMode: true });
    expect(result).toBe('{"matches":[]}');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://164.52.211.238/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'test-key',
        }),
      }),
    );
  });

  it('throws on non-OK LLM response', async () => {
    (llmConfig.resolve as jest.Mock).mockResolvedValue({
      provider: 'groq',
      host: 'https://api.groq.com/openai/v1',
      apiKey: 'bad-key',
      model: 'gemma2-9b-it',
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }) as unknown as typeof fetch;

    await expect(service.complete('hello')).rejects.toThrow(
      'LLM request failed',
    );
  });
});
