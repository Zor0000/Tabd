// Reproduce serverless dependency loading using only Next's traced files.
import { mkdtemp, readFile, cp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = await mkdtemp(path.join(tmpdir(), "tabd-preview-trace-"));
try {
  const base = path.resolve(".next/server/app/api/resources/[id]/preview");
  const trace = JSON.parse(
    await readFile(path.join(base, "route.js.nft.json"), "utf8"),
  );
  for (const file of trace.files) {
    const source = path.resolve(base, file);
    const relative = path.relative(process.cwd(), source);
    if (!relative.startsWith("node_modules/playwright")) continue;
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target);
  }
  execFileSync(
    process.execPath,
    ["--input-type=module", "-e", 'await import("playwright")'],
    { cwd: root, stdio: "pipe" },
  );
  console.log("PASS isolated serverless Playwright bundle import");
} finally {
  await rm(root, { recursive: true, force: true });
}
