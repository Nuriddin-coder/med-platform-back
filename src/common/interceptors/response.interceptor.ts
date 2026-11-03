import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    // If response is already handled or streaming (like file download), leave untouched
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();

    return next.handle().pipe(
      map((result) => {
        // If already sent or headers sent
        if (response.headersSent) {
          return result;
        }

        // If returned data already matches envelope format
        if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
          return result;
        }

        // Handle paginated responses: { data: [...], meta: {...} }
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          return {
            success: true,
            data: result.data,
            meta: result.meta,
          };
        }

        // Standard data response
        return {
          success: true,
          data: result ?? null,
        };
      }),
    );
  }
}

