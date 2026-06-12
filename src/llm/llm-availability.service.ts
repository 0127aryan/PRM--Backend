import { Injectable, Logger } from '@nestjs/common';
import { LlmConfigService } from './llm-config.service';

const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
const PING_TIMEOUT_MS = 5_000;

@Injectable()
export class LlmAvailabilityService {
  private readonly logger = new Logger(LlmAvailabilityService.name);
  private unavailableUntil = 0;

  constructor(private readonly llmConfig: LlmConfigService) {}

  async isReachable(): Promise<boolean> {
    if (Date.now() < this.unavailableUntil) {
      return false;
    }

    const config = await this.llmConfig.resolve();
    if (!config) return false;

    const pingUrl = this.pingUrl(config.host, config.provider);
    try {
      const response = await fetch(pingUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
        headers: this.authHeaders(config.provider, config.apiKey),
      });
      if (!response.ok && response.status !== 405 && response.status !== 404) {
        this.markUnavailable('ping returned non-OK status');
        return false;
      }
      return true;
    } catch (error) {
      this.markUnavailable(
        error instanceof Error ? error.message : 'ping failed',
      );
      return false;
    }
  }

  markUnavailable(reason: string): void {
    this.unavailableUntil = Date.now() + UNAVAILABLE_TTL_MS;
    this.logger.warn(
      `LLM host marked unavailable for ${UNAVAILABLE_TTL_MS / 1000}s: ${reason}`,
    );
  }

  private authHeaders(
    provider: string,
    apiKey: string,
  ): Record<string, string> | undefined {
    if (!apiKey) return undefined;
    if (provider === 'ollama') {
      return { apikey: apiKey };
    }
    return { Authorization: `Bearer ${apiKey}` };
  }

  private pingUrl(host: string, provider: string): string {
    if (provider === 'ollama') {
      if (host.includes('/api/generate')) {
        return host.replace(/\/api\/generate\/?$/, '/');
      }
      return `${host}/`;
    }
    return host;
  }
}
