import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateKudosDto {
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  message!: string;
}

export class KudosPageQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
}
