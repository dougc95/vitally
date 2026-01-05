import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const BUCKET_NAME = process.env.S3_BUCKET || "body-metrics-tracker";

const isMinio = !!process.env.S3_ENDPOINT;

// Default to MinIO defaults if in dev/minio mode
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || (isMinio ? "minioadmin" : "");
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || (isMinio ? "minioadmin" : "");
const region = process.env.AWS_REGION || "us-east-1";

export const s3 = new S3Client({
  region,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: isMinio,
  credentials: (accessKeyId && secretAccessKey) ? {
    accessKeyId,
    secretAccessKey,
  } : undefined, // Let AWS SDK default provider chain handle it if vars are missing but configured elsewhere
});

export async function initBucket() {
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
