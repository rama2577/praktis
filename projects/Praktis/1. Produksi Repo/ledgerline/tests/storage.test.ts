import { describe, expect, it } from "vitest";
import { resolveStorageDriverName } from "@/lib/storage/types";
import { s3ConfigFromEnv, S3Driver } from "@/lib/storage/s3";

describe("storage — resolveStorageDriverName", () => {
  it("default filesystem", () => {
    expect(resolveStorageDriverName({})).toBe("filesystem");
    expect(resolveStorageDriverName({ STORAGE_DRIVER: "" })).toBe("filesystem");
  });

  it("s3 bila STORAGE_DRIVER=s3", () => {
    expect(resolveStorageDriverName({ STORAGE_DRIVER: "s3" })).toBe("s3");
  });
});

describe("storage — s3ConfigFromEnv", () => {
  it("map semua env", () => {
    const cfg = s3ConfigFromEnv({
      S3_ENDPOINT: "https://acc.r2.cloudflarestorage.com",
      S3_REGION: "auto",
      S3_BUCKET: "praktis-docs",
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
      S3_FORCE_PATH_STYLE: "true",
    });
    expect(cfg).toEqual({
      endpoint: "https://acc.r2.cloudflarestorage.com",
      region: "auto",
      bucket: "praktis-docs",
      accessKeyId: "ak",
      secretAccessKey: "sk",
      forcePathStyle: true,
    });
  });

  it("endpoint undefined bila kosong", () => {
    expect(s3ConfigFromEnv({}).endpoint).toBeUndefined();
    expect(s3ConfigFromEnv({}).region).toBe("auto");
    expect(s3ConfigFromEnv({}).forcePathStyle).toBe(false);
  });
});

describe("storage — S3Driver validasi", () => {
  it("lempar error bila bucket kosong", () => {
    expect(
      () =>
        new S3Driver({
          endpoint: undefined,
          region: "auto",
          bucket: "",
          accessKeyId: "",
          secretAccessKey: "",
          forcePathStyle: false,
        }),
    ).toThrow(/S3_BUCKET/);
  });

  it("tidak lempar bila bucket di-set (tidak menyentuh AWS)", () => {
    expect(
      () =>
        new S3Driver({
          endpoint: undefined,
          region: "auto",
          bucket: "praktis-docs",
          accessKeyId: "",
          secretAccessKey: "",
          forcePathStyle: false,
        }),
    ).not.toThrow();
  });
});
