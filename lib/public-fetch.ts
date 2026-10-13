import { lookup } from "node:dns/promises";
import http, { type IncomingHttpHeaders } from "node:http";
import https from "node:https";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import ipaddr from "ipaddr.js";
import { normalizeUrl } from "./validation";

export function isPublicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

export class PublicFetchError extends Error {
  constructor(
    message: string,
    public kind: "unsafe" | "http" | "network" | "limit",
    public status?: number,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function publicAddress(url: URL) {
  try {
    normalizeUrl(url.toString());
  } catch {
    throw new PublicFetchError("Unsafe preview URL", "unsafe");
  }
  if (url.port && !["80", "443"].includes(url.port))
    throw new PublicFetchError("Unsupported port", "unsafe");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    /\.(localhost|local|internal|home|lan)$/i.test(hostname)
  )
    throw new PublicFetchError("Private host", "unsafe");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const addresses = await Promise.race([
      lookup(hostname, { all: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("DNS lookup timed out")),
          2000,
        );
      }),
    ]);
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
      throw new PublicFetchError("Private address", "unsafe");
    return addresses.find((address) => address.family === 4) || addresses[0];
  } finally {
    clearTimeout(timer);
  }
}

type Options = {
  maxBytes?: number;
  headOnly?: boolean;
  followRedirects?: boolean;
  signal?: AbortSignal;
  userAgent?: string;
};
type PublicResponse = {
  body: Buffer;
  url: URL;
  status: number;
  headers: IncomingHttpHeaders;
};

// All metadata and capture traffic uses the same DNS-pinned connection. The
// renderer never connects directly to a URL supplied by a page's JavaScript.
export async function publicFetch(
  raw: string,
  options: Options = {},
  redirects = 0,
): Promise<PublicResponse> {
  if (redirects > 3) throw new Error("Too many redirects");
  options.signal?.throwIfAborted();
  const url = new URL(raw);
  const address = await publicAddress(url);
  options.signal?.throwIfAborted();
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).get(
      url,
      {
        // Explicit family disables Node's family auto-selection (all: true),
        // matching this lookup's single validated address callback.
        family: address.family,
        lookup: (_host, _opts, cb) => cb(null, address.address, address.family),
        signal: options.signal,
        headers: {
          "User-Agent": options.userAgent || "TabdMetadata/1.0",
          Accept: options.headOnly ? "text/html" : "*/*",
          "Accept-Encoding": "identity",
        },
      },
      async (response) => {
        const status = response.statusCode || 502;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          try {
            const destination = new URL(response.headers.location, url);
            if (options.followRedirects !== false) {
              resolve(
                publicFetch(destination.toString(), options, redirects + 1),
              );
            } else {
              await publicAddress(destination);
              resolve({
                body: Buffer.alloc(0),
                url,
                status,
                headers: { location: destination.toString() },
              });
            }
          } catch (error) {
            reject(error);
          }
          return;
        }
        if (
          options.headOnly &&
          (status !== 200 ||
            !response.headers["content-type"]?.includes("text/html"))
        ) {
          response.resume();
          const retry = response.headers["retry-after"];
          const seconds = retry ? Number(retry) : NaN;
          const delay = Number.isFinite(seconds)
            ? seconds * 1000
            : retry
              ? Date.parse(retry) - Date.now()
              : undefined;
          reject(
            new PublicFetchError("No HTML metadata", "http", status, delay),
          );
          return;
        }
        const encoding = response.headers["content-encoding"];
        const decoder =
          encoding === "br"
            ? createBrotliDecompress()
            : encoding === "gzip"
              ? createGunzip()
              : encoding === "deflate"
                ? createInflate()
                : null;
        const stream = decoder ? response.pipe(decoder) : response;
        let size = 0;
        let tail = "";
        const chunks: Buffer[] = [];
        const complete = () =>
          resolve({
            body: Buffer.concat(chunks),
            url,
            status,
            headers: response.headers,
          });
        stream.on("data", (chunk: Buffer) => {
          if (!options.headOnly && size + chunk.length > maxBytes) {
            const error = new Error("Preview asset too large");
            reject(error);
            request.destroy(error);
            stream.destroy();
            return;
          }
          chunks.push(chunk.subarray(0, Math.max(0, maxBytes - size)));
          size += chunk.length;
          const text = tail + chunk.toString("utf8");
          tail = text.slice(-7);
          if (
            options.headOnly &&
            (size >= maxBytes || /<\/head>/i.test(text))
          ) {
            complete();
            stream.destroy();
            request.destroy();
          }
        });
        stream.on("end", complete);
        stream.on("error", reject);
        response.on("error", reject);
      },
    );
    const timer = setTimeout(
      () => request.destroy(new Error("Preview request timed out")),
      5000,
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
  });
}
