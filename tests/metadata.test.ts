import http from "node:http";
import { lookup } from "node:dns/promises";
import { gzipSync } from "node:zlib";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { metadata, safePage, parseMetadata } from "../lib/metadata";
import { publicFetch } from "../lib/public-fetch";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

const html =
  '<html><head><title>A real website</title><meta name="description" content="Useful tools"><meta property="og:image" content="/og.png"><link rel="icon" href="/icon.svg"></head><body>Page</body></html>';
const hits = new Map<string, number>();
const server = http.createServer((req, res) => {
  const path = req.url || "";
  hits.set(path, (hits.get(path) || 0) + 1);
  if (path === "/transient" && hits.get(path) === 1) {
    res.writeHead(503).end();
    return;
  }
  if (path === "/rate-limit") {
    res.writeHead(429, { "retry-after": "120" }).end();
    return;
  }
  if (path === "/encoded") {
    res
      .writeHead(200, { "content-type": "text/html; charset=windows-1252" })
      .end(Buffer.from("<head><title>Caf\xe9</title></head>", "latin1"));
    return;
  }
  if (req.url === "/redirect") {
    res.writeHead(302, { location: "http://example.test/page" }).end();
  } else if (req.url === "/private-redirect") {
    res.writeHead(302, { location: "http://internal.test/secret" }).end();
  } else if (req.url === "/large") {
    res
      .writeHead(200, { "content-type": "text/html" })
      .end(html + "x".repeat(600 * 1024));
  } else if (req.url === "/gzip") {
    res
      .writeHead(200, {
        "content-type": "text/html",
        "content-encoding": "gzip",
      })
      .end(gzipSync(html));
  } else if (req.url === "/oversized") {
    res.writeHead(200, { "content-type": "image/png" }).end("x".repeat(2048));
  } else {
    res.writeHead(200, { "content-type": "text/html" }).end(html);
  }
});
const realGet = http.get.bind(http);
let pinned: string | undefined;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  // Connect only to our test server, but let Node itself exercise the custom
  // lookup callback. Omitting the explicit family reproduces the original
  // ERR_INVALID_IP_ADDRESS failure on Node 22/24/26.
  vi.spyOn(http, "get").mockImplementation((url, options, callback) =>
    realGet(
      url,
      {
        ...options,
        port,
        lookup(host, opts, cb) {
          options.lookup!(host, opts, (error, address, family) => {
            if (error) return cb(error, "", 4);
            pinned = address as string;
            if (opts.all) return cb(null, address as never);
            cb(null, "127.0.0.1", family);
          });
        },
      },
      callback,
    ),
  );
});

beforeEach(() => {
  pinned = undefined;
  hits.clear();
  vi.mocked(lookup).mockImplementation(
    async (host) =>
      [
        {
          address: host === "internal.test" ? "10.0.0.1" : "8.8.8.8",
          family: 4,
        },
      ] as never,
  );
});

afterAll(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("metadata transport regression", () => {
  it("reads real HTTP metadata through the DNS-pinned lookup on modern Node", async () => {
    expect(await metadata("http://example.test/page")).toEqual({
      title: "A real website",
      description: "Useful tools",
      favicon_url: "http://example.test/icon.svg",
      preview_image_url: "http://example.test/og.png",
    });
    expect(pinned).toBe("8.8.8.8");
  });

  it("resolves metadata relative to a validated redirect destination", async () => {
    const page = await safePage("http://example.test/redirect");
    expect(page.url.toString()).toBe("http://example.test/page");
    expect(page.html).toContain("A real website");
  });

  it.each([true, false])(
    "blocks redirects to private addresses (follow=%s)",
    async (followRedirects) => {
      await expect(
        publicFetch("http://example.test/private-redirect", {
          followRedirects,
        }),
      ).rejects.toThrow("Private address");
    },
  );

  it("keeps metadata from large and compressed documents", async () => {
    for (const path of ["large", "gzip"]) {
      expect(
        (await metadata(`http://example.test/${path}`)).preview_image_url,
      ).toBe("http://example.test/og.png");
    }
  });

  it("rejects oversized capture assets instead of buffering them", async () => {
    await expect(
      publicFetch("http://example.test/oversized", { maxBytes: 1024 }),
    ).rejects.toThrow("Preview asset too large");
  });

  it("rejects mixed public/private DNS answers", async () => {
    vi.mocked(lookup).mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ] as never);
    await expect(safePage("http://example.test/page")).rejects.toThrow(
      "Private address",
    );
    expect(pinned).toBeUndefined();
  });
  it("retries a transient server failure once and respects rate limits", async () => {
    expect((await metadata("http://example.test/transient")).title).toBe(
      "A real website",
    );
    expect(hits.get("/transient")).toBe(2);
    await expect(
      metadata("http://example.test/rate-limit"),
    ).rejects.toMatchObject({ status: 429, retryAfter: 120000 });
    expect(hits.get("/rate-limit")).toBe(1);
  });
  it("decodes legacy page character sets", async () => {
    expect((await metadata("http://example.test/encoded")).title).toBe("Café");
  });
  it("supports Twitter-only metadata, case variation, relative bases and usable image fallbacks", () => {
    const result = parseMetadata(
      '<base href="/assets/"><meta name="Twitter:Title" content="A useful page"><meta property="OG:IMAGE" content="javascript:alert(1)"><meta name="twitter:image:src" content="image.png?z=1&amp;a=2"><meta name="Twitter:Description" content="Details"><link rel="shortcut ICON" href="icon.svg">',
      new URL("https://example.com/docs/"),
    );
    expect(result).toEqual({
      title: "A useful page",
      description: "Details",
      favicon_url: "https://example.com/assets/icon.svg",
      preview_image_url: "https://example.com/assets/image.png?z=1&a=2",
    });
  });
});
