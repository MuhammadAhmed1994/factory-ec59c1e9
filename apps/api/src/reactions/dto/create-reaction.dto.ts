import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/u)
  emoji!: string;
}
