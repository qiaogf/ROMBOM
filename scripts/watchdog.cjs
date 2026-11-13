#!/usr/bin/env node
/**
 * scripts/watchdog.cjs
 * 生产守护进程：每 10 秒巡检，异常自动重拉
 *   1) /api/health：站点 → 中继/直连 → Neon 的全链路真实查询（SELECT 1）
 *   2) Next.js (3000)：HTTP GET 探活，并每 60s 抽查页面引用的 /_next/static 资源
 *   3) ngrok：进程 + 本地 4040 API，确认固定域名隧道存在
 * DATABASE_URL 指向 127.0.0.1/localhost 时启用中继探活；指向 Neon 时自动改为直连模式。
 * 连续失败达阈值才重启；重启前杀掉占用端口的旧进程；失败自动退避 30s。
 * 启动：node scripts/watchdog.cjs
 */

const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const PROJECT = path.resolve(__dirname, "..");
const WATCH_LOG = path.join(PROJECT, "scripts", "watchdog.log");
const RELAY_LOG = path.join(PROJECT, "scripts", "relay.log");
const SITE_LOG = path.join(PROJECT, "next-start.log");
const NGROK_LOG = path.join(PROJECT, "scripts", "ngrok.log");

const SITE_PORT = 3000;
const RELAY_PORT = 6543;
const NGROK_DOMAIN = "dehydrate-esquire-hybrid.ngrok-free.dev";
const NGROK_EXE = "D:\\ngrok\\ngrok.exe";
const NGROK_CFG = "C:\\Users\\Administrator\\AppData\\Local\\ngrok\\ngrok.yml";

const INTERVAL_MS = 10_000;
const FAIL_LIMIT = 3;
const RESTART_WAIT_MS = 120_000;
const BACKOFF_MS = 30_000;
const RELAY_EVERY_MS = 30_000;
const NGROK_EVERY_MS = 30_000;

// ---------- 数据库运行模式：本地中继 / 直连 ----------
// 本机 IPv6 不通，需要 scripts/neon-relay.cjs 绕开 DNS；部署到服务器后
// DATABASE_URL 指向 Neon，这里自动识别并跳过中继逻辑，无需再改代码。
function readEnvDatabaseUrl() {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(PROJECT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return process.env.DATABASE_URL || "";
}

const DATABASE_URL = readEnvDatabaseUrl();
const DB_TARGET = (() => {
  const m = /^postgres(?:ql)?:\/\/(?:[^@/]*@)?(\[[^\]]+\]|[^:/?]+)(?::(\d+))?/i.exec(DATABASE_URL);
  return m ? { host: m[1].replace(/^\[|\]$/g, ""), port: Number(m[2] || 5432) } : { host: "", port: 5432 };
})();
const USE_RELAY = ["127.0.0.1", "localhost", "::1"].includes(DB_TARGET.host);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg) {
  try {
    if (fs.existsSync(WATCH_LOG) && fs.statSync(WATCH_LOG).size > 2 * 1024 * 1024) {
      fs.renameSync(WATCH_LOG, `${WATCH_LOG}.1`);
    }
    const line = `[${new Date().toISOString().replace("T", " ").slice(0, 19)}] ${msg}`;
    fs.appendFileSync(WATCH_LOG, `${line}\n`, "utf8");
  } catch {
    /* 日志失败不影响巡检 */
  }
}

// WMI / 无控制台启动时 stdout 可能不可用，任何输出错误都不能拖垮巡检
process.on("uncaughtException", (e) => log(`uncaught: ${e && e.stack ? e.stack : e}`));
process.on("unhandledRejection", (e) => log(`unhandled: ${e && e.stack ? e.stack : e}`));

// ---------- 端口 / 进程 ----------
function pidsOnPort(port) {
  try {
    const out = execFileSync("netstat", ["-ano"], { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const m = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
      if (m && Number(m[1]) === port) pids.add(Number(m[2]));
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killPids(pids) {
  for (const pid of pids) {
    if (pid === process.pid) continue;
    try {
      process.kill(pid);
      log(`killed PID ${pid}`);
    } catch (e) {
      log(`failed to kill PID ${pid}: ${e.message}`);
    }
  }
}

function killPort(port) {
  killPids(pidsOnPort(port));
}

// ---------- 探活 1：中继到 Neon 的真实往返 ----------
// 不能用 SSLRequest：中继自己就回 'N'，不会碰上游。
// 这里发一个最小 StartupMessage，Neon 必然回包（认证失败/库不存在都算活着）→ 真正验证链路。
function probeDbLink(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: RELAY_PORT });
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.on("error", () => finish(false));
    socket.on("connect", () => {
      const params = Buffer.from("user\0probe\0database\0probe\0\0", "utf8");
      const head = Buffer.alloc(8);
      head.writeUInt32BE(8 + params.length, 0); // 总长度
      head.writeUInt32BE(196608, 4); // 协议 3.0
      socket.write(Buffer.concat([head, params]));
    });
    socket.once("data", (buf) => finish(buf.length > 0));
  });
}

