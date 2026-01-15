import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as Sentry from "@sentry/node";
import { SentryExceptionFilter } from "./common/filters/sentry-exception.filter";
import { getSupabaseAdminClient } from "./common/supabase-admin";
import type { Request, Response, NextFunction } from "express";

const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.2");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.2,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
    rawBody: true,
  });
  const supabase = getSupabaseAdminClient();

  const webBaseUrl = process.env.WEB_BASE_URL ?? "";
  let webOrigin: string | null = null;
  try {
    webOrigin = webBaseUrl ? new URL(webBaseUrl).origin : null;
  } catch {
    webOrigin = null;
  }

  const defaultCorsOrigins = [
    "http://localhost:8081",
    "http://localhost:4173",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:4173",
    "https://nokhchi-znakomstva.com",
    "https://www.nokhchi-znakomstva.com",
  ];
  const derivedCorsOrigins = webOrigin
    ? [webOrigin, webOrigin.replace("://www.", "://")]
    : [];
  const envCorsOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedCorsOrigins = Array.from(
    new Set([...defaultCorsOrigins, ...envCorsOrigins, ...derivedCorsOrigins].filter(Boolean))
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedCorsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  app.use(async (req: Request & { user?: any }, _res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"] ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          req.user = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.app_metadata?.role ?? data.user.user_metadata?.role ?? "user",
          };
        }
      } catch (err) {
        Logger.debug(`Failed to decode Supabase token: ${(err as Error).message}`, "AuthMiddleware");
      }
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    })
  );

  app.useGlobalFilters(new SentryExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("Verification API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen(port, host as string);
  Logger.log(`Verification API listening on ${host}:${port}`, "Bootstrap");
}

bootstrap().catch((error) => {
  Logger.error(error, "Bootstrap");
  process.exit(1);
});
