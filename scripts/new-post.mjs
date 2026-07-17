#!/usr/bin/env node
/**
 * Scaffold a new Markdown post.
 * Usage:
 *   npm run new -- "文章标题"
 *   npm run new -- "文章标题" my-slug
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");

const title = process.argv[2];
if (!title) {
  console.error('用法: npm run new -- "文章标题" [可选-slug]');
  process.exit(1);
}

const slugArg = process.argv[3];
const date = new Date().toISOString().slice(0, 10);

function toSlug(raw) {
  const s = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  // URL 友好：含英数字则去掉中文；纯中文则用日期 slug
  if (/[a-z0-9]/.test(s)) {
    return s.replace(/[^\w-]/g, "").toLowerCase() || `post-${date}`;
  }
  return `post-${date}`;
}

let safeSlug = toSlug(slugArg || title);
const file = path.join(POSTS_DIR, `${safeSlug}.md`);

if (fs.existsSync(file)) {
  // 同日多篇：加序号
  let n = 2;
  while (fs.existsSync(path.join(POSTS_DIR, `${safeSlug}-${n}.md`))) n++;
  safeSlug = `${safeSlug}-${n}`;
}

const out = path.join(POSTS_DIR, `${safeSlug}.md`);
fs.mkdirSync(POSTS_DIR, { recursive: true });

const body = `---
title: ${title}
date: ${date}
tag: 随笔
slug: ${safeSlug}
excerpt:
lead:
---

在这里写正文。支持 Markdown。

## 小标题

段落文字，**加粗**，*斜体*，[链接](https://example.com)。

- 列表一项
- 列表二项

![说明文字](https://img.example.com/blog/your-image.jpg)

\`\`\`js
console.log("hello");
\`\`\`
`;

fs.writeFileSync(out, body, "utf8");
console.log(`已创建 posts/${safeSlug}.md`);
console.log(``);
console.log(`写作流程：`);
console.log(`  1. 编辑 posts/${safeSlug}.md`);
console.log(`  2. 上传图片: npm run images -- ~/Pictures/图片.jpg（会生成并复制 Markdown）`);
console.log(`  3. 本地预览: npm start`);
console.log(`  4. 发布: git add posts/ && git commit && git push`);
console.log(``);
console.log(`预览地址: http://127.0.0.1:3456/#/post/${safeSlug}`);
