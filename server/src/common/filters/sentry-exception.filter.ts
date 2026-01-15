import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import * as Sentry from "@sentry/node";
import type { Request, Response } from "express";

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const error = exception instanceof Error ? exception : new Error("Unknown exception");
    const contextType = host.getType();

    Sentry.withScope((scope) => {
      scope.setTag("context", String(contextType));
      scope.setExtra("handledAt", "SentryExceptionFilter");
      scope.setExtra("timestamp", new Date().toISOString());
      Sentry.captureException(error);
    });

    if (contextType === "http") {
      const http = host.switchToHttp();
      const response = http.getResponse<Response>();
      const request = http.getRequest<Request>();
      const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const exposeDetails =
        (process.env.DEBUG_ERRORS ?? "").toLowerCase() === "true" || process.env.NODE_ENV !== "production";
      const payload =
        exception instanceof HttpException
          ? exception.getResponse()
          : {
              statusCode: status,
              message: exposeDetails ? error.message : "Internal server error",
              path: request?.url,
            };

      if (response) {
        response.status(status).json(payload);
        return;
      }
    }

    this.logger.error("Re-throwing non-http exception to default handlers", error);
    throw exception;
  }
}
