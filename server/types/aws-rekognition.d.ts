declare module "@aws-sdk/client-rekognition" {
  export interface CompareFacesRequest {
    SourceImage: { Bytes: Uint8Array };
    TargetImage: { Bytes: Uint8Array };
    SimilarityThreshold?: number;
  }

  export interface ComparedFace {
    Confidence?: number;
  }

  export interface CompareFacesMatch {
    Similarity?: number;
    Face?: ComparedFace;
  }

  export interface CompareFacesResponse {
    FaceMatches?: CompareFacesMatch[];
  }

  export class CompareFacesCommand {
    constructor(input: CompareFacesRequest);
  }

  export class RekognitionClient {
    constructor(options?: { region?: string; endpoint?: string });
    send(command: CompareFacesCommand): Promise<CompareFacesResponse>;
  }
}
