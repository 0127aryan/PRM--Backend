import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LlmModule } from '../llm/llm.module';
import { KeywordMatcherService } from './keyword-matcher.service';
import { LlmMatcherService } from './llm-matcher.service';
import { LlmRequirementParserService } from './llm-requirement-parser.service';
import { LlmRiskSummaryService } from './llm-risk-summary.service';
import { MatchingConfigService } from './matching-config.service';
import { RiskSummaryService } from './risk-summary.service';

@Module({
  imports: [DatabaseModule, LlmModule],
  providers: [
    KeywordMatcherService,
    LlmMatcherService,
    LlmRequirementParserService,
    LlmRiskSummaryService,
    MatchingConfigService,
    RiskSummaryService,
  ],
  exports: [
    KeywordMatcherService,
    LlmMatcherService,
    LlmRequirementParserService,
    LlmRiskSummaryService,
    MatchingConfigService,
    RiskSummaryService,
  ],
})
export class MatchingModule {}
