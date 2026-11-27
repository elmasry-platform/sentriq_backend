import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, MaxLength, MinLength, Min } from 'class-validator';

export class ReviewDecisionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsIn(['approve', 'return']) decision!: 'approve' | 'return';
  /** Always mandatory for return. Mandatory text for approve is a DB rule. */
  @IsString() @MinLength(5) @MaxLength(2000) reason!: string;
}
export class ResubmitDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  /** Written reply, at least 10 characters, required by the DB when no answer changed. */
  @IsString() @MaxLength(2000) reply!: string;
}
export class ReopenDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsString() @MinLength(5) @MaxLength(2000) reason!: string;
}
