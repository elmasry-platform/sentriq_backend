import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class EvidenceIntentDto {
  @IsUUID() tenantId!: string;
  /** Client-generated; the same id on retry or after app restart returns the same row (no duplicate). */
  @IsUUID() clientEvidenceId!: string;
  @IsUUID() inspectionId!: string;
  @IsString() @MaxLength(100) questionId!: string;
  @IsString() @MaxLength(255) fileName!: string;
  @IsString() @MaxLength(100) mimeType!: string;
  @Type(() => Number) @IsInt() @Min(1) bytes!: number;
  /** sha256/bytes describe the STORED object (compressed if the client compressed). */
  @Matches(/^[a-f0-9]{64}$/) sha256!: string;
  /** Hash and size of the original before client-side compression (kept for provenance). */
  @IsOptional() @Matches(/^[a-f0-9]{64}$/) originalSha256?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) originalBytes?: number;
}
export class EvidenceConfirmDto {
  @Matches(/^[a-f0-9]{64}$/) sha256!: string;
}
