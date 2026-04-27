import sharp from "sharp";
import exiftool from "exiftool";

// i'm pretty sure there's a memory leak somewhere here but idk where
export async function processImage(image: ArrayBuffer) {
  const exif = await new Promise<object>((res, rej) =>
    exiftool.metadata(
      new Uint8Array(image),
      (err: unknown, metadata: object) => {
        if (err) rej(err);

        // why the shit is this an array with string keys??
        const copy = {} as Record<string, any>;
        for (const k of Reflect.ownKeys(metadata) as string[]) {
          if (k === "length") continue;
          copy[k] = (metadata as any)[k];
        }

        res(copy);
      },
    )
  );

  const webp = await sharp(image).toFormat("webp").toBuffer();

  return { exif: exif, compressed: webp };
}
