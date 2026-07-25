import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class BuildTeamDto {
  @ApiProperty({
    description:
      'Natural language request outlining desired roles/skills for the team.',
    example: 'I need a backend, frontend, devops and QA',
  })
  @IsNotEmpty()
  @IsString()
  query!: string;

  @ApiPropertyOptional({ description: 'Optional project context' })
  @IsOptional()
  @IsInt()
  @Min(1)
  projectId?: number;
}
