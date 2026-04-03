import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const tenantId = request.tenantContext?.tenantId || 'unknown';
    const userId = request.tenantContext?.userId || 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(
          JSON.stringify({
            tenantId,
            userId,
            method,
            url,
            duration,
            statusCode: context.switchToHttp().getResponse().statusCode,
          }),
        );
      }),
    );
  }
}
