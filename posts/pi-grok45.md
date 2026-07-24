---
title: grok4.5调用pi工具的问题
date: 2026-07-24
tag: 随笔
slug: pi-grok45
excerpt:
lead:
---

默认情况下:grok4.5调用pi的read和write会返回错误, 被迫使用bash命令实现读写, 一次思考中反复出现这种情况, 看着心烦, 浪费时间, 还浪费token

## 现象

模型先调用read和write, 返回失败, 然后重新调用bash工具
~~~text
The read tool seems to be failing.
~~~
和
~~~text
The write tool is failing
~~~

## 自测

让不同模型只使用read读取一个文件的内容,不能使用bash

~~~text
只用一次 read 读 ./a.txt，禁止 bash，不要解释, 成功就成功, 失败就失败
~~~

| |模型| 结果|
|-|---|---|
||grok-4.5|失败|
||gpt-5.6-sol|成功|
||deepseek-v4-pro/flash|成功|

claude可能也有类似情况,没有测试

## 原因

grok的参数名称是file_path,但是pi的read和write使用的是path

![clip_20260724_150234_431](https://pub-ea6dd7d8982049e299e02d4aab71225c.r2.dev/blog/2026/07/clip-20260724-150234-431-b5fe2ad4af.png)

## 解决

在进入schema之前强制将file_path转化成path

~~~shell
cp tool-param-compat.ts \~/.pi/agent/extensions/
~~~

[details="tool-param-compat.ts"]
~~~ts
/**
 * Tool Param Compat — make pi's four built-in tools tolerant of Claude-Code style args.
 *
 * Background
 * ----------
 * pi schema:
 *   read  → path [, offset, limit]
 *   write → path, content
 *   edit  → path, edits: [{ oldText, newText }]
 *   bash  → command [, timeout]
 *
 * Some models (esp. Grok) emit Claude Code / Cursor style names instead:
 *   file_path          → path
 *   old_string/new_string → oldText/newText
 *   (occasionally) cmd → command
 *
 * Schema validation runs BEFORE execute(). Built-in runtime code already does
 * `args.file_path ?? args.path` for rendering, but never gets there if validation fails.
 *
 * This extension re-registers read/write/edit/bash with prepareArguments() that
 * normalizes aliases BEFORE validation, then delegates to the real built-in impl.
 *
 * Location: ~/.pi/agent/extensions/tool-param-compat.ts  (auto-loaded)
 * Reload:   /reload  or start a new pi session
 *
 * Smoke test (Grok):
 *   只用一次 read 读 /tmp/pi-tool-param-test.txt，禁止 bash，不要解释
 *   只用一次 write 把 hello 写入 /tmp/pi-tool-param-write-test.txt，禁止 bash，不要解释
 *   只用一次 edit 把 /tmp/pi-tool-param-write-test.txt 里的 hello 改成 world，禁止 bash，不要解释
 *   只用一次 bash 执行 echo ok，不要解释
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	createBashToolDefinition,
	createEditToolDefinition,
	createReadToolDefinition,
	createWriteToolDefinition,
} from "@earendil-works/pi-coding-agent";

type AnyArgs = Record<string, unknown>;

function isObject(value: unknown): value is AnyArgs {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Prefer existing `path`; otherwise promote common aliases. Drop aliases after. */
function normalizePathArg(args: unknown): unknown {
	if (!isObject(args)) return args;
	const next: AnyArgs = { ...args };

	if (typeof next.path !== "string") {
		const alias =
			(typeof next.file_path === "string" && next.file_path) ||
			(typeof next.filePath === "string" && next.filePath) ||
			(typeof next.filepath === "string" && next.filepath) ||
			(typeof next.filename === "string" && next.filename) ||
			(typeof next.file === "string" && next.file) ||
			null;
		if (alias) next.path = alias;
	}

	delete next.file_path;
	delete next.filePath;
	delete next.filepath;
	delete next.filename;
	delete next.file;
	return next;
}

/** Map Claude-style edit field names; keep only schema-safe keys. */
function normalizeEditArgs(args: unknown): unknown {
	const withPath = normalizePathArg(args);
	if (!isObject(withPath)) return withPath;
	const next: AnyArgs = { ...withPath };

	const mapPair = (obj: AnyArgs): AnyArgs => {
		const out: AnyArgs = { ...obj };
		if (typeof out.oldText !== "string") {
			if (typeof out.old_string === "string") out.oldText = out.old_string;
			else if (typeof out.old_str === "string") out.oldText = out.old_str;
			else if (typeof out.oldString === "string") out.oldText = out.oldString;
		}
		if (typeof out.newText !== "string") {
			if (typeof out.new_string === "string") out.newText = out.new_string;
			else if (typeof out.new_str === "string") out.newText = out.new_str;
			else if (typeof out.newString === "string") out.newText = out.newString;
		}
		// Keep only fields edit schema accepts inside each edit item
		const item: AnyArgs = {};
		if (typeof out.oldText === "string") item.oldText = out.oldText;
		if (typeof out.newText === "string") item.newText = out.newText;
		return item;
	};

	// Build a clean object (edit schema has additionalProperties: false)
	const clean: AnyArgs = {};
	if (typeof next.path === "string") clean.path = next.path;

	// Top-level single-edit Claude style → leave oldText/newText for built-in prepareArguments
	const topMapped = mapPair(next);
	if (typeof topMapped.oldText === "string") clean.oldText = topMapped.oldText;
	if (typeof topMapped.newText === "string") clean.newText = topMapped.newText;

	if (Array.isArray(next.edits)) {
		clean.edits = next.edits.map((e) => (isObject(e) ? mapPair(e) : e));
	} else if (typeof next.edits === "string") {
		try {
			const parsed = JSON.parse(next.edits);
			if (Array.isArray(parsed)) {
				clean.edits = parsed.map((e) => (isObject(e) ? mapPair(e) : e));
			}
		} catch {
			// leave unset; validation will surface a clear error
		}
	}

	return clean;
}

/** Bash is already fine for Grok (`command`), but accept a few aliases defensively. */
function normalizeBashArgs(args: unknown): unknown {
	if (!isObject(args)) return args;
	const next: AnyArgs = { ...args };

	if (typeof next.command !== "string") {
		const alias =
			(typeof next.cmd === "string" && next.cmd) ||
			(typeof next.shell === "string" && next.shell) ||
			(typeof next.script === "string" && next.script) ||
			(typeof next.bash === "string" && next.bash) ||
			null;
		if (alias) next.command = alias;
	}

	// timeout sometimes arrives as string
	if (typeof next.timeout === "string" && next.timeout.trim() !== "") {
		const n = Number(next.timeout);
		if (Number.isFinite(n)) next.timeout = n;
	}

	delete next.cmd;
	delete next.shell;
	delete next.script;
	delete next.bash;
	return next;
}

const PATH_GUIDELINE =
	"Built-in file tools use parameter name path (never file_path / filePath). edit uses edits[].oldText and edits[].newText (never old_string / new_string).";

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();

	const readBase = createReadToolDefinition(cwd);
	const writeBase = createWriteToolDefinition(cwd);
	const editBase = createEditToolDefinition(cwd);
	const bashBase = createBashToolDefinition(cwd);

	// ── read ────────────────────────────────────────────────────────────
	pi.registerTool({
		...readBase,
		label: "read",
		promptGuidelines: [...(readBase.promptGuidelines ?? []), PATH_GUIDELINE],
		prepareArguments(args) {
			return normalizePathArg(args);
		},
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return createReadToolDefinition(ctx.cwd).execute(toolCallId, params, signal, onUpdate, ctx);
		},
	});

	// ── write ───────────────────────────────────────────────────────────
	pi.registerTool({
		...writeBase,
		label: "write",
		promptGuidelines: [...(writeBase.promptGuidelines ?? []), PATH_GUIDELINE],
		prepareArguments(args) {
			return normalizePathArg(args);
		},
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return createWriteToolDefinition(ctx.cwd).execute(toolCallId, params, signal, onUpdate, ctx);
		},
	});

	// ── edit ────────────────────────────────────────────────────────────
	pi.registerTool({
		...editBase,
		label: "edit",
		promptGuidelines: [...(editBase.promptGuidelines ?? []), PATH_GUIDELINE],
		prepareArguments(args) {
			const normalized = normalizeEditArgs(args);
			// Built-in folds top-level oldText/newText into edits[]
			if (typeof editBase.prepareArguments === "function") {
				return editBase.prepareArguments(normalized);
			}
			return normalized;
		},
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return createEditToolDefinition(ctx.cwd).execute(toolCallId, params, signal, onUpdate, ctx);
		},
	});

	// ── bash ────────────────────────────────────────────────────────────
	// Grok already uses `command` correctly; still wrap for alias safety.
	pi.registerTool({
		...bashBase,
		label: "bash",
		promptGuidelines: [
			...(bashBase.promptGuidelines ?? []),
			"bash uses parameter name command (not cmd).",
		],
		prepareArguments(args) {
			return normalizeBashArgs(args);
		},
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return createBashToolDefinition(ctx.cwd).execute(toolCallId, params, signal, onUpdate, ctx);
		},
	});
}

~~~
[/details]
