import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export const SYNC_OP_TYPES = ['start', 'answers', 'attach_evidence', 'submit'] as const;
export const MAX_SYNC_OPS = 100;

export class SyncOpDto {
  /** Client-generated, stable across retries. Same id + same payload = same result, never a duplicate. */
  @IsUUID() clientOpId!: string;
  @IsIn(SYNC_OP_TYPES as unknown as string[]) type!: (typeof SYNC_OP_TYPES)[number];
  /** Client-generated inspection id. */
  @IsUUID() inspectionId!: string;
  @IsObject() payload!: Record<string, unknown>;
  @IsOptional() @IsObject() clientMeta?: Record<string, unknown>;
}
export class SyncBatchDto {
  @IsUUID() tenantId!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(MAX_SYNC_OPS) @ValidateNested({ each: true }) @Type(() => SyncOpDto)
  ops!: SyncOpDto[];
}
