import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET || "heraldsforge.art";
const KEY = "api/recent-forges.json";
const API_KEY = process.env.API_KEY || "";
const MAX_ENTRIES = 10;

async function readForges() {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: KEY }));
    const body = await res.Body.transformToString();
    return JSON.parse(body);
  } catch (e) {
    if (e.name === "NoSuchKey" || e.Code === "NoSuchKey") return [];
    if (e.name === "AccessDenied" && e.message?.includes("ListBucket")) return [];
    throw e;
  }
}

async function writeForges(entries) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY,
      Body: JSON.stringify(entries),
      ContentType: "application/json",
      CacheControl: "public, max-age=60",
    }),
  );
}

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || "";

  if (method === "GET") {
    const entries = await readForges();
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entries),
    };
  }

  if (method === "POST") {
    const key = event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"] || "";
    if (!API_KEY || key !== API_KEY) {
      return { statusCode: 403, body: "Forbidden" };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: "Bad JSON" };
    }

    const { tokenId, hash, svg } = body;
    if (!tokenId || !svg) {
      return { statusCode: 400, body: "Missing tokenId or svg" };
    }

    const entries = await readForges();
    const entry = { tokenId: String(tokenId), hash: hash || "", svg, ts: Math.floor(Date.now() / 1000) };

    const filtered = entries.filter((e) => e.tokenId !== entry.tokenId);
    filtered.unshift(entry);
    const trimmed = filtered.slice(0, MAX_ENTRIES);

    await writeForges(trimmed);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, count: trimmed.length }),
    };
  }

  return { statusCode: 405, body: "Method not allowed" };
}
