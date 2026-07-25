import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LlmAvailabilityService } from './llm-availability.service';
import { LlmClientService } from './llm-client.service';
import { LlmConfigService } from './llm-config.service';

@Module({
  imports: [DatabaseModule],
  providers: [LlmConfigService, LlmAvailabilityService, LlmClientService],
  exports: [LlmConfigService, LlmAvailabilityService, LlmClientService],
})
export class LlmModule {}
