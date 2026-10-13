// Public application identity for extension discovery. No account information or credentials.
export function GET() {
  return Response.json(
    { app: "tabd", extensionLinkVersion: 1 },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
