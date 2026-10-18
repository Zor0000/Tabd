import { enforceLimit } from "./rate-limit";
import { operationalEvent } from "./monitoring";
import { createHash } from "node:crypto";
import type { actor } from "./api";
import { normalizeUrl } from "./validation";
import { websiteCapture } from "./website-capture";

type Database = Awaited<ReturnType<typeof actor>>["db"];
export function previewObjectPath(userId: string, id: string, raw: string) {
  return `${userId}/${id}/${createHash("sha256").update(normalizeUrl(raw)).digest("hex")}.jpg`;
}
async function bounded<T>(promise: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Preview storage timed out")),
          3000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
function validJpeg(image: Buffer) {
  return (
    image.length <= 2 * 1024 * 1024 &&
    image[0] === 0xff &&
    image[1] === 0xd8 &&
    image[2] === 0xff
  );
}
export async function persistedCapture(
  db: Database,
  userId: string,
  id: string,
  url: string,
) {
  const path = previewObjectPath(userId, id, url);
  const bucket = db.storage.from("website-previews");
  try {
    const { data } = await bounded(bucket.download(path));
    if (data) {
      const image = Buffer.from(await data.arrayBuffer());
      if (validJpeg(image)) return image;
    }
  } catch {
    /* Storage outages do not hide a capture we can regenerate. */
  }
  await enforceLimit(userId, "capture");
  await enforceLimit(userId, "captureDaily");
  await enforceLimit("global", "captureGlobal");
  const started = performance.now();
  let image: Buffer;
  try {
    image = await websiteCapture(url);
    operationalEvent("capture", {
      outcome: "success",
      durationMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    operationalEvent("capture", {
      outcome: "failure",
      status: 502,
      durationMs: Math.round(performance.now() - started),
    });
    throw error;
  }
  if (validJpeg(image)) {
    try {
      const { error } = await bounded(
        bucket.upload(path, image, { contentType: "image/jpeg", upsert: true }),
      );
      if (error)
        console.warn(
          "Preview could not be persisted; check the website-previews bucket migration.",
        );
    } catch {
      console.warn("Preview storage unavailable; serving the generated image.");
    }
  }
  return image;
}