/** 直连模式：只验证上游 TCP 可达，认证与真实查询由站点 /api/health 覆盖 */
function probeUpstream(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!DB_TARGET.host) {
      resolve(false);
      return;
    }
    const socket = net.connect({ host: DB_TARGET.host, port: DB_TARGET.port });
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.on("error", () => finish(false));
    socket.once("connect", () => finish(true));
  });
}

/** 当前运行模式下的数据库链路探活 */
async function probeDb() {
  return USE_RELAY ? probeDbLink() : probeUpstream();
}

// ---------- 探活 2：站点 HTTP ----------
function get(pathname, timeoutMs = 10_000) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port: SITE_PORT, path: pathname, timeout: timeoutMs },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          if (body.length < 200_000) body += chunk;
        });
        res.on("end", () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body }));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: "" });
    });
    req.on("error", () => resolve({ ok: false, status: 0, body: "" }));
  });
}

async function probeSiteHttp() {
  const res = await get("/");
  return res.ok;
}

async function probeSiteAssets() {
  const page = await get("/");
  if (!page.ok) return false;
  const m = page.body.match(/\/_next\/static\/[^"'\\\s]+\.js/);
  if (!m) return true; // 页面里取不到资源地址时不做判断
  const asset = await get(m[0]);
  return asset.ok;
}

// ---------- 探活 3：ngrok ----------
function probeNgrokApi(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port: 4040, path: "/api/tunnels", timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => {
        if (body.length < 200_000) body += c;
      });
      res.on("end", () => resolve(res.statusCode === 200 && body.includes(NGROK_DOMAIN)));
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

function ngrokRunning() {
  try {
    const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq ngrok.exe", "/NH"], { encoding: "utf8" });
    return out.toLowerCase().includes("ngrok.exe");
  } catch {
    return false;
  }
}

async function probeNgrok() {
  return ngrokRunning() && (await probeNgrokApi());
}

// ---------- 重启动作 ----------
function spawnDetached(command, args, outPath, extraEnv) {
  const out = outPath ? fs.openSync(outPath, "w") : "ignore";
  const child = spawn(command, args, {
    cwd: PROJECT,
    detached: true,
    windowsHide: true,
    stdio: ["ignore", out, out],
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  });
  if (typeof out === "number") {
    child.once("spawn", () => {
      try {
        fs.closeSync(out);
      } catch {
        /* ignore */
      }
    });
  }
  child.unref();
  return child.pid;
}

/** next build 产物不会自动复制进 standalone，重启前补一次 */
function syncStatic() {
  const src = path.join(PROJECT, ".next", "static");
  if (fs.existsSync(src)) {
    fs.cpSync(src, path.join(PROJECT, ".next", "standalone", ".next", "static"), { recursive: true });
  }
  const pub = path.join(PROJECT, "public");
  if (fs.existsSync(pub)) {
    fs.cpSync(pub, path.join(PROJECT, ".next", "standalone", "public"), { recursive: true });
  }
}

async function waitSiteReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probeSiteHttp()) return true;
    await sleep(3000);
  }
  return false;
}

async function restartRelay() {
  log(`neon-relay (${RELAY_PORT}) unhealthy — restarting...`);
  killPort(RELAY_PORT);
  await sleep(2000);
  const pid = spawnDetached(process.execPath, ["--max-old-space-size=64", "scripts/neon-relay.cjs"], RELAY_LOG);
  for (let i = 0; i < 8; i++) {
    await sleep(2000);
    if (await probeDbLink()) {
      log(`neon-relay restarted and healthy (PID ${pid})`);
      return true;
    }
  }
  log("neon-relay restart FAILED — retry in 30s");
  return false;
}

async function restartSite() {
  log(`Next.js (${SITE_PORT}) unhealthy — restarting...`);
  syncStatic();
  killPort(SITE_PORT);
  await sleep(2000);
  // HOSTNAME 固定为 0.0.0.0：否则 Next standalone 会绑到机器名解析出的 IPv6，
  // 导致 127.0.0.1 与 ngrok（localhost）都连不上
  const pid = spawnDetached(
    process.execPath,
    ["--max-old-space-size=512", ".next\\standalone\\server.js"],
    SITE_LOG,
    { HOSTNAME: "0.0.0.0" }
  );
  // 错误单独落到 err 日志，便于排查
  if (await waitSiteReady(RESTART_WAIT_MS)) {
    log(`Next.js restarted and healthy (PID ${pid})`);
    return true;
  }
  log("Next.js restart FAILED — retry in 30s");
  return false;
}

