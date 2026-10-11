// Curated landing-page captures and compositions. Match exact hosts only.
// Captures refreshed October 12, 2026; these are previews, not live embeds.
const sites: Record<
  string,
  { image?: string; art?: string; title: string; description?: string }
> = {
  "ui.shadcn.com": {
    image: "/previews/shadcn.jpg",
    title: "shadcn/ui",
    description:
      "Accessible UI components and a foundation for your design system.",
  },
  "parthjadhav.com": {
    image: "/previews/parthjadhav.jpg",
    title: "Parth Jadhav",
    description:
      "Software engineer and open-source maker. Developer tools, Mac apps, and projects for the web.",
  },
  "linear.app": { art: "linear", title: "Linear" },
  "reactbits.dev": { art: "reactbits", title: "React Bits" },
  "vercel.com": { art: "vercel", title: "Vercel" },
  "mobbin.com": { art: "mobbin", title: "Mobbin" },
  "supabase.com": { art: "supabase", title: "Supabase" },
  "cursor.com": { art: "cursor", title: "Cursor" },
  "typescriptlang.org": { art: "typescript", title: "TypeScript" },
  "godly.website": { art: "godly", title: "Godly" },
};
export function sitePreview(raw: string) {
  try {
    const url = new URL(raw);
    if (!["https:", "http:"].includes(url.protocol)) return undefined;
    // Deep links retain their own page imagery and title.
    if (url.pathname !== "/" && url.pathname !== "") return undefined;
    return sites[url.hostname.replace(/^www\./, "")];
  } catch {
    return undefined;
  }
}
