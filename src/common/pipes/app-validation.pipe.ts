import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes.js';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const details: Array<{ field: string; message: string }> = [];

      function extractErrors(errList: ValidationError[], parentField = '') {
        for (const err of errList) {
          const fieldPath = parentField ? `${parentField}.${err.property}` : err.property;
          if (err.constraints) {
            for (const constraintMessage of Object.values(err.constraints)) {
              details.push({
                field: fieldPath,
                message: constraintMessage,
              });
            }
          }
          if (err.children && err.children.length > 0) {
            extractErrors(err.children, fieldPath);
          }
        }
      }

      extractErrors(errors);

      return new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Kiritilgan maʼlumotlar validatsiyadan o‘tmadi',
        details,
      });
    },
  });
}

