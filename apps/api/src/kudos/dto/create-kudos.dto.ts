import { Type } from 'class-transformer';
import { IsDefined, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateKudosDto {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsDefined()
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
