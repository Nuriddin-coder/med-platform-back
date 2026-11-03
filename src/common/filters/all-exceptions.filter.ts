import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCodes } from '../constants/error-codes.js';
import { redactSensitiveData } from '../utils/redaction.util.js';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCodes.INTERNAL_ERROR;
    let message = 'Serverda ichki xatolik yuz berdi';
    let details: Array<{ field: string; message: string }> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;

        // If custom structure already provided
        if (resObj.code) {
          code = resObj.code;
        } else {
          code = this.mapStatusToErrorCode(status);
        }

        if (resObj.message) {
          if (Array.isArray(resObj.message)) {
            message = 'Kiritilgan maʼlumotlar validatsiyadan o‘tmadi';
            details = resObj.message.map((msg: string) => {
              const parts = msg.split(' ');
              return {
                field: parts[0] || 'input',
                message: msg,
              };
            });
          } else {
            message = resObj.message;
          }
        }

        if (resObj.details && Array.isArray(resObj.details)) {
          details = resObj.details;
        }
      }
    } else if (exception instanceof Error) {
      const redactedMsg = redactSensitiveData(exception.message);
      const redactedStack = exception.stack ? redactSensitiveData(exception.stack) : undefined;
      this.logger.error(`Unhandled Exception: ${redactedMsg}`, redactedStack);
      message = redactedMsg || 'Serverda ichki xatolik yuz berdi';
    } else {
      this.logger.error(`Unknown exception: ${JSON.stringify(redactSensitiveData(exception))}`);
    }

    const errorPayload: Record<string, any> = {
      code,
      message,
    };

    if (details && details.length > 0) {
      errorPayload.details = details;
    }

    response.status(status).json({
      success: false,
      error: errorPayload,
    });
  }

  private mapStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCodes.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      default:
        return ErrorCodes.INTERNAL_ERROR;
    }
  }
}

