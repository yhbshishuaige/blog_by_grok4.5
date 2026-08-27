#!/usr/bin/env node
/**
 * Convert a public post to a private one.
 * Usage:
 *   npm run make-private -- <slug>          # posts/coc.md → private/coc.md
 *   npm run make-private -- posts/coc.md    # 也接受文件名
 *
 * What it does:
 *   1. Moves the markdown file into private/ (gitignored).
 *   2. Adds `private: true` and `grants: [guest-001]` to the frontmatter.
 *   3. Prints the remaining steps (encrypt + build + push).
 *
 * The slug (and therefore the old URL) is kept — the page simply starts
 * requiring a password after deployment.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");
const PRIVATE_DIR = path.join(ROOT, "private");

const arg = process.argv[2];
if (!arg) {
  console.error('用法: npm run make-private -- <slug>   （例如 npm run make-private -- coc）');
  process.exit(1);
}

const fileName = arg.endsWith(".md") ? path.basename(arg) : `${arg}.md`;
const src = path.join(POSTS_DIR, fileName);

if (!fs.existsSync(src)) {
  console.error(`✗ 找不到公开文章: posts/${fileName}`);
  console.error(`  现有文章: ${fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_")).map((f) => f.replace(/\.md$/, "")).join(", ")}`);
  process.exit(1);
}

const raw = fs.readFileSync(src, "utf8");
const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!fmMatch) {
  console.error(`✗ ${fileName} 没有 frontmatter，无法自动添加 private 标记。请手动编辑。`);
  process.exit(1);
}

// Insert missing frontmatter keys right after the opening `---`.
const additions = [];
if (!/^\s*private\s*:/m.test(fmMatch[1])) additions.push("private: true");
if (!/^\s*grants\s*:/m.test(fmMatch[1])) additions.push("grants: [guest-001]");

if (!additions.length && /^\s*private\s*:\s*true/m.test(fmMatch[1])) {
  console.error(`✗ ${fileName} 已经是私密文章（private: true 已在 frontmatter）。`);
  process.exit(1);
}

const insertAt = raw.indexOf("\n") + 1; // right after the first `---` line
const newRaw = raw.slice(0, insertAt) + additions.join("\n") + "\n" + raw.slice(insertAt);

fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.renameSync(src, path.join(PRIVATE_DIR, fileName));
fs.writeFileSync(path.join(PRIVATE_DIR, fileName), newRaw, "utf8");

console.log(`✓ 已转换: posts/${fileName} → private/${fileName}`);
console.log(`  frontmatter 新增: ${additions.join(", ")}`);
console.log(``);
console.log(`接下来（两步都要做，缺一不可）：`);
console.log(`  1. 如需调整授权，编辑 private/${fileName} 的 grants 行`);
console.log(`  2. 加密: npm run private        （正文加密进 js/private.data.js）`);
console.log(`  3. 构建: npm run build          （从公开数据移除这篇文章）`);
console.log(`  4. 发布: git add . && git commit && git push`);
console.log(``);
console.log(`旧链接 #/post/${fileName.replace(/\.md$/, "")} 部署后会变成锁屏（需要密码）。`);
