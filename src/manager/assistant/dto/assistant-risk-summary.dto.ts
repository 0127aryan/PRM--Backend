import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AssistantRiskSummaryDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId!: number;
}
