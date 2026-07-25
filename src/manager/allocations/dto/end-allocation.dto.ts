import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class EndAllocationDto {
  @ApiPropertyOptional({ description: 'Defaults to today (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
