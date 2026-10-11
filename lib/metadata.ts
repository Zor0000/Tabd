import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import { load } from "cheerio";
import { normalizeUrl } from "./validation";
export function isPublicAddress(address: string) {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export async function safePage(
  raw: string,
  redirects = 0,
): Promise<{ html: string; url: URL }> {
  const url = new URL(normalizeUrl(raw));
  if (redirects > 3) throw new Error("Too many redirects");
  if (url.port && !["80", "443"].includes(url.port))
    throw new Error("Unsupported port");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    /\.(localhost|local|internal|home|lan)$/i.test(hostname)
  )
    throw new Error("Private host");
  const addresses = await Promise.race([
    lookup(hostname, { all: true }),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(
        () => reject(new Error("DNS lookup timed out")),
        2000,
      );
      timer.unref();
    }),
  ]);
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new Error("Private address");
  const address = addresses[0];
  // Pin the validated address into the actual connection to prevent DNS rebinding.
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).get(
      url,
      {
        lookup: (_host, _opts, cb) => cb(null, address.address, address.family),
        headers: {
          "User-Agent": "TabdMetadata/1.0",
          Accept: "text/html",
          "Accept-Encoding": "identity",
        },
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          resolve(
            safePage(
              new URL(response.headers.location, url).toString(),
              redirects + 1,
            ),
          );
          return;
        }
        if (
          response.statusCode !== 200 ||
          !response.headers["content-type"]?.includes("text/html")
        ) {
          response.resume();
          reject(new Error("No HTML metadata"));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          const remaining = 512 * 1024 - size;
          chunks.push(chunk.subarray(0, remaining));
          size += chunk.length;
          // Metadata lives in the head. Keep a bounded prefix instead of rejecting
          // large pages (common with server-rendered component documentation).
          if (
            size >= 512 * 1024 ||
            chunk.toString("utf8").includes("</head>")
          ) {
            resolve({ html: Buffer.concat(chunks).toString("utf8"), url });
            response.destroy();
            request.destroy();
          }
        });
        response.on("end", () =>
          resolve({ html: Buffer.concat(chunks).toString("utf8"), url }),
        );
        response.on("error", reject);
      },
    );
    const timer = setTimeout(
      () => request.destroy(new Error("Metadata request timed out")),
      5000,
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
  });
}
export async function metadata(raw: string) {
  const { html, url } = await safePage(raw);
  const $ = load(html);
  const absolute = (value: string | undefined) => {
    try {
      const u = new URL(value || "", url);
      return /^https?:$/.test(u.protocol) && value ? u.toString() : null;
    } catch {
      return null;
    }
  };
  return {
    title: ($('meta[property="og:title"]').attr("content") || $("title").text())
      .trim()
      .slice(0, 300),
    description: (
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      ""
    )
      .trim()
      .slice(0, 2000),
    favicon_url: absolute($('link[rel~="icon"]').attr("href")),
    preview_image_url: absolute(
      $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        $('meta[property="twitter:image"]').attr("content"),
    ),
  };
}
