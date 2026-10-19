# Tabd launch materials

Prepared 19 October 2026. Announcement drafts below have not been posted. Distribution is the public GitHub unpacked pilot release; the announcement destination is X.

## Product description

**Tabd — Good finds, kept.**

Tabd is a personal web library for saving useful pages, organizing references, and bringing your own context into coding-agent conversations. Keep links, notes, and favorites together on the web, save pages with a desktop browser extension, and connect compatible agents through five read-only MCP tools.

## Features

- A personal library with collections, tags, notes, favorites, and search.
- A responsive website for browsing and adding links on desktop, phone, and tablet.
- A Chrome-compatible desktop extension: open a page, choose a collection, save.
- Saved-page previews, including hosted screenshots.
- Five read-only MCP tools: `search_library`, `get_reference`, `get_collection`, `get_taste_profile`, and `get_design_context`.
- Explicit design preferences and favorite examples to give coding agents personal context.
- Separate, revocable extension and agent access. MCP tokens expire after 30 days; agents cannot edit the library through these tools.

## Get started

### Website

1. Open https://www.tab-dd.tech and create an account.
2. Confirm your email and sign in. A new account starts with an empty library.
3. Create a collection and use **Add resource** to save a URL. Add notes, tags, or favorites to make it easier to find later.
4. On a phone or tablet, copy a link and add it through the website.

### Extension

Use the [version 0.1.1 installation and update guide](extension-release.md). The current release is an unpacked desktop extension with manual updates and operator-assisted registration of new installation IDs. It is not yet available from the Chrome Web Store. Existing verified users should reload the extension at its existing path.

### MCP / coding agents

1. Sign in and open https://www.tab-dd.tech/agents, or library **Settings → Connect coding agents**.
2. Name the connection and create a token. Copy it while visible and store it in your client's secret settings.
3. In a client supporting **Streamable HTTP with custom bearer authentication**, set the endpoint to `https://www.tab-dd.tech/api/mcp` and the header to `Authorization: Bearer YOUR_TOKEN`.
4. Ask the client to discover the tools, then try: “Search my saved references for dashboard examples and summarize the notes I wrote.” Add explicit design preferences and favorite examples on the agent settings page for richer context.
5. Revoke a token on the same page when no longer needed; create a new token after expiry. Never paste tokens into announcement posts or commit them to a repository.

This release uses personal tokens, not OAuth. OAuth-only clients are unsupported. Search is keyword-based, not semantic search; design preferences are user-written, not inferred. Full integration details are in [MCP documentation](mcp.md).

## Short announcement draft

I built Tabd: a personal home for the useful things you find on the web. Save links, organize references, add notes, and let compatible coding agents search your library through read-only MCP tools.

Try the website: https://www.tab-dd.tech

The desktop extension is available as an unpacked pilot release with assisted setup; Chrome Web Store publication is still ahead. I'd love feedback on saving and finding references.

## Longer announcement draft

Introducing **Tabd — Good finds, kept.**

I wanted a place to keep useful pages and the context that made them worth saving. Tabd brings links, collections, notes, tags, and favorites into one personal web library.

You can add links from the website, save pages with the desktop extension, and give compatible coding agents read-only access to your own references. Its five MCP tools help agents find saved examples, read collections, and use the design preferences you explicitly provide.

The website is live at https://www.tab-dd.tech. The Chrome-compatible extension is currently an unpacked pilot release with manual installation and assisted pairing, not a Chrome Web Store listing.

Try saving a few references for your next project. I'd love to hear what makes them easier—or harder—to find again.

## Release note draft

**Tabd extension 0.1.1 — unpacked pilot release**

Restores the native toolbar popup width and keeps production builds pointed at `https://www.tab-dd.tech`, independent of local environment files. Test builds use a separate directory so they cannot overwrite an installed production extension.

Includes a Manifest V3 ZIP, checksum, and installation/update guide. Existing users should reload the extension in place. New installation IDs require production registration before pairing. No Chrome Web Store publication is claimed.

## Publication boundaries

The extension channel is the public GitHub release; X drafts remain unposted pending copy approval. No pricing, unlimited usage, uptime SLA, or measured concurrency claim is included. Functional acceptance and configured rate limits do not establish load capacity. Confirm operational spend alerts and notification preferences before broad promotion; these have not been configured by this launch task.
