import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AssistantSkillMatchDto {
  @ApiPropertyOptional({ description: 'Project context for allocate workflow' })
  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;

  @ApiPropertyOptional({
    description: 'Natural language requirement (processed by LLM when enabled)',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ example: ['nestjs', 'react'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  skillIds?: number[];
}
