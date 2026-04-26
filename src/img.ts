import sharp from "sharp";
import exiftool from "exiftool";

export async function processImage(image: ArrayBuffer) {
  const exif = await new Promise<object>((res, rej) =>
    exiftool.metadata(image, (err: unknown, metadata: object) => {
      if (err) rej(err);
      res(metadata);
    })
  );

  const webp = await sharp(image).toFormat("webp").toBuffer();

  return { exif, compressed: webp };
}
