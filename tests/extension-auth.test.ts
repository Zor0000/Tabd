import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { actor } from "../lib/api";
import { serverClient } from "../lib/supabase/server";
import { limitActor } from "../lib/rate-limit";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("../lib/supabase/server", () => ({ serverClient: vi.fn() }));
vi.mock("../lib/rate-limit", async (original) => ({
  ...(await original<typeof import("../lib/rate-limit")>()),
  limitActor: vi.fn(),
}));

const token = `tabd_${"a".repeat(64)}`;
const db = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  maybeSingle: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test");
  for (const method of [db.from, db.select, db.eq, db.gt])
    method.mockReturnValue(db);
  db.maybeSingle.mockResolvedValue({ data: { user_id: "owner" }, error: null });
  vi.mocked(createClient).mockReturnValue(
    db as unknown as ReturnType<typeof createClient>,
  );
});
afterEach(() => vi.unstubAllEnvs());

function request(authorization: string) {
  return new Request("https://tabd.test/api/resources", {
    headers: { authorization },
  });
}

it.each(["Bearer", "bearer", "BEARER"])(
  "accepts the %s authentication scheme",
  async (scheme) => {
    expect(await actor(request(`${scheme} ${token}`))).toMatchObject({
      userId: "owner",
      extension: true,
    });
    expect(limitActor).toHaveBeenCalledOnce();
    expect(serverClient).not.toHaveBeenCalled();
  },
);

it.each(["", token, `Basic ${token}`, `Bearer ${token} extra`])(
  "rejects malformed authorization (%s) without cookie fallback",
  async (header) => {
    await expect(actor(request(header))).rejects.toMatchObject({ status: 401 });
    expect(createClient).not.toHaveBeenCalled();
    expect(serverClient).not.toHaveBeenCalled();
  },
);

it("reports a database outage without asking the user to replace valid credentials", async () => {
  db.maybeSingle.mockResolvedValue({
    data: null,
    error: { message: "unavailable" },
  });
  await expect(actor(request(`Bearer ${token}`))).rejects.toMatchObject({
    status: 503,
  });
  expect(limitActor).not.toHaveBeenCalled();
});

it("still rejects expired or revoked credentials", async () => {
  db.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(actor(request(`Bearer ${token}`))).rejects.toMatchObject({
    status: 401,
  });
});
