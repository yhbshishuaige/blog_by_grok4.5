#!/usr/bin/env node
/**
 * Encrypt private articles → js/private.data.js (envelope encryption).
 *
 * Sources live in private/ (gitignored — never push):
 *   private/xxx.md        plaintext markdown, frontmatter: private: true, grants: [guest-001]
 *   private/grants.json   { "admin": {"password": "…"}, "guest-001": {"password": "…"} }
 *
 * What lands in the repo is ONLY the encrypted body + wrapped data keys plus
 * plaintext display meta (title/excerpt/tags/date). No passwords, no body text.
 * Anyone can download it; the article body stays unreadable without a password.
 *
 * Re-run this script after adding/removing articles or grants, then push:
 * old visitor passwords stop working as soon as their wrapped key is gone.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  parseFrontmatter,
  markdownToHtml,
  articleStats,
  parseTags,
  slugFromFilename,
  excerptFromBody,
} from "./build-posts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PRIVATE_DIR = path.join(ROOT, "private");
const GRANTS_FILE = path.join(PRIVATE_DIR, "grants.json");
const OUT_FILE = path.join(ROOT, "js", "private.data.js");

const ITERATIONS = 600_000; // PBKDF2-SHA256 cost (browser decrypt ≈ 0.3 s)
const SALT = crypto.randomBytes(16); // fresh per run; every DEK is re-wrapped anyway

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exitCode = 1;
}

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, ITERATIONS, 32, "sha256");
}

/** AES-256-GCM; returns iv + combined ciphertext||authTag (WebCrypto format). */
function encryptWith(key, iv, plain) {
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString("base64"), data: data.toString("base64") };
}

function loadGrants() {
  if (!fs.existsSync(GRANTS_FILE)) {
    fail(
      `缺少 ${path.relative(ROOT, GRANTS_FILE)}\n` +
        "创建 private/grants.json，例如：\n" +
        '{\n  "admin": { "password": "你的管理员密码" },\n  "guest-001": { "password": "访客临时密码", "note": "给谁/哪篇文章" }\n}'
    );
    return null;
  }
  let grants;
  try {
    grants = JSON.parse(fs.readFileSync(GRANTS_FILE, "utf8"));
  } catch (error) {
    fail(`grants.json 解析失败：${error?.message}`);
    return null;
  }
  if (!grants.admin?.password) {
    fail("grants.json 缺少 admin.password（管理员密码）");
    return null;
  }
  return grants;
}

function loadArticles() {
  if (!fs.existsSync(PRIVATE_DIR)) fs.mkdirSync(PRIVATE_DIR, { recursive: true });
  return fs
    .readdirSync(PRIVATE_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();
}

/** Frontmatter grants may be an array, "[a, b]", "a, b" or "a b". */
function parseGrantList(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value == null) return [];
  return String(value)
    .replace(/^\[|\]$/g, "")
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function encryptArticle(file, grants) {
  const raw = fs.readFileSync(path.join(PRIVATE_DIR, file), "utf8");
  const { meta, body } = parseFrontmatter(raw);

  if (meta.private !== true) {
    console.warn(`  ! 跳过 ${file}：frontmatter 缺少 private: true`);
    return null;
  }

  const grantIds = ["admin", ...parseGrantList(meta.grants)];
  const knownGrants = [...new Set(grantIds)]
    .map((id) => String(id).trim())
    .filter(Boolean)
    .filter((id) => grants[id]?.password);

  if (knownGrants.length === 0) {
    console.warn(`  ! 跳过 ${file}：grants 未定义任何有效授权（检查 grants.json 与 frontmatter）`);
    return null;
  }

  const slug = String(meta.slug || slugFromFilename(file));
  const date = String(meta.date || new Date().toISOString().slice(0, 10));
  const title = String(meta.title || slug);
  const tags = parseTags(meta.tags ?? meta.tag);
  const lead = meta.lead != null ? String(meta.lead) : "";
  const excerpt =
    meta.excerpt != null ? String(meta.excerpt) : excerptFromBody(body);
  const stats = articleStats(body);
  const { content, toc, codeBlockCount } = markdownToHtml(body);

  // Plaintext display meta — visitors may see title/excerpt/tags on cards;
  // only the body (content/toc/code stats) is encrypted.
  const metaOut = {
    slug,
    title,
    tags,
    date,
    excerpt,
    lead,
    wordCount: stats.wordCount,
    readingMinutes: stats.readingMinutes,
  };

  const payload = JSON.stringify({ content, toc, codeBlockCount });

  // Envelope: random data key encrypts the payload; the DEK is wrapped once
  // per grant (admin always, plus each visitor grant allowed by frontmatter).
  const dek = crypto.randomBytes(32);
  const cipher = encryptWith(dek, crypto.randomBytes(12), Buffer.from(payload, "utf8"));
  const keys = knownGrants.map((grant) => {
    const key = deriveKey(grants[grant].password, SALT);
    return { grant, ...encryptWith(key, crypto.randomBytes(12), dek) };
  });

  return { ...metaOut, keys, cipher };
}

function writeOutput(posts) {
  const banner = `/**
 * AUTO-GENERATED by scripts/private-encrypt.mjs — do not edit by hand.
 * Source of truth: private/*.md + private/grants.json (both gitignored).
 * This file is PUBLIC ciphertext: no plaintext and no passwords live here.
 * Run: npm run private
 */
`;

  const items = posts
    .map((p) => {
      return `  {
    slug: ${JSON.stringify(p.slug)},
    title: ${JSON.stringify(p.title)},
    tags: ${JSON.stringify(p.tags)},
    date: ${JSON.stringify(p.date)},
    excerpt: ${JSON.stringify(p.excerpt)},
    lead: ${JSON.stringify(p.lead)},
    wordCount: ${p.wordCount},
    readingMinutes: ${p.readingMinutes},
    keys: ${JSON.stringify(p.keys)},
    cipher: ${JSON.stringify(p.cipher)},
  }`;
    })
    .join(",\n");

  const body = `${banner}export const privateConfig = ${JSON.stringify(
    { salt: SALT.toString("base64"), iterations: ITERATIONS },
    null,
    2
  )};\n\nexport const privatePosts = [\n${items}\n];\n`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, body, "utf8");
}

function main() {
  console.log("Encrypting private articles → js/private.data.js …");
  const grants = loadGrants();
  if (!grants) return;

  const files = loadArticles();
  if (!files.length) {
    console.log("  private/ 目录为空，写入空数据（无私密文章）");
    writeOutput([]);
    console.log(`  → ${path.relative(ROOT, OUT_FILE)}  (0 post(s))`);
    return;
  }

  const posts = files
    .map((file) => encryptArticle(file, grants))
    .filter(Boolean);

  writeOutput(posts);
  console.log(`  → ${path.relative(ROOT, OUT_FILE)}  (${posts.length} post(s))`);

  for (const p of posts) {
    const grants = p.keys.map((k) => k.grant).join(", ");
    console.log(`     • ${p.slug}  [${grants}]  →  #/post/${p.slug}`);
  }
  console.log("\n记得 git push 部署；访客密码的新增 / 删除在部署后立即生效。");
}

main();
