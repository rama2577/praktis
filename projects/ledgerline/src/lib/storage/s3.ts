/**
 * Driver object storage — S3-compatible (Cloudflare R2 / AWS S3 / MinIO).
 *
 * Ketiga provider pakai API S3; cukup set env (endpoint/region/bucket/credential).
 * Client di-load lazy (`await import`) sehingga bundle app tidak menarik AWS SDK
 * saat driver filesystem (default) dipakai.
 */
import type { StorageDriver } from "./types";
import type { S3Client } from "@aws-sdk/client-s3";

export type S3Config = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function s3ConfigFromEnv(env: Record<string, string | undefined> = process.env): S3Config {
  return {
    endpoint: env.S3_ENDPOINT || undefined,
    region: env.S3_REGION ?? "auto",
    bucket: env.S3_BUCKET ?? "",
    accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  };
}

export class S3Driver implements StorageDriver {
  private readonly cfg: S3Config;
  private clientPromise: Promise<S3Client> | null = null;

  constructor(cfg?: S3Config) {
    this.cfg = cfg ?? s3ConfigFromEnv();
    if (!this.cfg.bucket) {
      throw new Error("S3_BUCKET wajib di-set saat STORAGE_DRIVER=s3");
    }
  }

  private client(): Promise<S3Client> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client } = await import("@aws-sdk/client-s3");
        return new S3Client({
          region: this.cfg.region,
          endpoint: this.cfg.endpoint,
          forcePathStyle: this.cfg.forcePathStyle,
          credentials: this.cfg.accessKeyId
            ? {
                accessKeyId: this.cfg.accessKeyId,
                secretAccessKey: this.cfg.secretAccessKey,
              }
            : undefined,
        });
      })();
    }
    return this.clientPromise;
  }

  async save(key: string, data: Buffer): Promise<void> {
    const [{ PutObjectCommand }, client] = await Promise.all([
      import("@aws-sdk/client-s3"),
      this.client(),
    ]);
    await client.send(new PutObjectCommand({ Bucket: this.cfg.bucket, Key: key, Body: data }));
  }

  async read(key: string): Promise<Buffer> {
    const [{ GetObjectCommand }, client] = await Promise.all([
      import("@aws-sdk/client-s3"),
      this.client(),
    ]);
    const res = await client.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    const [{ DeleteObjectCommand }, client] = await Promise.all([
      import("@aws-sdk/client-s3"),
      this.client(),
    ]);
    await client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }
}
