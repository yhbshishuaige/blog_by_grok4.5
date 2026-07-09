#!/usr/bin/env node
/**
 * Watch posts/ and rebuild js/posts.data.js on change.
 * Usage: npm run watch
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "posts");
const BUILD = path.join(ROOT, "scripts", "build-posts.mjs");

let timer = null;
let building = false;
let pending = false;

function build() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const child = spawn(process.execPath, [BUILD], {
    cwd: ROOT,
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    building = false;
    if (pending) {
      pending = false;
      build();
    } else if (code !== 0) {
      console.error(`[watch] build failed (exit ${code})`);
    }
  });
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(build, 120);
}

if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
}

console.log(`Watching ${path.relative(ROOT, POSTS_DIR)}/ …  Ctrl+C to stop`);
build();

fs.watch(POSTS_DIR, { recursive: true }, (event, filename) => {
  if (filename && !filename.endsWith(".md") && !filename.endsWith(".MD")) return;
  console.log(`[watch] ${event} ${filename || "posts"}`);
  schedule();
});
