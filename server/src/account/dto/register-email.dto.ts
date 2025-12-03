import { IsEmail, MinLength } from "class-validator";

export class RegisterEmailDto {
  @IsEmail()
  email!: string;

  @MinLength(8)
  password!: string;
}
