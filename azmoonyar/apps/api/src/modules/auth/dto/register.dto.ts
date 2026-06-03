import { IsString, IsEmail, MinLength, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'ایمیل کاربر' })
  @IsEmail({}, { message: 'فرمت ایمیل معتبر نیست' })
  email: string;

  @ApiProperty({ 
    example: 'SecurePass123!',
    description: 'رمز عبور (حداقل ۸ کاراکتر، شامل حروف بزرگ و کوچک، عدد و کاراکتر خاص)'
  })
  @IsString()
  @MinLength(8, { message: 'رمز عبور باید حداقل ۸ کاراکتر باشد' })
  @MaxLength(100, { message: 'رمز عبور نباید بیش از ۱۰۰ کاراکتر باشد' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/])[A-Za-z\d@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/]{8,}$/,
    { 
      message: 'رمز عبور باید شامل حروف بزرگ و کوچک انگلیسی، عدد و کاراکتر خاص باشد' 
    }
  )
  password: string;

  @ApiProperty({ example: 'علی احمدی', description: 'نام و نام خانوادگی' })
  @IsString()
  @MinLength(2, { message: 'نام باید حداقل ۲ کاراکتر باشد' })
  @MaxLength(100, { message: 'نام نباید بیش از ۱۰۰ کاراکتر باشد' })
  name: string;
}
