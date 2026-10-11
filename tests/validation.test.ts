import { describe, it, expect } from "vitest";
import { normalizeUrl, resourceSchema, resourcePatch } from "../lib/validation";
import { isPublicAddress, safePage } from "../lib/metadata";
describe("URL and resource validation", () => {
  it("removes tracking and fragments but preserves meaningful query parameters", () => {
    expect(
      normalizeUrl(
        "https://Example.com:443/docs?utm_source=test&q=react&page=2#intro",
      ),
    ).toBe("https://example.com/docs?page=2&q=react");
  });
  it("rejects unsafe protocols and URL credentials", () => {
    for (const url of [
      "javascript:alert(1)",
      "file:///etc/passwd",
      "https://user:secret@example.com",
    ])
      expect(() => normalizeUrl(url)).toThrow();
  });
  it("defaults a URL-only save to Inbox and To Explore", () => {
    const result = resourceSchema.parse({ url: "https://example.com" });
    expect(result.collection_id).toBeNull();
    expect(result.status).toBe("To Explore");
    expect(result.tags).toEqual([]);
  });
  it("partial updates do not reset other fields", () => {
    expect(resourcePatch.parse({ is_favorite: true })).toEqual({
      is_favorite: true,
    });
  });
  it("rejects invalid ownership IDs, statuses and oversized fields", () => {
    expect(
      resourceSchema.safeParse({
        url: "https://example.com",
        collection_id: "someone-else",
      }).success,
    ).toBe(false);
    expect(
      resourceSchema.safeParse({
        url: "https://example.com",
        status: "Archived",
      }).success,
    ).toBe(false);
    expect(
      resourceSchema.safeParse({
        url: "https://example.com",
        personal_note: "a".repeat(5001),
      }).success,
    ).toBe(false);
  });
});
describe("metadata SSRF protections", () => {
  it("rejects private, loopback, link-local, mapped IPv4 and multicast IPs", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.1.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "0.0.0.0",
      "100.64.0.1",
      "224.0.0.1",
      "::1",
      "fe80::1",
      "fc00::1",
      "::ffff:127.0.0.1",
    ])
      expect(isPublicAddress(ip), ip).toBe(false);
  });
  it("allows public IPv4 and IPv6", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
  it("blocks local hostnames and unusual ports before fetching", async () => {
    for (const url of [
      "http://localhost",
      "http://internal.local",
      "http://example.com:9000",
      "http://127.0.0.1",
    ])
      await expect(safePage(url)).rejects.toThrow();
  });
});