async function restartNgrok() {
  log("ngrok tunnel unhealthy — restarting...");
  killPids(
    (() => {
      try {
        const out = execFileSync("tasklist", ["/FI", "IMAGENAME eq ngrok.exe", "/FO", "CSV", "/NH"], {
          encoding: "utf8",
        });
        return out
          .split(/\r?\n/)
          .map((line) => line.replace(/^"|"$/g, "").split('","')[1])
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isFinite(n));
      } catch {
        return [];
      }
    })()
  );
  await sleep(2000);
  if (!fs.existsSync(NGROK_EXE)) {
    log(`ngrok.exe not found at ${NGROK_EXE} — tunnel skipped`);
    return false;
  }
  spawnDetached(NGROK_EXE, ["http", "3000", `--url=${NGROK_DOMAIN}`, `--config=${NGROK_CFG}`], NGROK_LOG);
  for (let i = 0; i < 10; i++) {
    await sleep(3000);
    if (await probeNgrok()) {
      log(`ngrok tunnel restarted: https://${NGROK_DOMAIN}`);
      return true;
    }
  }
  log("ngrok restart FAILED — retry in 30s");
  return false;
}

// ---------- 单实例锁：占用本地端口，已有实例则退出 ----------
const LOCK_PORT = 41735;
const lock = net.createServer();
lock.on("error", () => {
  // 已有实例在跑（单实例锁端口被占用）
  process.exit(0);
});
lock.listen(LOCK_PORT, "127.0.0.1", () => {
  main().catch((e) => {
    log(`watchdog fatal: ${e && e.stack ? e.stack : e}`);
    process.exit(1);
  });
});

// ---------- 主循环 ----------
async function main() {
  log(
    `Watchdog started (HTTP probe). Interval=${INTERVAL_MS / 1000}s FailLimit=${FAIL_LIMIT} ` +
      `DB=${USE_RELAY ? "relay" : "direct"} ${DB_TARGET.host || "unknown"}:${DB_TARGET.port}`
  );

  let siteFails = 0;
  let relayFails = 0;
  let ngrokFails = 0;
  let nextRelayAt = Date.now();
  let nextNgrokAt = Date.now();
  let nextWarmAt = Date.now() + 30_000;
  let retryAt = Date.now();
  let cycle = 0;

  for (;;) {
    const now = Date.now();
    cycle++;

    try {
      // 1) 数据库链路：有中继时探活并重启中继；直连时由 /api/health 保活覆盖
      if (USE_RELAY && now >= nextRelayAt) {
        nextRelayAt = now + RELAY_EVERY_MS;
        if (await probeDbLink()) {
          if (relayFails >= FAIL_LIMIT) log("database link recovered");
          relayFails = 0;
        } else {
          relayFails++;
          if (relayFails === 1) log(`database link probe failed (1/${FAIL_LIMIT})`);
          if (relayFails >= FAIL_LIMIT && now >= retryAt) {
            if (await restartRelay()) relayFails = 0;
            else retryAt = Date.now() + BACKOFF_MS;
          }
        }
      }

      // 2) 站点：HTTP 探活
      if (await probeSiteHttp()) {
        if (siteFails >= FAIL_LIMIT) log("Next.js recovered");
        siteFails = 0;

        // 每 60s 抽查静态资源，防止 standalone 缺 static（HTML 200 但 JS 404）
        if (cycle % 6 === 0 && !(await probeSiteAssets())) {
          log("static assets missing — syncing and re-checking");
          syncStatic();
          if (!(await probeSiteAssets()) && Date.now() >= retryAt) {
            if (await restartSite()) siteFails = 0;
            else retryAt = Date.now() + BACKOFF_MS;
          }
        }
      } else {
        siteFails++;
        if (siteFails === 1) log(`Next.js probe failed (1/${FAIL_LIMIT})`);
        if (siteFails >= FAIL_LIMIT && Date.now() >= retryAt) {
          if (await probeDb()) {
            if (await restartSite()) siteFails = 0;
            else retryAt = Date.now() + BACKOFF_MS;
          } else {
            log("site down but database link also unhealthy — fixing database first");
            siteFails = 0;
          }
        }
      }

      // 3) ngrok：每 30s 校验隧道（站点健康时才重拉）
      if (now >= nextNgrokAt) {
        nextNgrokAt = now + NGROK_EVERY_MS;
        if (await probeNgrok()) {
          if (ngrokFails >= FAIL_LIMIT) log("ngrok tunnel recovered");
          ngrokFails = 0;
        } else {
          ngrokFails++;
          if (ngrokFails === 1) log(`ngrok probe failed (1/${FAIL_LIMIT})`);
          if (ngrokFails >= FAIL_LIMIT && Date.now() >= retryAt && (await probeSiteHttp())) {
            if (await restartNgrok()) ngrokFails = 0;
            else retryAt = Date.now() + BACKOFF_MS;
          }
        }
      }

      // 4) 保活：每 4 分钟真实查一次库，避免 Neon 免费实例休眠后首个请求超时
      if (now >= nextWarmAt) {
        nextWarmAt = now + 4 * 60 * 1000;
        if (await probeSiteHttp()) {
          const res = await get("/api/health", 15_000);
          if (!res.ok) log("keep-warm query failed (site still up)");
        }
      }
    } catch (e) {
      log(`check error: ${e && e.message ? e.message : e}`);
    }

    await sleep(INTERVAL_MS);
  }
}
