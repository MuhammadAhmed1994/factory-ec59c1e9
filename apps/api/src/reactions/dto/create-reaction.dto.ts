import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  emoji!: string;
}
