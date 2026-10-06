import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty({ message: 'emoji must not be empty' })
  emoji!: string;
}
