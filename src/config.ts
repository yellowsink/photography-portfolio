export const CONFIG = {
	PORTFOLIO_DB: Deno.env.get("PORTFOLIO_DB") ?? "portfolio.db",
	PORTFOLIO_S3_ENDPOINT: Deno.env.get("PORTFOLIO_S3_ENDPOINT") ??
		"https://s3.us-west-004.backblazeb2.com",
	PORTFOLIO_S3_BUCKET: Deno.env.get("PORTFOLIO_S3_BUCKET") ?? "ys-photo-portfolio",
	PORTFOLIO_S3_KEY: Deno.env.get("PORTFOLIO_S3_KEY") ?? "",
	PORTFOLIO_S3_SECRET: Deno.env.get("PORTFOLIO_S3_SECRET") ?? "",
	PORTFOLIO_PASSWORD: Deno.env.get("PORTFOLIO_PASSWORD") ?? "admin"
} as const;

console.log("config: ", CONFIG);