import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TimesheetEntryTagDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  activityTagId?: number;

  @ApiProperty({ required: false, description: 'Required when using the Other tag (2–40 chars)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  otherText?: string;
}

export class TimesheetEntryDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId!: number;

  @ApiProperty({ description: 'Whole hours only' })
  @IsInt()
  @Min(0)
  @Max(168)
  hours!: number;

  @ApiProperty({ type: [TimesheetEntryTagDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TimesheetEntryTagDto)
  tags!: TimesheetEntryTagDto[];
}

export class SubmitTimesheetDto {
  @ApiProperty({ example: '2026-03-03', description: 'Monday (week start)' })
  @IsDateString()
  weekStart!: string;

  @ApiProperty({ type: [TimesheetEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TimesheetEntryDto)
  entries!: TimesheetEntryDto[];
}
