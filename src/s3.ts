import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const ENDPOINT = Deno.env.get("PORTFOLIO_S3_ENDPOINT") ??
  "s3.us-west-004.backblazeb2.com";
const BUCKET = Deno.env.get("PORTFOLIO_S3_BUCKET") ?? "ys-photo-portfolio";
// https://ys-photo-portfolio.s3.us-west-004.backblazeb2.com

const s3Client = new S3Client({
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: Deno.env.get("PORTFOLIO_S3_KEY") ?? "",
    secretAccessKey: Deno.env.get("PORTFOLIO_S3_SECRET") ?? "",
  },
});

export async function uploadS3(
  filename: string,
  content: ReadableStream<Uint8Array<ArrayBuffer>>,
) {
  const cmd = new PutObjectCommand({
    Body: content,
    Key: filename,
    Bucket: BUCKET,
  });

  return await s3Client.send(cmd);
}

export async function deleteS3(filename: string) {
  const cmd = new DeleteObjectCommand({
    Key: filename,
    Bucket: BUCKET,
  });

  return await s3Client.send(cmd);
}

export async function getS3(filename: string) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: filename,
  });

  return await s3Client.send(cmd);
}

export const S3_BASE_URL = `https://${BUCKET}.${ENDPOINT}/`;
