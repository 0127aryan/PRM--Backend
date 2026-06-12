import { Injectable, Logger } from '@nestjs/common';
import { LlmAvailabilityService } from './llm-availability.service';
import { LlmConfigService } from './llm-config.service';
import { LlmChatOptions, ResolvedLlmConfig } from './llm.types';

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);

  constructor(
    private readonly llmConfig: LlmConfigService,
    private readonly availability: LlmAvailabilityService,
  ) {}

  async complete(prompt: string, options: LlmChatOptions = {}): Promise<string> {
    const config = await this.llmConfig.resolve();
    if (!config) {
      throw new Error('LLM is not configured (set LLM_HOST and LLM_API_KEY in .env)');
    }

    if (config.provider === 'gemini') {
      return this.completeGemini(config, prompt, options);
    }

    if (config.provider === 'ollama') {
      return this.completeOllama(config, prompt, options);
    }

    return this.completeOpenAiCompatible(config, prompt, options);
  }

  private authHeaders(
    provider: ResolvedLlmConfig['provider'],
    apiKey: string,
  ): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!apiKey) return headers;

    if (provider === 'ollama') {
      // Kong-proxied Ollama endpoints expect `apikey`, not Bearer auth.
      headers.apikey = apiKey;
      return headers;
    }

    headers.Authorization = `Bearer ${apiKey}`;
    return headers;
  }

  private async completeOpenAiCompatible(
    config: ResolvedLlmConfig,
    prompt: string,
    options: LlmChatOptions,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.2,
    };
    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    let response: Response;
    try {
      response = await fetch(`${config.host}/chat/completions`, {
        method: 'POST',
        headers: this.authHeaders(config.provider, config.apiKey),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'fetch failed';
      this.availability.markUnavailable(message);
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text();
      this.logger.warn(`LLM request failed (${response.status}): ${detail.slice(0, 300)}`);
      this.availability.markUnavailable(`status ${response.status}`);
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('LLM returned an empty response');
    }
    return content;
  }

  private async completeOllama(
    config: ResolvedLlmConfig,
    prompt: string,
    options: LlmChatOptions,
  ): Promise<string> {
    const url = config.host.includes('/api/generate')
      ? config.host
      : `${config.host}/api/generate`;

    const body: Record<string, unknown> = {
      model: config.model,
      prompt,
      stream: false,
    };
    if (options.jsonMode) {
      body.format = 'json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(config.provider, config.apiKey),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'fetch failed';
      this.availability.markUnavailable(message);
      throw error;
    }

    if (!response.ok) {
      const detail = await response.text();
      this.logger.warn(`Ollama request failed (${response.status}): ${detail.slice(0, 300)}`);
      this.availability.markUnavailable(`status ${response.status}`);
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const data = (await response.json()) as { response?: string };
    const content = data.response?.trim();
    if (!content) {
      throw new Error('LLM returned an empty response');
    }
    return content;
  }

  private async completeGemini(
    config: ResolvedLlmConfig,
    prompt: string,
    options: LlmChatOptions,
  ): Promise<string> {
    const url = `${config.host}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.warn(`Gemini request failed (${response.status}): ${detail.slice(0, 300)}`);
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) {
      throw new Error('LLM returned an empty response');
    }
    return content;
  }
}
