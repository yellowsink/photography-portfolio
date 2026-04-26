import { S3Client } from "@bradenmacdonald/s3-lite-client";
import {CONFIG} from "./config.ts";

const s3Client = new S3Client({
  endPoint: CONFIG.PORTFOLIO_S3_ENDPOINT,
  region: "",
  bucket: CONFIG.PORTFOLIO_S3_BUCKET,
  accessKey: CONFIG.PORTFOLIO_S3_KEY,
  secretKey: CONFIG.PORTFOLIO_S3_SECRET,
});

export const uploadS3 = (
  filename: string,
  content: ArrayBuffer,
) => s3Client.putObject(filename, new Uint8Array(content));

export const deleteS3 = (filename: string) => s3Client.deleteObject(filename);

export const getS3 = (filename: string) => s3Client.getObject(filename);


