import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Railway object storage provides: AWS_S3_BUCKET_NAME, AWS_ENDPOINT_URL, AWS_DEFAULT_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
export const BUCKET_NAME =
  process.env.AWS_S3_BUCKET_NAME ||
  process.env.S3_BUCKET ||
  process.env.BUCKET ||
  "body-metrics-tracker";

const endpoint =
  process.env.AWS_ENDPOINT_URL ||
  process.env.S3_ENDPOINT ||
  process.env.ENDPOINT;
const isCustomEndpoint = !!endpoint;

// Fall back to legacy names, then MinIO defaults for local dev
const accessKeyId =
  process.env.AWS_ACCESS_KEY_ID ||
  process.env.ACCESS_KEY_ID ||
  (isCustomEndpoint ? "minioadmin" : "");
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY ||
  process.env.SECRET_ACCESS_KEY ||
  (isCustomEndpoint ? "minioadmin" : "");
const region =
  process.env.AWS_DEFAULT_REGION ||
  process.env.AWS_REGION ||
  process.env.REGION ||
  "us-east-1";

// Railway uses virtual-hosted-style; only force path style when explicitly opted in (e.g. MinIO)
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

export const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle,
  credentials:
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined,
});

export async function initBucket() {
  if (!accessKeyId || !secretAccessKey) {
    console.log("S3 credentials not configured, skipping bucket init.");
    return;
  }

  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`S3 Bucket "${BUCKET_NAME}" exists.`);
  } catch (e: any) {
    if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) {
      console.log(`S3 Bucket "${BUCKET_NAME}" not found, creating...`);
      try {
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`S3 Bucket "${BUCKET_NAME}" created successfully.`);
      } catch (createError) {
        console.error("Failed to create bucket:", createError);
      }
    } else {
      console.error("Error checking S3 bucket:", e);
    }
  }
}

export async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
