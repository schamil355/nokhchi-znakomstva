import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PhotosController } from "./photos.controller";
import { PhotosService } from "./photos.service";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [CommonModule, ConfigModule],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
