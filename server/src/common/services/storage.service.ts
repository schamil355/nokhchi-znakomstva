import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly kmsKeyId?: string;
  private readonly tempPrefix: string;
  private readonly region: string;
  private readonly endpoint?: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>("s3.bucket", "");
    this.kmsKeyId = this.configService.get<string | undefined>("s3.kmsKeyId");
    this.tempPrefix = this.configService.get<string>("s3.tempPrefix", "temp/verification");
    this.region = this.configService.get<string>("s3.region", "eu-central-1");
    this.endpoint = this.configService.get<string | undefined>("s3.endpoint");
    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
    });
  }

  async uploadTempSelfie(buffer: Buffer, mime: string): Promise<string> {
    try {
      const key = `${this.tempPrefix}/${randomUUID()}.jpg`;
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
          ServerSideEncryption: this.kmsKeyId ? "aws:kms" : "AES256",
          SSEKMSKeyId: this.kmsKeyId,
          Metadata: {
            temporary: "true",
          },
        })
      );
      this.logger.log(
        `Selfie uploaded: bucket=${this.bucket} region=${this.region} endpoint=${this.endpoint ?? "default"} key=${key}`
      );
      return key;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to upload selfie to bucket ${this.bucket} (region=${this.region}, endpoint=${this.endpoint ?? "default"}): ${
          err?.message ?? err
        }`,
        err,
      );
      throw new InternalServerErrorException("SELFIE_UPLOAD_FAILED");
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
    } catch (error) {
      this.logger.warn(`Failed to delete object ${key}: ${(error as Error).message}`);
    }
  }

  async getPresignedUrl(key: string, expiresIn = 300): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
