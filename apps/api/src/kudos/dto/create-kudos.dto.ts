import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateKudosDto {
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  message!: string;
}
