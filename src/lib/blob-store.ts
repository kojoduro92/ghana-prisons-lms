import { get, put } from "@vercel/blob";

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const DEFAULT_CACHE_MAX_AGE_SECONDS = 60;
type BlobWriteBody = string | Buffer | Blob | File | ReadableStream<Uint8Array>;

export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  if (!hasBlobStore()) {
    return null;
  }

  const blob = await get(pathname, {
    access: "private",
    useCache: false,
  });

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return null;
  }

  const text = await new Response(blob.stream).text();
  return JSON.parse(text) as T;
}

export async function writeJsonBlob(pathname: string, value: unknown): Promise<void> {
  if (!hasBlobStore()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  await put(pathname, JSON.stringify(value, null, 2), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    cacheControlMaxAge: DEFAULT_CACHE_MAX_AGE_SECONDS,
    contentType: JSON_CONTENT_TYPE,
  });
}

export async function writePrivateBlob(pathname: string, body: BlobWriteBody, contentType?: string) {
  if (!hasBlobStore()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  return put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    cacheControlMaxAge: DEFAULT_CACHE_MAX_AGE_SECONDS,
    contentType,
  });
}

export async function readPrivateBlob(pathname: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!hasBlobStore()) {
    return null;
  }

  const blob = await get(pathname, {
    access: "private",
    useCache: false,
  });

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return null;
  }

  const arrayBuffer = await new Response(blob.stream).arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: blob.blob.contentType,
  };
}
