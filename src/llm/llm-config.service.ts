import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.keys';
import { SYSTEM_CONFIG_REPOSITORY } from '../database/repositories/repository.tokens';
import type { ISystemConfigRepository } from '../database/repositories/interfaces/system-config.repository.interface';
import { LlmProvider, ResolvedLlmConfig } from './llm.types';

const PROVIDER_DEFAULTS: Record<LlmProvider, { host: string; model: string }> =
  {
    groq: {
      host: 'https://api.groq.com/openai/v1',
      model: 'gemma2-9b-it',
    },
    gemini: {
      host: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-2.0-flash',
    },
    openai: {
      host: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
    ollama: {
      host: 'http://127.0.0.1:11434',
      model: 'gemma2:9b',
    },
  };

@Injectable()
export class LlmConfigService {
  constructor(
    private readonly config: ConfigService,
    @Inject(SYSTEM_CONFIG_REPOSITORY)
    private readonly systemConfig: ISystemConfigRepository,
  ) {}

  async resolve(): Promise<ResolvedLlmConfig | null> {
    const envHost = this.config.get<string>(Env.LLM_HOST)?.trim();
    const envKey = this.config.get<string>(Env.LLM_API_KEY)?.trim();
    const envModel = this.config.get<string>(Env.LLM_MODEL)?.trim();
    const envProvider = this.config.get<string>(Env.LLM_PROVIDER)?.trim();

    const providerRow = await this.systemConfig.findByKey('llm_provider');
    const apiKeyRow = await this.systemConfig.findByKey('llm_api_key');

    const host = (envHost || '').replace(/\/$/, '');
    const provider = this.resolveProvider(
      envProvider || providerRow?.configValue,
      host,
    );
    const defaults = PROVIDER_DEFAULTS[provider];

    const apiKey = (apiKeyRow?.configValue?.trim() || envKey) ?? '';
    const resolvedHost = host || defaults.host;
    const model = envModel || defaults.model;

    if (!apiKey || !resolvedHost) {
      return null;
    }

    return { provider, host: resolvedHost, apiKey, model };
  }

  async isConfigured(): Promise<boolean> {
    return (await this.resolve()) !== null;
  }

  private resolveProvider(
    explicit: string | undefined,
    host: string,
  ): LlmProvider {
    const normalized = explicit?.trim().toLowerCase();
    if (normalized === 'gemini') return 'gemini';
    if (normalized === 'openai') return 'openai';
    if (normalized === 'ollama' || normalized === 'gemma') return 'ollama';
    if (host.includes('/api/generate') || host.includes(':11434')) {
      return 'ollama';
    }
    if (normalized === 'groq') return 'groq';
    return 'groq';
  }
}
