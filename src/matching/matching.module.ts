import { Module } from '@nestjs/common';
import { KeywordMatcherService } from './keyword-matcher.service';
import { RiskSummaryService } from './risk-summary.service';

@Module({
  providers: [KeywordMatcherService, RiskSummaryService],
  exports: [KeywordMatcherService, RiskSummaryService],
})
export class MatchingModule {}
