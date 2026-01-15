import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type RekognitionResult = {
  similarity: number;
  confidence: number;
  matched: boolean;
};

type RekognitionModule = typeof import("@aws-sdk/client-rekognition");

@Injectable()
export class RekognitionService {
  private readonly logger = new Logger(RekognitionService.name);
  private readonly region: string;
  private readonly similarityThreshold: number;
  private readonly endpoint?: string;
  private moduleRef: Promise<RekognitionModule> | null = null;
  private clientPromise: Promise<{
    client: InstanceType<RekognitionModule["RekognitionClient"]>;
    CompareFacesCommand: RekognitionModule["CompareFacesCommand"];
  }> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>("rekognition.region", "eu-central-1");
    this.similarityThreshold = this.configService.get<number>("rekognition.similarityThreshold", 80);
    this.endpoint = this.configService.get<string | undefined>("rekognition.endpoint");
  }

  private async loadModule(): Promise<RekognitionModule> {
    if (!this.moduleRef) {
      this.moduleRef = import("@aws-sdk/client-rekognition");
    }
    return this.moduleRef;
  }

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const module = await this.loadModule();
        const client = new module.RekognitionClient({
          region: this.region,
          endpoint: this.endpoint,
        });
        return {
          client,
          CompareFacesCommand: module.CompareFacesCommand,
        };
      })();
    }
    return this.clientPromise;
  }

  async compareFaces(selfieBuffer: Buffer, profileBuffer: Buffer): Promise<RekognitionResult> {
    try {
      const { client, CompareFacesCommand } = await this.getClient();
      const command = new CompareFacesCommand({
        SourceImage: { Bytes: selfieBuffer },
        TargetImage: { Bytes: profileBuffer },
        SimilarityThreshold: this.similarityThreshold,
      });

      const response = await client.send(command);
      const match = response.FaceMatches?.[0];
      const similarity = match?.Similarity ?? 0;
      const confidence = match?.Face?.Confidence ?? 0;

      return {
        similarity,
        confidence,
        matched: similarity >= this.similarityThreshold,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Rekognition compareFaces failed: ${err?.name ?? "Error"} ${err?.message ?? ""}`,
        err?.stack
      );
      // Return a client-visible error so we can see details
      throw new BadRequestException(`FACE_COMPARE_FAILED:${err?.name ?? "UNKNOWN"}:${err?.message ?? ""}`);
    }
  }
}
