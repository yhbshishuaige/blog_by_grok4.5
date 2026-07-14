#!/usr/bin/env node
/**
 * Build posts/*.md → js/posts.data.js
 *
 * Writing flow:
 *   1. Create posts/my-title.md (with YAML frontmatter)
 *   2. Put images in img/  (reference as img/foo.jpg or ./img/foo.jpg)
 *   3. npm run build
 *   4. git commit && git push  → live site updates (CI also runs build)
 *
 * Markdown is rendered at build time with marked; the published site stays static.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");
const OUT_FILE = path.join(ROOT, "js", "posts.data.js");

function escapeJs(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Minimal YAML frontmatter: key: value (string / number / boolean) */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw.trim() };

  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (/^\d+(\.\d+)?$/.test(val)) meta[key] = Number(val);
    else if (val === "true") meta[key] = true;
    else if (val === "false") meta[key] = false;
    else meta[key] = val;
  }
  return { meta, body: m[2].trim() };
}

/** Normalize local image/link paths and reject executable URL schemes. */
function normalizeAssetUrl(url, { image = false } = {}) {
  const value = String(url || "").trim();
  if (!value) return image ? "" : "#";

  const compact = value.replace(/[\u0000-\u0020\u007f]+/g, "");
  const protocol = compact.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  const allowedProtocols = image
    ? new Set(["http", "https", "data"])
    : new Set(["http", "https", "mailto", "tel"]);

  if (protocol) return allowedProtocols.has(protocol) ? value : image ? "" : "#";
  if (value.startsWith("#") || value.startsWith("//")) return value;

  let u = value.replace(/^\.\//, "");
  // posts/xxx.md often uses ../img/foo.jpg
  u = u.replace(/^(\.\.\/)+/, "");
  if (u.startsWith("/")) u = u.slice(1);
  return u;
}

const markdown = new Marked({
  async: false,
  gfm: true,
  breaks: false,
  renderer: {
    // Article source is treated as Markdown, not trusted executable HTML.
    html({ text }) {
      return escapeHtml(text);
    },
    heading({ tokens, depth }) {
      // The article title is already h1; keep headings in the body semantic.
      const level = depth === 1 ? 2 : depth;
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    paragraph({ tokens }) {
      const figure = tokens.length === 1 && tokens[0].type === "image";
      return `<p${figure ? ' class="article-figure"' : ""}>${this.parser.parseInline(tokens)}</p>\n`;
    },
    link({ href, title, tokens }) {
      const url = normalizeAssetUrl(href);
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      const external = /^(?:https?:)?\/\//i.test(url);
      const externalAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeHtml(url)}"${titleAttr}${externalAttrs}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, title, text }) {
      const url = normalizeAssetUrl(href, { image: true });
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}"${titleAttr} loading="lazy" decoding="async" />`;
    },
  },
});

function markdownToHtml(md) {
  return markdown.parse(md).trim();
}

function estimateReadingMinutes(mdBody) {
  // rough CJK + Latin word count
  const cjk = (mdBody.match(/[\u4e00-\u9fff]/g) || []).join("").length;
  const latin = (mdBody.replace(/[\u4e00-\u9fff]/g, " ").match(/[a-zA-Z0-9]+/g) || [])
    .length;
  const words = cjk / 400 + latin / 200; // minutes-ish
  return Math.max(1, Math.ceil(words));
}

function excerptFromBody(mdBody, maxLen = 90) {
  const plain = mdBody
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1\s*$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function slugFromFilename(name) {
  return name.replace(/\.md$/i, "").toLowerCase().replace(/\s+/g, "-");
}

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();

  const posts = [];

  for (const file of files) {
    const full = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(full, "utf8");
    const { meta, body } = parseFrontmatter(raw);

    if (meta.draft === true) {
      console.log(`  skip draft: ${file}`);
      continue;
    }

    const slug = String(meta.slug || slugFromFilename(file));
    const title = String(meta.title || slug);
    const date = String(meta.date || new Date().toISOString().slice(0, 10));
    const tag = String(meta.tag || "随笔");
    const lead = meta.lead != null ? String(meta.lead) : "";
    const excerpt =
      meta.excerpt != null ? String(meta.excerpt) : excerptFromBody(body);
    const readingMinutes =
      meta.readingMinutes != null
        ? Number(meta.readingMinutes)
        : estimateReadingMinutes(body);

    const content = markdownToHtml(body);

    posts.push({
      slug,
      title,
      date,
      tag,
      readingMinutes,
      excerpt,
      lead,
      content,
      source: file,
    });
  }

  // newest first (date desc, then slug)
  posts.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug < b.slug ? -1 : 1;
  });

  return posts;
}

function writeOutput(posts) {
  const items = posts
    .map((p) => {
      return `  {
    slug: ${JSON.stringify(p.slug)},
    title: ${JSON.stringify(p.title)},
    date: ${JSON.stringify(p.date)},
    tag: ${JSON.stringify(p.tag)},
    readingMinutes: ${p.readingMinutes},
    excerpt: ${JSON.stringify(p.excerpt)},
    lead: ${JSON.stringify(p.lead)},
    content: \`${escapeJs(p.content)}\`,
  }`;
    })
    .join(",\n");

  const banner = `/**
 * AUTO-GENERATED by scripts/build-posts.mjs — do not edit by hand.
 * Source of truth: posts/*.md  |  images: img/
 * Run: npm run build
 */
`;

  const body = `${banner}export const posts = [
${items}
];
`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, body, "utf8");
}

function main() {
  console.log("Building posts from posts/*.md …");
  const posts = loadPosts();
  writeOutput(posts);
  console.log(`  → ${path.relative(ROOT, OUT_FILE)}  (${posts.length} post(s))`);
  for (const p of posts) {
    console.log(`     • ${p.slug}  ←  posts/${p.source}`);
  }
}

main();
