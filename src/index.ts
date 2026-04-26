import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { cors } from 'hono/cors'

import {
	addPhoto,
	addRoll,
	deletePhoto,
	deleteRoll,
	getFeaturedCategories, getPhoto,
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

const app = new Hono();

app.use(
  "/admin/*",
  basicAuth({
    username: "admin",
    password: CONFIG.PORTFOLIO_PASSWORD,
  }),
);

app.use("/*", cors({
	origin: "*",
	credentials: true
}))

// endpoints > admin > DELETE
app.delete("/admin/roll/:id", async (ctx) => {
  const { roll, photos } = deleteRoll(+ctx.req.param("id"));

  const filesToDelete = photos.map((p) => p.filename as string);

  for (const f of filesToDelete) {
    try {
      await deleteS3(f);
    } catch {}
  }

  return ctx.json({ roll, photos });
});

app.delete("/admin/photo/:id", async (ctx) => {
  const photo = deletePhoto(+ctx.req.param("id"));
  const fileToDelete = photo?.filename as string;

  await deleteS3(fileToDelete);

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

  const filename = ctx.req.query("filename");
  if (!filename) return ctx.text("Missing filename", 400);

  // TODO: parse taken date somehow
  const taken = ctx.req.query("taken");
  if (!taken) return ctx.text("Missing taken date", 400);

  const body = await ctx.req.arrayBuffer();
  if (!body) return ctx.text("Missing body", 400);

	// TODO: this is a good place to webp-ize the image and maybe extract exif?
	// make sure to store the content-type in the database, and exif.
  await uploadS3(filename, body);

  return ctx.json(
    addPhoto(
      +roll,
      filename,
      taken,
      ctx.req.query("categories")?.split(","),
      ctx.req.query("name"),
      ctx.req.query("desc"),
      !!ctx.req.query("fave"),
    ),
  );
});

// endpoints > admin > update

app.patch("/admin/roll/:id", (ctx) => {
  return ctx.json(modifyRoll(+ctx.req.param("id"), ctx.req.query("name"), ctx.req.query("dateadded")));
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
			// TODO: this can be wrong, store content type and EXIF in database!
			"Content-Type": s3Resp.headers.get("Content-Type") ?? "",
			"Content-Length": s3Resp.headers.get("Content-Length") ?? "",
			"ETag": s3Resp.headers.get("ETag") ?? "",

			// the important bit!
			"Cache-Control": "max-age=31557600, public, immutable"
		}
	})
})

Deno.serve(app.fetch);
