import { Storage } from '@google-cloud/storage';

export interface PresignedUrlRequest {
  tenantOrUserId: string;
  fileName: string;
  mimeType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  storagePath: string;
  bucket: string;
  expiresAt: string;
}

export class GoogleCloudStorageService {
  private readonly storage: Storage;
  private readonly bucketName: string;
  private static readonly PRESIGNED_TTL_MINUTES = 15; // Strictly enforces REQ-SEC-14

  constructor(bucketName: string) {
    this.storage = new Storage();
    this.bucketName = bucketName;
  }

  /**
   * Generates an ephemeral Presigned Upload URL for Google Cloud Storage.
   * Directly enforces tenant path isolation:
   * Pattern: tenants/{tenantOrUserId}/documents/{uniqueFileId}_{sanitizedFileName}
   */
  public async generatePresignedUploadUrl(
    request: PresignedUrlRequest
  ): Promise<PresignedUrlResponse> {
    const bucket = this.storage.bucket(this.bucketName);
    const sanitizedFileName = request.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `uploads/${request.tenantOrUserId}/${Date.now()}_${sanitizedFileName}`;
    const file = bucket.file(storagePath);

    const expires = Date.now() + GoogleCloudStorageService.PRESIGNED_TTL_MINUTES * 60 * 1000;

    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expires,
      contentType: request.mimeType,
    });

    return {
      uploadUrl,
      storagePath,
      bucket: this.bucketName,
      expiresAt: new Date(expires).toISOString(),
    };
  }

  /**
   * Generates an ephemeral Presigned Download URL for viewing in Split-View.
   */
  public async generatePresignedDownloadUrl(storagePath: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(storagePath);

    const expires = Date.now() + GoogleCloudStorageService.PRESIGNED_TTL_MINUTES * 60 * 1000;

    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expires,
    });

    return downloadUrl;
  }
}
