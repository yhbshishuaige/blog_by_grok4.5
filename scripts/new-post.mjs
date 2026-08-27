#!/usr/bin/env node
/**
 * Scaffold a new Markdown post.
 * Usage:
 *   npm run new -- "文章标题"            # 公开文章（posts/）
 *   npm run new -- "文章标题" my-slug    # 公开文章 + 指定 slug
 *   npm run new:private -- "标题"        # 私密文章（private/，随机 slug）
 *   npm run new:private -- "标题" my-slug # 私密文章 + 指定 slug
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const isPrivate = args.includes("--private");
const positional = args.filter((arg) => arg !== "--private");

const title = positional[0];
if (!title) {
  console.error("用法: npm run new -- \"文章标题\" [可选-slug]");
  console.error("      npm run new:private -- \"文章标题\" [可选-slug]");
  process.exit(1);
}

const slugArg = positional[1];
const date = new Date().toISOString().slice(0, 10);

const DIR = path.join(ROOT, isPrivate ? "private" : "posts");

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

/** 私密文章 slug 默认随机，避免被猜到文章存在。 */
let safeSlug;
if (isPrivate) {
  safeSlug = slugArg
    ? (slugArg.startsWith("p-") ? slugArg : `p-${slugArg}`)
    : `p-${crypto.randomBytes(5).toString("hex")}`;
} else {
  safeSlug = toSlug(slugArg || title);
}

let file = path.join(DIR, `${safeSlug}.md`);
if (fs.existsSync(file)) {
  // 同日多篇：加序号
  let n = 2;
  while (fs.existsSync(path.join(DIR, `${safeSlug}-${n}.md`))) n += 1;
  safeSlug = `${safeSlug}-${n}`;
  file = path.join(DIR, `${safeSlug}.md`);
}

fs.mkdirSync(DIR, { recursive: true });

const body = isPrivate
  ? `---
title: ${title}
date: ${date}
tag: 私密
private: true
grants: [guest-001]
slug: ${safeSlug}
lead:
---

在这里写正文。这篇文章不会出现在首页列表，只能用链接 + 密码打开。

## 小标题

段落文字，**加粗**，*斜体*，[链接](https://example.com)。

- 列表一项
- 列表二项
`
  : `---
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

const out = path.join(DIR, `${safeSlug}.md`);
fs.writeFileSync(out, body, "utf8");

if (isPrivate) {
  console.log(`已创建 private/${safeSlug}.md（私密）`);
  console.log(``);
  console.log(`写作流程：`);
  console.log(`  1. 编辑 private/${safeSlug}.md`);
  console.log(`  2. 在 private/grants.json 配置密码（admin=管理员，guest-xxx=访客）`);
  console.log(`  3. 加密: npm run private  （生成 js/private.data.js）`);
  console.log(`  4. 发布: git add js/private.data.js && git commit && git push`);
  console.log(``);
  console.log(`分享链接: http://127.0.0.1:3456/#/post/${safeSlug}`);
  console.log(``);
  console.log(`注意：private/ 目录已被 Git 忽略，明文不会提交；密码丢失前请保管好 grants.json。`);
} else {
  console.log(`已创建 posts/${safeSlug}.md`);
  console.log(``);
  console.log(`写作流程：`);
  console.log(`  1. 编辑 posts/${safeSlug}.md`);
  console.log(`  2. 上传图片: npm run images -- ~/Pictures/图片.jpg（会生成并复制 Markdown）`);
  console.log(`  3. 本地预览: npm start`);
  console.log(`  4. 发布: git add posts/ && git commit && git push`);
  console.log(``);
  console.log(`预览地址: http://127.0.0.1:3456/#/post/${safeSlug}`);
}
