import { Body, Controller, Delete, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PhotosService } from "./photos.service";
import { RegisterPhotoDto } from "./dto/register-photo.dto";
import { ViewPhotoDto } from "./dto/view-photo.dto";
import { GrantPhotoDto } from "./dto/grant-photo.dto";

@ApiTags("photos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("v1/photos")
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post("register")
  async register(@Req() req: Request, @Body() body: RegisterPhotoDto) {
    const ownerId = req.user?.id as string;
    return this.photosService.registerPhoto(ownerId, body);
  }

  @Post("view")
  async view(@Req() req: Request, @Body() body: ViewPhotoDto) {
    const viewerId = req.user?.id as string;
    return this.photosService.viewPhoto(viewerId, body);
  }

  @Post("grant")
  async grant(@Req() req: Request, @Body() body: GrantPhotoDto) {
    const ownerId = req.user?.id as string;
    return this.photosService.grantAccess(ownerId, body);
  }

  @Delete(":photoId")
  async deletePhoto(@Req() req: Request, @Param("photoId") photoId: string) {
    const ownerId = req.user?.id as string;
    return this.photosService.deletePhoto(ownerId, Number(photoId));
  }

  @Delete("permissions")
  async revokePermission(@Req() req: Request, @Body() body: GrantPhotoDto) {
    const ownerId = req.user?.id as string;
    return this.photosService.revokePermission(ownerId, body);
  }

  @Delete("permissions/all")
  async revokeAll(@Req() req: Request, @Body() body: { photoId: number }) {
    const ownerId = req.user?.id as string;
    return this.photosService.revokeAllPermissions(ownerId, body.photoId);
  }

  @Post("bulk-delete/self")
  async bulkDelete(@Req() req: Request) {
    const ownerId = req.user?.id as string;
    return this.photosService.bulkDelete(ownerId);
  }
}
