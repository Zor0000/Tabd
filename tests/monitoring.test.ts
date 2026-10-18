import { describe, expect, it, vi } from "vitest";
import { monitored } from "../lib/monitoring";
describe("privacy-safe request monitoring", () => {
  it("records status and duration without request secrets", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const request = new Request(
      "https://example.test/api/resources?q=private",
      { headers: { authorization: "Bearer secret" } },
    );
    const response = await monitored(
      "GET /api/resources",
      async (request: Request) => {
        expect(request.headers.has("authorization")).toBe(true);
        return new Response("private body", { status: 429 });
      },
    )(request);
    const event = JSON.parse(log.mock.calls[0][0]);
    expect(event).toMatchObject({
      event: "api_request",
      status: 429,
      route: "GET /api/resources",
    });
    expect(response.headers.get("X-Request-Id")).toBe(event.requestId);
    expect(JSON.stringify(event)).not.toMatch(/private|secret/);
    log.mockRestore();
  });
  it("records uncaught failures without leaking their messages", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      monitored("POST /api/resources", async () => {
        throw new Error("private database details");
      })(),
    ).rejects.toThrow();
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ status: 500 });
    expect(log.mock.calls[0][0]).not.toContain("private");
    log.mockRestore();
  });
});
