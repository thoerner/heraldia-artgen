import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET = process.env.BUCKET || "heraldsforge.art";
const API_KEY = process.env.API_KEY || "";

function todayKey() {
  const d = new Date().toISOString().slice(0, 10);
  return `api/stats/${d}.json`;
}

async function readDay(key) {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await res.Body.transformToString();
    return JSON.parse(body);
  } catch (e) {
    if (e.name === "NoSuchKey" || e.Code === "NoSuchKey") return [];
    if (e.name === "AccessDenied" && e.message?.includes("ListBucket")) return [];
    throw e;
  }
}

async function writeDay(key, entries) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(entries),
      ContentType: "application/json",
      CacheControl: "private, no-cache",
    }),
  );
}

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || "";

  if (method === "GET") {
    const key = todayKey();
    const entries = await readDay(key);
    const counts = {};
    for (const e of entries) {
      counts[e.event] = (counts[e.event] || 0) + 1;
    }
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date: key.slice(10, 20), counts, total: entries.length }),
    };
  }

  if (method === "POST") {
    const apiKey = event.headers?.["x-api-key"] || event.headers?.["X-Api-Key"] || "";
    if (!API_KEY || apiKey !== API_KEY) {
      return { statusCode: 403, body: "Forbidden" };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: "Bad JSON" };
    }

    const { event: eventName, data, ts } = body;
    if (!eventName || typeof eventName !== "string") {
      return { statusCode: 400, body: "Missing event" };
    }

    const key = todayKey();
    const entries = await readDay(key);
    entries.push({
      event: eventName,
      data: data || {},
      ts: ts || Date.now(),
      server_ts: Date.now(),
    });
    await writeDay(key, entries);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  }

  return { statusCode: 405, body: "Method not allowed" };
}
