import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class FormBodyDto {
  @IsObject() title!: Record<string, string>;
  @IsString() @MaxLength(100) category!: string;
  @IsObject() definition!: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
}
export class CreateFormDto extends FormBodyDto {
  @IsUUID() tenantId!: string;
}
export class SaveFormDto extends FormBodyDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
}
export class SubmitFormDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsString() @MaxLength(2000) changeNote!: string;
}
export class ApproveFormDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
}
export class ReturnFormDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsString() @MaxLength(2000) reason!: string;
}
export class StatusFormDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number;
  @IsIn(['retired', 'archived', 'draft']) status!: 'retired' | 'archived' | 'draft';
}
export class CloneFormDto {
  @IsOptional() @IsObject() title?: Record<string, string>;
}
export class ValidateFormDto {
  @IsUUID() tenantId!: string;
  @IsObject() title!: Record<string, string>;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @IsObject() definition!: Record<string, unknown>;
}
