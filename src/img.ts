import sharp from "sharp"
import exif from "exif-reader"

function postProcessExifRef(exif: exif.Exif | undefined) {
	delete exif?.Image?.PrintImageMatching;
	delete exif?.Photo?.MakerNote;
}

export async function processImage(image: ArrayBuffer) {
	const shp = sharp(image);

	const meta = await shp.metadata();

	const exifParsed = meta.exif && exif(meta.exif);
	postProcessExifRef(exifParsed);

	const webp = await shp.toFormat("webp").toBuffer();

	return { exif: exifParsed, compressed: webp };
}