import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { DatabaseModule } from "./database/database.module";
import { CommonModule } from "./common/common.module";
import { PhotosModule } from "./photos/photos.module";
import { PrivacyController } from "./settings/privacy.controller";
import { VerificationModule } from "./verification/verification.module";
import { PushModule } from "./push/push.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 100,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonModule,
    PhotosModule,
    VerificationModule,
    PushModule,
  ],
  controllers: [PrivacyController],
})
export class AppModule {}
