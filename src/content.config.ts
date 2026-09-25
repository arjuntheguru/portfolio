import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// "2023-09", or just "2023" when the month doesn't matter.
const when = z.string().regex(/^\d{4}(-\d{2})?$/, "use YYYY-MM or YYYY");

const experience = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/experience" }),
  schema: z.object({
    kind: z.enum(["work", "education"]).default("work"),
    org: z.string(),
    role: z.string(),
    where: z.string().optional(),
    start: when,
    end: when.nullable().default(null),
    note: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    // How the entry appears in the git log graph (work only; education has its own section).
    // Lane 0 is main, higher lanes are branches.
    // Parents work like git: a commit's line runs down to each parent's commit, so a branch
    // forks where its first commit's parent is, and merges where a commit has two parents.
    commit: z.object({
      order: z.number().int(),
      hash: z.string().regex(/^[0-9a-f]{7}$/),
      message: z.string(),
      lane: z.number().int().min(0).max(3),
      parents: z.array(z.string().regex(/^[0-9a-f]{7}$/)).default([]),
      refs: z.array(z.object({ label: z.string(), kind: z.enum(["head", "branch"]) })).default([]),
    }).optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/projects" }),
  schema: z.object({
    name: z.string(),
    url: z.url().optional(),
    order: z.number().int(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { experience, projects };
