import { DatabaseSync, SQLInputValue } from "node:sqlite";

const DATABASE_CONN = new DatabaseSync(
  Deno.env.get("PORTFOLIO_DB") ?? "portfolio.db",
);

// init database
DATABASE_CONN.exec(`
	PRAGMA foreign_keys = TRUE;

	CREATE TABLE IF NOT EXISTS rolls (
		id        INTEGER PRIMARY KEY,
		name      TEXT,
		dateadded TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	) STRICT;

	CREATE TABLE IF NOT EXISTS photos (
		id         INTEGER PRIMARY KEY,
		roll       INTEGER NOT NULL REFERENCES rolls (id) ON DELETE CASCADE,
		filename   TEXT NOT NULL,
		datetaken  TEXT,
		dateadded  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		name       TEXT,
		desc       TEXT,
		is_fave    INTEGER NOT NULL DEFAULT FALSE,
		-- yeah, I'm using comma separated inline strings. fight me.
		categories TEXT NOT NULL DEFAULT ''
	) STRICT;

	CREATE TABLE IF NOT EXISTS featured_categories (
		category TEXT NOT NULL PRIMARY KEY,
		feature  INTEGER REFERENCES photos (id) ON DELETE SET NULL
	) STRICT, WITHOUT ROWID;
`);

export const getRolls = () =>
  DATABASE_CONN.prepare(`SELECT * FROM rolls`).all();

export const getRollPhotos = (rollId: number) =>
  DATABASE_CONN.prepare(`SELECT * FROM photos WHERE roll = ?`).all(
    rollId,
  );

export const getPhotosByCategory = (category: string) =>
  DATABASE_CONN.prepare(`SELECT * FROM photos WHERE categories LIKE ?`)
    .all(`%${category}%`).filter((photo) =>
      (photo.categories as string)?.split?.(",").includes(category)
    );

export const getFeaturedCategories = () =>
  DATABASE_CONN.prepare(`SELECT * FROM featured_categories`).all();

export const upsertFeaturedCategory = (name: string, feature?: number) =>
  DATABASE_CONN.prepare(
    `INSERT OR REPLACE INTO featured_categories (category, feature) VALUES (?, ?) RETURNING *`,
  ).get(name, feature ?? null);

export const removeFeaturedCategory = (name: string) =>
  DATABASE_CONN.prepare(
    `DELETE FROM featured_categories WHERE name = ? RETURNING *`,
  ).get(name);

export function addRoll(name: string) {
  const rollId = DATABASE_CONN.prepare(`INSERT INTO rolls (name) VALUES (?)`)
    .get(name)?.id;
  if (typeof rollId !== "number") {
    throw new Error("newly created row had a non int id");
  }
  return rollId;
}

export function addPhoto(
  roll: number,
  filename: string,
  taken: string,
  categories: string[] = [],
  name?: string,
  desc?: string,
  is_fave = false,
) {
  const photoId = DATABASE_CONN.prepare(
    `INSERT INTO photos (roll, filename, datetaken, name, desc, is_fave, categories) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .get(
      roll,
      filename,
      taken,
      name ?? null,
      desc ?? null,
      +is_fave,
      categories.join(","),
    )?.id;

  if (typeof photoId !== "number") {
    throw new Error("newly created photo had a non int id?");
  }
  return photoId;
}

export const deletePhoto = (id: number) =>
  DATABASE_CONN.prepare(`DELETE FROM photos WHERE id = ? RETURNING *`).get(id);

export function deleteRoll(id: number) {
  // useful to return these so the caller can delete files
  const photos = getRollPhotos(id);

  const roll = DATABASE_CONN.prepare(
    `DELETE FROM rolls WHERE id = ? RETURNING *`,
  ).get(id);

  return { roll, photos };
}

export function modifyRoll(id: number, desc: string | undefined | null) {
  const columns: string[] = [];
  const params: SQLInputValue[] = [];

  if (desc !== undefined) {
    columns.push("desc");
    params.push(desc);
  }

  if (columns.length === 0) return;

  return DATABASE_CONN.prepare(`UPDATE rolls
                                SET ${columns.map((c) => c + " = ?").join(",")}
                                WHERE id = ? RETURNING *`).get(...params, id);
}

export function modifyPhoto(
  id: number,
  taken: string | null | undefined,
  categories: string[] | undefined,
  name: string | undefined | null,
  desc: string | undefined | null,
  is_fave: boolean | undefined,
) {
  const columns: string[] = [];
  const params: SQLInputValue[] = [];

  if (taken !== undefined) {
    columns.push("datetaken");
    params.push(taken);
  }

  if (categories !== undefined) {
    columns.push("categories");
    params.push(categories.join(","));
  }

  if (name !== undefined) {
    columns.push("name");
    params.push(name);
  }

  if (desc !== undefined) {
    columns.push("desc");
    params.push(desc);
  }

  if (is_fave !== undefined) {
    columns.push("is_fave");
    params.push(+is_fave);
  }

  if (columns.length === 0) return;

  return DATABASE_CONN.prepare(`UPDATE photos
                                SET ${columns.map((c) => c + " = ?").join(",")}
                                WHERE id = ? RETURNING *`).get(...params, id);
}
