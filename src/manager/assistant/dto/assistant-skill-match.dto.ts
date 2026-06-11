import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AssistantSkillMatchDto {
  @ApiPropertyOptional({ description: 'Project context for allocate workflow' })
  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;

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
