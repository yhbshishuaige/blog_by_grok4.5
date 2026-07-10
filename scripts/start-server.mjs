import { createServer } from "node:net";
import { spawn } from "node:child_process";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3456);

function checkPort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen({ host, port }, () => {
      probe.close(resolve);
    });
  });
}

async function describeOwner() {
  return new Promise((resolve) => {
    const child = spawn("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", () => resolve(""));
    child.once("close", () => resolve(output.trim().split(/\s+/)[0] || ""));
  });
}

async function start() {
  try {
    await checkPort();
  } catch (error) {
    if (error?.code !== "EADDRINUSE") throw error;
    const pid = await describeOwner();
    console.error(`\n无法启动：${host}:${port} 已被占用。`);
    if (pid) console.error(`占用进程 PID：${pid}`);
    console.error(`\n解决方法：`);
    if (pid) console.error(`  kill ${pid}`);
    console.error(`  PORT=8080 npm start    # 或使用其他端口\n`);
    process.exitCode = 1;
    return;
  }

  console.log(`本地地址：http://${host}:${port}`);
  console.log("按 Ctrl + C 停止服务器。\n");

  const server = spawn(
    "python3",
    ["-m", "http.server", String(port), "--bind", host],
    { stdio: "inherit" }
  );

  const stop = (signal) => {
    if (!server.killed) server.kill(signal);
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
  server.once("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exitCode = code ?? 0;
  });
}

start().catch((error) => {
  console.error("启动服务器失败：", error?.message || error);
  process.exitCode = 1;
});
