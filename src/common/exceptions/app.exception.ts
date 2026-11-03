import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodes } from '../constants/error-codes.js';

export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super({ code, message, details }, status);
  }
}

export class SlotAlreadyBookedException extends AppException {
  constructor(message = 'Tanlangan vaqt oralig‘i allaqachon band qilingan') {
    super(ErrorCodes.SLOT_ALREADY_BOOKED, message, HttpStatus.CONFLICT);
  }
}

export class UserBlockedException extends AppException {
  constructor(message = 'Foydalanuvchi akkaunti bloklangan') {
    super(ErrorCodes.USER_BLOCKED, message, HttpStatus.FORBIDDEN);
  }
}

export class EmailNotVerifiedException extends AppException {
  constructor(message = 'Elektron pochta tasdiqlanmagan') {
    super(ErrorCodes.EMAIL_NOT_VERIFIED, message, HttpStatus.FORBIDDEN);
  }
}

export class InvalidCredentialsException extends AppException {
  constructor(message = 'Login yoki parol noto‘g‘ri') {
    super(ErrorCodes.INVALID_CREDENTIALS, message, HttpStatus.UNAUTHORIZED);
  }
}

export class TokenExpiredException extends AppException {
  constructor(message = 'Token muddati tugagan') {
    super(ErrorCodes.TOKEN_EXPIRED, message, HttpStatus.UNAUTHORIZED);
  }
}

export class TokenInvalidException extends AppException {
  constructor(message = 'Token yaroqsiz yoki topilmadi') {
    super(ErrorCodes.TOKEN_INVALID, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenAppException extends AppException {
  constructor(message = 'Ushbu amalni bajarish uchun ruxsat berilmagan') {
    super(ErrorCodes.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundAppException extends AppException {
  constructor(message = 'Maʼlumot topilmadi') {
    super(ErrorCodes.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictAppException extends AppException {
  constructor(message = 'Ushbu maʼlumot allaqachon mavjud') {
    super(ErrorCodes.CONFLICT, message, HttpStatus.CONFLICT);
  }
}
