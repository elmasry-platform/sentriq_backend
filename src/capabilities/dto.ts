import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AuthorizeDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @MaxLength(200)
  permissionKey!: string;

  @IsString()
  @MaxLength(100)
  action!: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsUUID()
  orgUnitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taskKind?: string;

  @IsOptional()
  @IsUUID()
  taskId?: string;
}
