import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString } from 'class-validator';

export class PatchConfigDto {
  @ApiProperty({
    description: 'Map of config_key → config_value',
    example: { max_weekly_hours: '40', scheduler_interval_minutes: '60' },
  })
  @IsObject()
  values!: Record<string, string>;
}

export class CreateActivityTagDto {
  @ApiProperty()
  @IsString()
  name!: string;
}
