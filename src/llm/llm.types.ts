export type LlmProvider = 'gemini' | 'groq' | 'openai' | 'ollama';

export interface ResolvedLlmConfig {
  provider: LlmProvider;
  host: string;
  apiKey: string;
  model: string;
}

export interface LlmChatOptions {
  temperature?: number;
  jsonMode?: boolean;
}
