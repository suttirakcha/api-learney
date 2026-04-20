import { IsObject, IsOptional, IsString } from 'class-validator';

export class WorkspaceActionDto {
  @IsString()
  action: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

