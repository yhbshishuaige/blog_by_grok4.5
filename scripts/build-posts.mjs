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
 * Zero npm dependencies — pure Node.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/** Normalize image/link paths so site-root relative img/ works everywhere */
function normalizeAssetUrl(url) {
  if (!url || /^(https?:|data:|mailto:|#)/i.test(url)) return url;
  let u = url.replace(/^\.\//, "");
  // posts/xxx.md often uses ../img/foo.jpg
  u = u.replace(/^\.\.\//, "");
  if (u.startsWith("/")) u = u.slice(1);
  return u;
}

function inlineMarkdown(text) {
  let s = escapeHtml(text);
  // images first: ![alt](url)
  s = s.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, url) =>
      `<img src="${escapeHtml(normalizeAssetUrl(url))}" alt="${escapeHtml(alt)}" loading="lazy" />`
  );
  // links: [text](url)
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, url) =>
      `<a href="${escapeHtml(normalizeAssetUrl(url))}"${/^https?:/i.test(url) ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`
  );
  // bold ** ** / __ __
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // italic * * / _ _
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/(^|[^a-zA-Z0-9_])_([^_]+)_/g, "$1<em>$2</em>");
  // inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

/**
 * Small Markdown → HTML subset:
 * headings, paragraphs, lists, blockquotes, fenced code, hr, images, links, emphasis
 */
function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  let inCode = false;
  let codeLang = "";
  let codeBuf = [];
  let listType = null; // "ul" | "ol"
  let listItems = [];
  let quoteBuf = [];

  const flushList = () => {
    if (!listType) return;
    const tag = listType;
    const items = listItems.map((t) => `<li>${inlineMarkdown(t)}</li>`).join("");
    html.push(`<${tag}>${items}</${tag}>`);
    listType = null;
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteBuf.length) return;
    const inner = quoteBuf.map((t) => inlineMarkdown(t)).join("<br />");
    html.push(`<blockquote>${inner}</blockquote>`);
    quoteBuf = [];
  };

  const flushPara = (buf) => {
    if (!buf.length) return;
    html.push(`<p>${inlineMarkdown(buf.join(" "))}</p>`);
    buf.length = 0;
  };

  let para = [];

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (line.startsWith("```")) {
      flushList();
      flushQuote();
      flushPara(para);
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuf = [];
      } else {
        html.push(
          `<pre><code${codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ""}>${escapeHtml(codeBuf.join("\n"))}</code></pre>`
        );
        inCode = false;
        codeLang = "";
        codeBuf = [];
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    // hr
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushList();
      flushQuote();
      flushPara(para);
      html.push("<hr />");
      i++;
      continue;
    }

    // headings
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      flushList();
      flushQuote();
      flushPara(para);
      const level = Math.min(hm[1].length, 3); // style supports h1–h3 in body as h2/h3; map h1→h2
      const tag = level === 1 ? 2 : level;
      html.push(`<h${tag}>${inlineMarkdown(hm[2].trim())}</h${tag}>`);
      i++;
      continue;
    }

    // blockquote
    if (line.startsWith(">")) {
      flushList();
      flushPara(para);
      quoteBuf.push(line.replace(/^>\s?/, ""));
      i++;
      // continue collecting
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteBuf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      flushQuote();
      continue;
    }

    // lists
    const ul = line.match(/^[-*+]\s+(.+)$/);
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ul || ol) {
      flushQuote();
      flushPara(para);
      const type = ul ? "ul" : "ol";
      const text = (ul || ol)[1];
      if (listType && listType !== type) flushList();
      listType = type;
      listItems.push(text);
      i++;
      continue;
    }

    // blank line
    if (!line.trim()) {
      flushList();
      flushQuote();
      flushPara(para);
      i++;
      continue;
    }

    // standalone image line → figure-friendly paragraph
    if (/^!\[/.test(line.trim()) && !para.length) {
      flushList();
      flushQuote();
      html.push(`<p class="article-figure">${inlineMarkdown(line.trim())}</p>`);
      i++;
      continue;
    }

    // paragraph text
    flushList();
    flushQuote();
    para.push(line.trim());
    i++;
  }

  flushList();
  flushQuote();
  flushPara(para);
  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }

  return html.join("\n");
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
    .replace(/```[\s\S]*?```/g, "")
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
