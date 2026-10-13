import { z } from "zod";
import { statuses } from "./types";
import { normalizeUrl } from "./url";
export { normalizeUrl } from "./url";
const url = z
  .string()
  .trim()
  .max(4096)
  .transform((s, ctx) => {
    try {
      return normalizeUrl(s);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid HTTP or HTTPS website URL.",
      });
      return z.NEVER;
    }
  });
const optionalUrl = z.union([url, z.null()]).default(null);
export const resourceSchema = z.object({
  url,
  title: z.string().trim().max(300).default(""),
  description: z.string().trim().max(2000).default(""),
  collection_id: z.uuid().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  personal_note: z.string().max(5000).default(""),
  status: z.enum(statuses).default("To Explore"),
  favicon_url: optionalUrl,
  preview_image_url: optionalUrl,
  metadata_snapshot: z
    .object({
      title: z.string().max(300).optional(),
      description: z.string().max(2000).optional(),
      favicon_url: optionalUrl.optional(),
      preview_image_url: optionalUrl.optional(),
    })
    .default({}),
});
export const resourcePatch = z.object({
  url: resourceSchema.shape.url.optional(),
  title: resourceSchema.shape.title.removeDefault().optional(),
  description: resourceSchema.shape.description.removeDefault().optional(),
  collection_id: resourceSchema.shape.collection_id.removeDefault().optional(),
  tags: resourceSchema.shape.tags.removeDefault().optional(),
  personal_note: resourceSchema.shape.personal_note.removeDefault().optional(),
  status: resourceSchema.shape.status.removeDefault().optional(),
  favicon_url: resourceSchema.shape.favicon_url.removeDefault().optional(),
  preview_image_url: resourceSchema.shape.preview_image_url
    .removeDefault()
    .optional(),
  metadata_snapshot: resourceSchema.shape.metadata_snapshot
    .removeDefault()
    .optional(),
  is_favorite: z.boolean().optional(),
  is_archived: z.boolean().optional(),
});
export const collectionSchema = z.object({
  name: z.string().trim().min(1).max(60),
  parent_id: z.uuid().nullable().default(null),
  color: z
    .enum(["violet", "blue", "green", "orange", "pink"])
    .default("violet"),
});

export const collectionPatch = z.object({
  name: collectionSchema.shape.name.optional(),
  parent_id: collectionSchema.shape.parent_id.removeDefault().optional(),
  color: collectionSchema.shape.color.removeDefault().optional(),
});
