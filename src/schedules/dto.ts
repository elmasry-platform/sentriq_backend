import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID() tenantId!: string;
  /** Published template; the schedule pins the version published at creation. */
  @IsUUID() templateId!: string;
  @IsUUID() siteId!: string;
  @IsUUID() assigneeMembershipId!: string;
  @IsIn(['daily', 'weekly', 'monthly', 'yearly']) frequency!: 'daily' | 'weekly' | 'monthly' | 'yearly';
  @Type(() => Number) @IsInt() @Min(1) @Max(52) @IsOptional() interval?: number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsOptional() endDate?: string;
  /** IANA zone; due dates are computed in it. */
  @IsString() @MaxLength(64) timezone!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(30) dueAfterDays!: number;
}
export class ReassignDto {
  @IsUUID() assigneeMembershipId!: string;
  @IsString() @MinLength(5) @MaxLength(2000) reason!: string;
}
export class CancelDto {
  @IsString() @MinLength(5) @MaxLength(2000) reason!: string;
}
