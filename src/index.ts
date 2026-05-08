import {Hono} from "hono";
import {basicAuth} from "hono/basic-auth";
import {cors} from "hono/cors";

import {
	addPhoto,
	addRoll,
	deletePhoto,
	deleteRoll,
	getFeaturedCategories,
	getPhoto,
	getPhotosByCategory,
	getRollPhotos,
	getRolls,
	modifyPhoto,
	modifyRoll,
	removeFeaturedCategory,
	upsertFeaturedCategory,
} from "./db.ts";

import {deleteS3, getS3, uploadS3} from "./s3.ts";
import {CONFIG} from "./config.ts";
import {processImage} from "./img.ts";
import {lightFormat} from "date-fns";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(
  "/admin/*",
  basicAuth({
    username: "admin",
    password: CONFIG.PORTFOLIO_PASSWORD,
  }),
);

// endpoints > admin > DELETE
app.delete("/admin/roll/:id", async (ctx) => {
  const { roll, photos } = deleteRoll(+ctx.req.param("id"));

  const filesToDelete = photos.map((p) => p.filename as string);

  for (const f of filesToDelete) {
    try {
      await deleteS3(f);
		 try { await deleteS3(`THUMB_${f}.webp`); } catch (e) { console.error("Failed to delete thumb blob", e); }
    } catch {}
  }

  return ctx.json({ roll, photos });
});

app.delete("/admin/photo/:id", async (ctx) => {
  const photo = deletePhoto(+ctx.req.param("id"));
  const fileToDelete = photo?.filename as string;

  await deleteS3(fileToDelete);
	try { await deleteS3(`THUMB_${fileToDelete}.webp`); } catch (e) { console.error("Failed to delete thumb blob", e); }

  return ctx.json(photo);
});

app.delete("/admin/featuredcat/:category", (ctx) => {
  removeFeaturedCategory(ctx.req.param("category"));
  return ctx.text("");
});

// endpoints > admin > CREATE

app.post("/admin/roll", (ctx) => {
  const name = ctx.req.query("name");
  if (!name) return ctx.text("Missing roll name", 400);

  return ctx.json(addRoll(name));
});

app.post("/admin/featuredcat/:category", (ctx) => {
  const feature = ctx.req.query("feature");

  return ctx.json(
    upsertFeaturedCategory(
      ctx.req.param("category"),
      feature ? +feature : undefined,
    ),
  );
});

app.post("/admin/photo", async (ctx) => {
  const roll = ctx.req.query("roll");
  if (!roll) return ctx.text("Missing roll", 400);

  // these filenames can be duplicated across rolls, dont use it as-is for s3
  const rawFilename = ctx.req.query("filename");
  if (!rawFilename) return ctx.text("Missing filename", 400);
	const filename = `${(crypto.randomUUID())}-${rawFilename}.avif`;
  const thumbFilename = `THUMB_${filename}.webp`;

  const avifBuf = await ctx.req.arrayBuffer();
  if (!avifBuf) return ctx.text("Missing body", 400);

  let contentType = ctx.req.header("Content-Type");
  contentType = contentType?.startsWith("image/") ? contentType : "";

  // webp-ize and extract EXIF
  const { thumb, exif } = await processImage(avifBuf);

  const rawTaken = ((exif as any)?.createDate ??
    lightFormat(new Date(), "yyyy:MM:dd HH:mm:ss")).split(" ");

  const taken = rawTaken[0].replaceAll(":", "-") + " " + rawTaken[1];

  await uploadS3(filename, avifBuf);
	await uploadS3(thumbFilename, thumb.buffer as ArrayBuffer);

  return ctx.json(
    addPhoto(
      +roll,
      filename,
      taken,
      ctx.req.query("categories")?.split(","),
		contentType,
      ctx.req.query("name"),
      ctx.req.query("desc"),
      !!ctx.req.query("fave"),
      exif,
    ),
  );
});

// endpoints > admin > update

app.patch("/admin/roll/:id", (ctx) => {
  return ctx.json(
    modifyRoll(
      +ctx.req.param("id"),
      ctx.req.query("name"),
      ctx.req.query("dateadded"),
	 	ctx.req.query("desc"),
    ),
  );
});

app.patch("/admin/photo/:id", (ctx) => {
  const maybeFave = ctx.req.query("fave");
  const fave = maybeFave !== undefined ? maybeFave === "true" : undefined;

  return ctx.json(
    modifyPhoto(
      +ctx.req.param("id"),
      ctx.req.query("taken"),
      ctx.req.query("categories")?.split(","),
      ctx.req.query("name"),
      ctx.req.query("desc"),
      fave,
    ),
  );
});

// endpoints > get

app.get("/category/featured", (ctx) => ctx.json(getFeaturedCategories()));

app.get("/roll", (ctx) => ctx.json(getRolls()));

app.get(
  "/roll/:id/photos",
  (ctx) => ctx.json(getRollPhotos(+ctx.req.param("id"))),
);

app.get(
  "/category/:name/photos",
  (ctx) => ctx.json(getPhotosByCategory(ctx.req.param("name"))),
);

app.get("/photo/:id", (ctx) => ctx.json(getPhoto(+ctx.req.param("id"))));

app.get("/photo/:id/file", async (ctx) => {
  const photo = getPhoto(+ctx.req.param("id"));
  if (!photo?.filename) return ctx.text("Not found", 404);

  const s3Resp = await getS3(photo.filename as string);

  return new Response(s3Resp.body, {
    headers: {
      "Content-Type": (photo.mime as string | null) ?? "image/webp",
      "Content-Length": s3Resp.headers.get("Content-Length") ?? "",
      ETag: s3Resp.headers.get("ETag") ?? "",

      // the important bit!
      "Cache-Control": "max-age=31557600, public, immutable",
    },
  });
});

app.get("/photo/:id/thumbnail", async (ctx) => {
	const photo = getPhoto(+ctx.req.param("id"));
	if (!photo?.filename) return ctx.text("Not found", 404);

	const s3Resp = await getS3(`THUMB_${photo.filename}.webp`);

	return new Response(s3Resp.body, {
		headers: {
			"Content-Type": "image/webp", // we know this to always be true
			"Content-Length": s3Resp.headers.get("Content-Length") ?? "",
			ETag: s3Resp.headers.get("ETag") ?? "",

			// the important bit!
			"Cache-Control": "max-age=31557600, public, immutable",
		},
	});
});

app.post("/test", async (ctx) => {
  return ctx.json(await processImage(await ctx.req.arrayBuffer()));
});

Deno.serve(app.fetch);
