import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, Min, ValidateIf } from 'class-validator';

export class ReviewDecisionDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsIn(['approve', 'return']) decision!: 'approve' | 'return';
  /** Mandatory (min 5 chars) for return; optional for approve (Mohamed: reason mandatory on return only). */
  @ValidateIf((o: ReviewDecisionDto) => o.decision === 'return' || o.reason !== undefined)
  @IsString() @MinLength(5) @MaxLength(2000) reason?: string;
  /** Optional flagged question ids, only valid with decision=return. */
  @IsOptional() @IsArray() @ArrayMaxSize(300) @IsString({ each: true }) @MaxLength(100, { each: true }) flaggedQuestionIds?: string[];
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
