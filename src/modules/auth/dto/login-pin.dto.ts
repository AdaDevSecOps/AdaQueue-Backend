import { IsString, IsNotEmpty, Length } from 'class-validator';

export class LoginPinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 10)
  pin: string;
}
