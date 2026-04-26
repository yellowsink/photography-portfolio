/*import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";*/
import { S3Client } from "@bradenmacdonald/s3-lite-client";

const ENDPOINT = Deno.env.get("PORTFOLIO_S3_ENDPOINT") ??
  "https://s3.us-west-004.backblazeb2.com";
const BUCKET = Deno.env.get("PORTFOLIO_S3_BUCKET") ?? "ys-photo-portfolio";

const s3Client = new S3Client({
  endPoint: ENDPOINT,
  region: "us-west-0004",
  bucket: BUCKET,
  accessKey: Deno.env.get("PORTFOLIO_S3_KEY") ?? "",
  secretKey: Deno.env.get("PORTFOLIO_S3_SECRET") ?? "",
});

export const uploadS3 = (
  filename: string,
  content: ArrayBuffer,
) => s3Client.putObject(filename, new Uint8Array(content));

export const deleteS3 = (filename: string) => s3Client.deleteObject(filename);

export const getS3 = (filename: string) => s3Client.getObject(filename);

export const S3_BASE_URL = `https://${BUCKET}.${ENDPOINT}/`;
