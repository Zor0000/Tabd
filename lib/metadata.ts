import { load } from "cheerio";
import { publicFetch, PublicFetchError } from "./public-fetch";
import { normalizeUrl } from "./validation";
export { isPublicAddress } from "./public-fetch";

export async function safePage(raw: string, signal?: AbortSignal) {
  const { body, url, headers } = await publicFetch(raw, {
    headOnly: true,
    maxBytes: 512 * 1024,
    signal,
  });
  const charset =
    headers["content-type"]?.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1] ||
    body
      .subarray(0, 1024)
      .toString("ascii")
      .match(/charset\s*=\s*["']?([^\s;"'>]+)/i)?.[1] ||
    "utf-8";
  let html: string;
  try {
    html = new TextDecoder(charset).decode(body);
  } catch {
    html = body.toString("utf8");
  }
  return { html, url };
}

export function parseMetadata(html: string, url: URL) {
  const $ = load(html);
  const tags = new Map<string, string[]>();
  $("meta").each((_, element) => {
    const key = ($(element).attr("property") || $(element).attr("name") || "")
      .toLowerCase()
      .trim();
    const content = $(element).attr("content")?.trim();
    if (content) tags.set(key, [...(tags.get(key) || []), content]);
  });
  const content = (...keys: string[]) =>
    keys.flatMap((key) => tags.get(key) || []);
  const base = (() => {
    try {
      return new URL(
        normalizeUrl(
          new URL($("base[href]").first().attr("href") || "", url).toString(),
        ),
      );
    } catch {
      return url;
    }
  })();
  const absolute = (values: (string | undefined)[]) => {
    for (const value of values) {
      if (!value?.trim()) continue;
      try {
        const absolute = new URL(value.trim(), base).toString();
        normalizeUrl(absolute); // Validate without reordering signed image queries.
        return absolute;
      } catch {
        /* Try the next usable metadata image. */
      }
    }
    return null;
  };
  return {
    title: (
      content("og:title", "twitter:title")[0] || $("title").first().text()
    )
      .trim()
      .slice(0, 300),
    description: (
      content("description", "og:description", "twitter:description")[0] || ""
    ).slice(0, 2000),
    favicon_url: absolute(
      $("link[rel]")
        .toArray()
        .filter((element) =>
          /(?:^|\s)icon(?:\s|$)/i.test($(element).attr("rel") || ""),
        )
        .map((element) => $(element).attr("href")),
    ),
    preview_image_url: absolute(
      content(
        "og:image",
        "og:image:secure_url",
        "twitter:image",
        "twitter:image:src",
      ),
    ),
  };
}

export async function metadata(raw: string, signal?: AbortSignal) {
  const deadline = AbortSignal.timeout(12000);
  const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
  for (let attempt = 0; ; attempt++) {
    try {
      const { html, url } = await safePage(raw, combined);
      return parseMetadata(html, url);
    } catch (error) {
      // Retry one transient failure within a fixed total budget. HTTP rate limits
      // and long outages are handled by the bookmark's durable retry schedule.
      if (
        attempt ||
        combined.aborted ||
        (error instanceof PublicFetchError &&
          (error.kind === "unsafe" ||
            (error.retryAfter || 0) > 0 ||
            (error.kind === "http" && (error.status || 0) < 500)))
      )
        throw error;
    }
  }
}
