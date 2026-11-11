import { promises as fs } from "node:fs";
import path from "node:path";

/** 订单文件类型：pi = 管理员上传的 PI/单证；slip = 客户上传的银行水单 */
export type OrderFileKind = "pi" | "slip";

/** 存档根目录：standalone 运行时 cwd 在 .next/standalone，需回到项目根目录 */
export function storageRoot(): string {
  const cwd = process.cwd();
  const base = path.basename(cwd) === "standalone" ? path.resolve(cwd, "..", "..") : cwd;
  return path.join(base, "order-files");
}

export function orderFileDir(orderId: string, kind: OrderFileKind): string {
  return path.join(storageRoot(), orderId, kind);
}

/** 保存上传文件，返回实际落盘的文件名 */
export async function saveOrderFile(orderId: string, kind: OrderFileKind, file: File): Promise<string> {
  const safeName = `${Date.now()}-${(file.name || "file").replace(/[^\w.-]+/g, "_").slice(0, 120)}`;
  const dir = orderFileDir(orderId, kind);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));
  return safeName;
}

/** 取该订单该类型的最新文件（文件名带时间戳前缀，按名称倒序即最新） */
export async function latestOrderFile(
  orderId: string,
  kind: OrderFileKind
): Promise<{ name: string; fullPath: string } | null> {
  const dir = orderFileDir(orderId, kind);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const names = entries.filter((e) => e.isFile()).map((e) => e.name).sort().reverse();
    if (names.length === 0) return null;
    return { name: names[0], fullPath: path.join(dir, names[0]) };
  } catch {
    return null;
  }
}

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function contentTypeFor(fileName: string): string {
  return MIME_BY_EXT[path.extname(fileName).toLowerCase()] ?? "application/octet-stream";
}

/** 去掉时间戳前缀，还原上传时的原始文件名 */
export function originalName(fileName: string): string {
  return fileName.replace(/^\d+-/, "");
}
