# Tabd MCP

Tabd gives coding agents read-only access to the connected user's saved references, collections, personal notes, favorites, and explicit design preferences.

## Setup

1. Apply the migrations to the **intended Tabd database** using the project's migration workflow. This feature adds `mcp_tokens`, `taste_profiles`, and `search_library_references` in `20261012121313_personal_library_mcp.sql`.
2. Set the existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `NEXT_PUBLIC_APP_URL` variables. The secret key stays exclusively on the server. No model provider key is needed.
3. Start the app and sign in. In library **Settings → Connect coding agents**, or at `/agents`, enter an agent name and create a token. Copy it while it is visible; Tabd stores only its SHA-256 hash.
4. In an MCP client that supports Streamable HTTP and custom bearer credentials, use your app's `/api/mcp` URL and the HTTP header `Authorization: Bearer YOUR_TOKEN`. Use HTTPS outside localhost. Store the token in the client's secret/environment settings; do not commit it to a repository.
5. Optionally save your design preferences on the same page. Add notes to your references and favorite examples to explain what matters to you.

The endpoint uses the official TypeScript MCP SDK, stateless Streamable HTTP, and JSON responses. Each request authenticates independently. GET and DELETE return 405 because there is no persistent SSE session. This release uses personal tokens; OAuth discovery and browser login from inside an MCP client are not implemented. Clients that require OAuth exclusively are not yet supported.

## Tools

| Tool                 | Input                                                                                              | Result                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `search_library`     | Optional `query`, `collection_id`, `tags`, `favorites_only`, `include_archived`, `limit`, `offset` | Ranked references with personal notes, original URLs, available previews, and `next_offset`          |
| `get_reference`      | `reference_id`                                                                                     | Saved details and containing collection                                                              |
| `get_collection`     | Optional `collection_id`, `limit`, `offset`                                                        | Without an ID: discover collections. With an ID: collection and references in it and its descendants |
| `get_taste_profile`  | Optional `collection_id`                                                                           | User-written preferences and up to 20 favorite examples; indicates whether more favorites exist      |
| `get_design_context` | `task`, `query`, optional `collection_id`, `limit`                                                 | Task, matched references, and explicit preferences in one response                                   |

Search uses PostgreSQL full-text keyword matching over title, description, hostname, tags, and notes. It searches the full account library in the database rather than a truncated in-memory sample. Results sort by text relevance, favorite status, most recent update, and ID. Empty search browses the library. Multiple words are ANDed; use `OR` for alternatives and quotes for phrases. Tags require all supplied exact values. Archived items are excluded by default. Pagination uses offsets (default 20, maximum 50); follow `next_offset` until null. Collections include their descendants. A missing or inaccessible collection produces a tool error, never a whole-library fallback.

For a task such as “build a compact dashboard,” an agent should extract search terms such as `dashboard OR sidebar` for `query`. This release does not perform semantic/vector search or automatically infer aesthetic traits. Preferences remain global when examples are scoped to a collection. An empty profile is explicitly unspecified taste. No matches means an empty result; web results are never substituted.

Previews are saved site metadata, usually Open Graph images. They are links, not verified screenshots, captured components, source code, or a visual analysis. The server never fetches external references during tool execution. Component capture can be added later without changing the existing reference IDs.

## Access model

- Tokens are named, expire after 30 days, and are revocable individually at `/agents`. Revocation takes effect on the next request, including after MCP initialization.
- Agent tokens use the `tabd_mcp_` prefix and a separate table. They are rejected by the existing read/write library and extension APIs. Extension tokens and browser cookies are rejected by the MCP endpoint.
- Token creation, listing, revocation, and preference editing require a verified browser session. Bearer credentials cannot manage access or edit preferences.
- Every library query is scoped to the verified token owner. SQL functions use invoker privileges and table RLS; all new tables enable RLS with explicit grants. Service-role queries always pass the authenticated token's owner, never an agent-supplied account ID.
- All MCP tools are read-only. Tool schemas reject unknown fields and bound input sizes. HTTP bodies are limited to 20 KB. Responses are private and uncached. Cross-origin browser requests are rejected against the configured app origin.
- Site metadata and personal notes are reference data. The server's instructions explicitly tell agents not to execute embedded instructions from saved content. Explicit preferences guide design choices, not authorization.

## Verification

`npm test` covers MCP initialization, discovery and all five tool calls using the official SDK client and HTTP transport, validation, auth rejection, expiry, revocation, owner scoping, and safe errors. PostgreSQL/PGlite tests execute the migration and verify RLS, grants, collection descendants, filtering, ranking, pagination, and cross-account search. Browser tests cover creation/revocation and preference editing with controlled API fixtures, including mobile layouts and setup failures.

To smoke-test a running configured instance, supply `TABD_MCP_URL` and `TABD_MCP_TOKEN` through your shell environment and run `npm run test:mcp:live`. The script uses read-only calls and prints tool names and pass/fail status, not your saved content or token.

Hosted acceptance still requires applying this branch's migration and connecting a real account: create a token, run the smoke test, verify results in your MCP client, revoke the token, then confirm reconnecting fails. Local fixtures do not establish that hosted acceptance has passed.
