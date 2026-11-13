﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// scripts/neon-relay.cjs
// 本地 PG 协议中继: 127.0.0.1:6543 -> Neon (IPv4 + TLS + SNI)
//
// 背景: 本机到 Neon 的 IPv6 不通(AAAA 记录全部超时), Prisma Rust 引擎经 getaddrinfo 优先取 IPv6
//       且不回退 IPv4 → P1001。无管理员权限改不了 HOSTS, 故用本中继绕开 DNS:
//       本地明文 <-> 中继 <-> TLS(带正确 SNI, 锁定 IPv4) <-> Neon。
//
// 使用: 保持本脚本常驻运行, .env 的 DATABASE_URL 指向 127.0.0.1:6543 且 sslmode=disable。
// 注意: Neon 的 A 记录可能变化, 上游连不上时重新 Resolve-DnsName 并更新 UPSTREAM_HOSTS。

const net = require("node:net");
const tls = require("node:tls");
const dns = require("node:dns").promises;

const LISTEN_HOST = "127.0.0.1";
const LISTEN_PORT = 6543;

// Neon 的 A 记录会变：每次连不上就重新解析，避免硬编码 IP 过期导致 P1001
const UPSTREAM_HOSTNAME = "ep-rough-king-azebfz8d-pooler.c-3.ap-southeast-1.aws.neon.tech";
const UPSTREAM_PORT = 5432;
const UPSTREAM_SNI = UPSTREAM_HOSTNAME;
const DNS_TTL_MS = 5 * 60 * 1000;

// 兜底列表（DNS 解析失败时使用，2026-10-27 实测）
let cachedHosts = ["52.76.128.157", "52.76.108.241", "13.251.213.89"];
let cachedAt = 0;

async function resolveHosts(force = false) {
  if (!force && cachedHosts.length > 0 && Date.now() - cachedAt < DNS_TTL_MS) {
    return cachedHosts;
  }
  try {
    const addrs = await dns.resolve4(UPSTREAM_HOSTNAME);
    if (addrs.length > 0) {
      cachedHosts = addrs;
      cachedAt = Date.now();
    }
  } catch {
    /* 解析失败保留上一次结果 */
  }
  return cachedHosts;
}

const SSL_REQUEST_CODE = 80877103; // PostgreSQL SSLRequest
const GSS_ENC_REQUEST_CODE = 80877104; // PostgreSQL GSSENCRequest

function connectOne(host) {
  return new Promise((resolve) => {
    const sock = tls.connect({
      host,
      port: UPSTREAM_PORT,
      servername: UPSTREAM_SNI,
      rejectUnauthorized: true,
    });
    sock.once("secureConnect", () => resolve(sock));
    sock.once("error", () => {
      sock.destroy();
      resolve(null);
    });
  });
}

async function connectUpstream(onReady) {
  for (const force of [false, true]) {
    const hosts = await resolveHosts(force);
    for (const host of hosts) {
      const sock = await connectOne(host);
      if (sock) {
        onReady(null, sock);
        return;
      }
    }
    // 全部失败：强制刷新 DNS 后再试一轮
  }
  onReady(new Error("all upstream IPv4 addresses failed"), null);
}

const server = net.createServer((client) => {
  let buffer = Buffer.alloc(0);
  let upstream = null;

  const startUpstream = (initial) => {
    client.pause();
    connectUpstream((err, sock) => {
      if (err) {
        client.destroy();
        return;
      }
      upstream = sock;
      if (initial.length > 0) upstream.write(initial);
      client.pipe(upstream);
      upstream.pipe(client);
      upstream.on("error", () => client.destroy());
      upstream.on("close", () => client.destroy());
    });
  };

  const onHandshakeData = (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    // 每类协商包固定 8 字节: [len=8][code]; StartupMessage 头部同样 8 字节可判
    while (buffer.length >= 8) {
      const len = buffer.readUInt32BE(0);
      const code = buffer.readUInt32BE(4);
      if (len === 8 && code === SSL_REQUEST_CODE) {
        // 本地侧不终止 TLS: 回 'N' 让客户端退回明文(sslmode=prefer 的客户端可接受)
        client.write("N");
        buffer = buffer.subarray(8);
        continue;
      }
      if (len === 8 && code === GSS_ENC_REQUEST_CODE) {
        client.write("N");
        buffer = buffer.subarray(8);
        continue;
      }
      // StartupMessage / CancelRequest: 建立上游 TLS 并转发, 之后纯管道
      const rest = buffer;
      buffer = Buffer.alloc(0);
      client.removeListener("data", onHandshakeData);
      startUpstream(rest);
      return;
    }
  };

  client.on("data", onHandshakeData);
  client.on("error", () => { if (upstream) upstream.destroy(); });
  client.on("close", () => { if (upstream) upstream.destroy(); });
});

// ---- Resilience: keep the relay alive ----
const LOG = "scripts\\relay.log";
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.error(line);
  try { require("fs").appendFileSync(LOG, line + "\n"); } catch {}
}

process.on("uncaughtException", (err) => {
  log(`FATAL uncaughtException: ${err?.message || err}\n${err?.stack || ""}`);
  // Don't exit — Node would die; we want to keep accepting new clients.
  // But force-close the server and restart fresh after 2s.
  try { server.close(); } catch {}
  setTimeout(() => {
    log("Restarting server after uncaughtException...");
    server.listen(LISTEN_PORT, LISTEN_HOST, () => {
      log(`Relay RESTARTED on ${LISTEN_HOST}:${LISTEN_PORT}`);
    });
  }, 2000);
});

process.on("unhandledRejection", (reason, p) => {
  log(`FATAL unhandledRejection: ${reason?.message || reason}`);
  // Swallow — async pipeline shouldn't kill the whole relay
});

server.on("error", (err) => {
  log(`server error: ${err.message}`);
});

server.on("listening", () => {
  log(`Listening ${LISTEN_HOST}:${LISTEN_PORT} -> ${UPSTREAM_HOSTNAME}:${UPSTREAM_PORT} (resolved: ${cachedHosts.join(" | ")})`);
});

server.listen(LISTEN_PORT, LISTEN_HOST);
