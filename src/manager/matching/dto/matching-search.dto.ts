import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MatchingSearchDto {
  @ApiPropertyOptional({ description: 'Limit matches to direct reports eligible for this project' })
  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;

  @ApiPropertyOptional({
    description: 'Natural language requirement (processed by LLM when enabled)',
    example: 'Backend developer with Java and microservices, available from June',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ example: ['nestjs', 'react'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Skill ids from catalog' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];
}
