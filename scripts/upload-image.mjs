#!/usr/bin/env node
/**
 * Upload images to Cloudflare R2 and print ready-to-paste Markdown.
 *
 * Usage:
 *   npm run images -- ~/Pictures/photo.jpg
 *   npm run images -- ~/Pictures/a.png ~/Pictures/b.webp
 *   npm run images -- --dry-run img/a.jpg
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.r2");
// npm runs scripts from the package root. INIT_CWD preserves the directory
// where the user actually entered `npm run`, so relative image paths stay intuitive.
const INPUT_DIR = path.resolve(process.env.INIT_CWD || process.cwd());

const MIME_TYPES = new Map([
  [".avif", "image/avif"],
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function usage() {
  console.log(`上传图片到 Cloudflare R2，并生成可直接粘贴的 Markdown。

用法:
  npm run images -- <图片或目录> [更多图片...]

注意: images 后面的双横线 -- 不能省略；相对路径按执行命令时所在目录计算。

选项:
  --alt <文字>  单张图片的说明文字（默认使用文件名）
  --dry-run     不连接 R2，只预览对象名与 Markdown
  --no-copy     不尝试复制 Markdown 到系统剪贴板
  -h, --help    显示帮助

首次使用:
  1. cp .env.r2.example .env.r2
  2. 在 .env.r2 填入 R2 API 凭据、bucket 和公开域名
  3. npm run images -- ~/Pictures/photo.jpg

传入目录时会上传该目录第一层的所有受支持图片。`);
}

function parseArgs(argv) {
  const options = { alt: "", copy: true, dryRun: false, inputs: [] };
  let positionalOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (positionalOnly) {
      options.inputs.push(arg);
    } else if (arg === "--") {
      positionalOnly = true;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--no-copy") {
      options.copy = false;
    } else if (arg === "--alt") {
      options.alt = argv[index + 1] || "";
      index += 1;
      if (!options.alt) throw new Error("--alt 后需要填写说明文字");
    } else if (arg.startsWith("-")) {
      throw new Error(`未知选项: ${arg}`);
    } else {
      options.inputs.push(arg);
    }
  }
  return options;
}

function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const values = {};

  for (const sourceLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

function loadConfig({ dryRun }) {
  const env = { ...parseEnvFile(ENV_FILE), ...process.env };
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
  ];
  const missing = required.filter((key) => !env[key]);

  if (missing.length && !dryRun) {
    throw new Error(
      `.env.r2 缺少 ${missing.join(", ")}。请先执行 cp .env.r2.example .env.r2 并填写配置`,
    );
  }

  if (!dryRun) {
    if (!/^[a-f\d]{32}$/i.test(env.R2_ACCESS_KEY_ID)) {
      throw new Error(
        "R2_ACCESS_KEY_ID 格式不正确：应粘贴创建 R2 API 令牌后显示的 32 位 Access Key ID",
      );
    }
    if (!/^[a-f\d]{64}$/i.test(env.R2_SECRET_ACCESS_KEY)) {
      throw new Error(
        `R2_SECRET_ACCESS_KEY 格式不正确：当前为 ${env.R2_SECRET_ACCESS_KEY.length} 位，应粘贴完整的 64 位 Secret Access Key（不是令牌值）`,
      );
    }
  }

  const publicUrl = env.R2_PUBLIC_URL || "https://img.example.com";
  let parsedPublicUrl;
  try {
    parsedPublicUrl = new URL(publicUrl);
  } catch {
    throw new Error(`R2_PUBLIC_URL 不是有效网址: ${publicUrl}`);
  }
  if (!new Set(["http:", "https:"]).has(parsedPublicUrl.protocol)) {
    throw new Error("R2_PUBLIC_URL 必须使用 http:// 或 https://");
  }

  return {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
    endpoint:
      env.R2_ENDPOINT ||
      (env.R2_ACCOUNT_ID
        ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : "https://example.r2.cloudflarestorage.com"),
    prefix: cleanPrefix(env.R2_PREFIX || "blog"),
    publicUrl: publicUrl.replace(/\/+$/, ""),
  };
}

function cleanPrefix(value) {
  return String(value)
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function imageType(file) {
  return MIME_TYPES.get(path.extname(file).toLowerCase());
}

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const file = path.resolve(INPUT_DIR, input);
    if (!fs.existsSync(file)) throw new Error(`找不到文件或目录: ${input}`);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(file, { withFileTypes: true })) {
        const child = path.join(file, entry.name);
        if (entry.isFile() && imageType(child)) files.push(child);
      }
    } else if (stat.isFile()) {
      if (!imageType(file)) throw new Error(`不支持的图片格式: ${input}`);
      files.push(file);
    } else {
      throw new Error(`不是普通文件: ${input}`);
    }
  }
  return [...new Set(files)].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function safeBaseName(file) {
  const ascii = path
    .basename(file, path.extname(file))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || "image";
}

function imageRecord(file, config, customAlt = "") {
  const body = fs.readFileSync(file);
  const hash = crypto.createHash("sha256").update(body).digest("hex").slice(0, 10);
  const extension = path.extname(file).toLowerCase().replace(".jpeg", ".jpg");
  const now = new Date();
  const dateParts = [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0")];
  const fileName = `${safeBaseName(file)}-${hash}${extension}`;
  const key = [...(config.prefix ? [config.prefix] : []), ...dateParts, fileName].join("/");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = `${config.publicUrl}/${encodedKey}`;
  const alt = customAlt || path.basename(file, path.extname(file));
  const escapedAlt = alt.replace(/([\\[\]])/g, "\\$1");
  return {
    alt,
    body,
    contentType: imageType(file),
    file,
    key,
    markdown: `![${escapedAlt}](${url})`,
    url,
  };
}

function copyToClipboard(value) {
  const candidates = process.platform === "darwin"
    ? [["pbcopy", []]]
    : process.platform === "win32"
      ? [["clip", []]]
      : process.env.WSL_DISTRO_NAME
        ? [["clip.exe", []], ["wl-copy", []], ["xclip", ["-selection", "clipboard"]]]
        : [["wl-copy", []], ["xclip", ["-selection", "clipboard"]], ["xsel", ["--clipboard", "--input"]]];

  for (const [command, args] of candidates) {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      input: value,
      stdio: ["pipe", "ignore", "ignore"],
    });
    if (!result.error && result.status === 0) return true;
  }
  return false;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  if (!options.inputs.length) {
    usage();
    process.exitCode = 1;
    return;
  }

  const files = collectFiles(options.inputs);
  if (!files.length) throw new Error("目录中没有找到受支持的图片");
  if (options.alt && files.length !== 1) throw new Error("--alt 只能用于单张图片");

  const config = loadConfig(options);
  const records = files.map((file) => imageRecord(file, config, options.alt));

  if (!options.dryRun) {
    const client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      region: "auto",
    });

    for (const record of records) {
      process.stdout.write(`上传 ${path.basename(record.file)} ... `);
      await client.send(new PutObjectCommand({
        Body: record.body,
        Bucket: config.bucket,
        CacheControl: "public, max-age=31536000, immutable",
        ContentType: record.contentType,
        Key: record.key,
      }));
      console.log("完成");
    }
  } else {
    console.log("预览模式：未连接 R2，也没有上传文件。\n");
  }

  const urls = records.map((record) => record.url).join("\n");
  const markdown = records.map((record) => record.markdown).join("\n");
  console.log(`\n图片直链：\n${urls}`);
  console.log(`\nMarkdown（复制后直接粘贴进文章）：\n${markdown}`);

  if (options.copy) {
    console.log(copyToClipboard(markdown)
      ? "\nMarkdown 已复制到剪贴板。"
      : "\n未找到可用的剪贴板命令，请手动复制上面的 Markdown。");
  }
}

main().catch((error) => {
  console.error(`上传失败：${error.message}`);
  process.exitCode = 1;
});
