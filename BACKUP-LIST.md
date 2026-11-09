# 独立站文件备份清单

> 项目路径：`d:\store\cross-border-store`
> 生成时间：2026-11-09

---

## 📁 必须备份的核心文件

### 1. 源代码目录 `src\`

包含所有页面、组件、API 和业务逻辑，**最重要**！

| 路径 | 说明 |
|------|------|
| `src\app\` | Next.js 页面路由（shop、admin、api、auth、customer、supplier） |
| `src\app\(shop)\` | 商城前端页面（首页、商品、购物车、结算、订单等） |
| `src\app\admin\` | 管理后台（品牌、分类、订单、采购、销售、供应商等） |
| `src\app\api\` | API 接口（admin、cron、支付凭证、订单文档等） |
| `src\app\auth\` | 登录/注册页面 |
| `src\actions\` | Server Actions（products.ts 等） |
| `src\components\` | React 组件（布局、购物车、首页、导入、机柜图表等） |
| `src\lib\` | 工具函数（数据库、认证、价格计算、安全、序列化等） |
| `src\proxy.ts` | 代理配置 |

### 2. 数据库目录 `prisma\`

| 文件 | 说明 |
|------|------|
| `prisma\schema.prisma` | 数据库模型定义（**最重要！**） |
| `prisma\seed.ts` | 数据库种子数据 |
| `prisma\generated\` | Prisma 生成的客户端代码（可选备份） |

### 3. 静态资源目录 `public\`

| 路径 | 说明 |
|------|------|
| `public\images\` | 网站图片（产品图、banner 等） |
| `public\fonts\` | 自定义字体 |
| `public\api-tester.html` | API 测试页面 |
| `public\payment-methods.png` | 支付方式图片 |

### 4. 脚本目录 `scripts\`

| 文件 | 说明 |
|------|------|
| `scripts\neon-relay.cjs` | Neon 数据库中继脚本 |
| `scripts\start-boot.vbs` | Windows 开机启动脚本 |
| `scripts\start-prod.vbs` | 生产环境启动脚本 |
| `scripts\enable-autologon.ps1` | 自动登录启用脚本 |
| `scripts\disable-autologon.ps1` | 自动登录禁用脚本 |

### 5. 根目录配置文件

| 文件 | 说明 | 重要性 |
|------|------|--------|
| `.env` | 生产环境变量（含数据库密码、密钥） | ⭐⭐⭐ 最高 |
| `.env.local` | 本地开发环境变量 | ⭐⭐⭐ 最高 |
| `.env.example` | 环境变量模板 | ⭐⭐ |
| `next.config.ts` | Next.js 配置 | ⭐⭐⭐ |
| `package.json` | 项目依赖和脚本 | ⭐⭐⭐ |
| `pnpm-lock.yaml` | 依赖版本锁定 | ⭐⭐⭐ |
| `tsconfig.json` | TypeScript 配置 | ⭐⭐ |
| `vercel.json` | Vercel 部署配置 | ⭐⭐ |
| `prisma.config.ts` | Prisma 配置 | ⭐⭐ |
| `eslint.config.mjs` | ESLint 配置 | ⭐ |
| `postcss.config.mjs` | PostCSS 配置 | ⭐ |
| `pnpm-workspace.yaml` | pnpm workspace 配置 | ⭐ |
| `.gitignore` | Git 忽略规则 | ⭐ |

### 6. 文档文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目说明文档 |
| `AGENTS.md` | 代理/开发规则 |
| `CLAUDE.md` | AI 助手说明 |

---

## 🚫 无需备份（可重新生成）

| 路径 | 原因 |
|------|------|
| `.next\` | 构建缓存，运行 `pnpm build` 重新生成 |
| `node_modules\` | 依赖包，运行 `pnpm install` 重新安装 |
| `tsconfig.tsbuildinfo` | TS 构建缓存 |
| `.vercel\` | Vercel 缓存 |
| `.trae\` | Trae IDE 本地配置 |
| `build.log`, `next-start.log` | 日志文件 |
| `exports\` | 导出数据（如有原始数据可重新导出） |

---

## 💾 快速备份命令（PowerShell）

```powershell
# 创建备份目录（以日期命名）
$backupDir = "D:\backups\cross-border-store-$(Get-Date -Format 'yyyyMMdd-HHmm')"
New-Item -ItemType Directory -Path $backupDir -Force

# 备份核心目录
Copy-Item -Path "D:\store\cross-border-store\src" -Destination "$backupDir\src" -Recurse
Copy-Item -Path "D:\store\cross-border-store\prisma" -Destination "$backupDir\prisma" -Recurse
Copy-Item -Path "D:\store\cross-border-store\public" -Destination "$backupDir\public" -Recurse
Copy-Item -Path "D:\store\cross-border-store\scripts" -Destination "$backupDir\scripts" -Recurse

# 备份根目录配置文件
Copy-Item -Path "D:\store\cross-border-store\.env*" -Destination "$backupDir\" -Force
Copy-Item -Path "D:\store\cross-border-store\*.json" -Destination "$backupDir\" -Force
Copy-Item -Path "D:\store\cross-border-store\*.ts" -Destination "$backupDir\" -Force
Copy-Item -Path "D:\store\cross-border-store\*.mjs" -Destination "$backupDir\" -Force
Copy-Item -Path "D:\store\cross-border-store\*.yaml" -Destination "$backupDir\" -Force
Copy-Item -Path "D:\store\cross-border-store\*.md" -Destination "$backupDir\" -Force
Copy-Item -Path "D:\store\cross-border-store\.gitignore" -Destination "$backupDir\" -Force

Write-Host "备份完成: $backupDir"
```

---

## 🗄️ 数据库备份（Neon PostgreSQL）

数据库不在项目目录内，需单独导出。最近一次导出：**2026-11-09**

| 文件 | 说明 |
|------|------|
| `db-schema-2026-11-09.sql` | 建表结构（20 张表、3 个枚举） |
| `db-data-2026-11-09.sql` | 全部数据（1697 行 INSERT 语句） |
| `db-manifest-2026-11-09.json` | 各表行数清单（用于恢复后核对） |

存放位置（三份）：

- `D:\store\cross-border-store\backups\`
- `G:\db-backups-2026-11-09\`
- `F:\db-backups-2026-11-09\`

已验证：将 SQL 还原到临时 schema 后，20 张表行数与源库完全一致。

### 恢复数据库

```powershell
# 方式一：有 psql / pg_dump 环境
psql "$env:DATABASE_URL" -f "G:\db-backups-2026-11-09\db-schema-2026-11-09.sql"
psql "$env:DATABASE_URL" -f "G:\db-backups-2026-11-09\db-data-2026-11-09.sql"

# 方式二：无 psql，用 prisma 执行
cd D:\store\cross-border-store
npx prisma db execute --file "G:\db-backups-2026-11-09\db-schema-2026-11-09.sql" --schema prisma/schema.prisma
npx prisma db execute --file "G:\db-backups-2026-11-09\db-data-2026-11-09.sql" --schema prisma/schema.prisma
```

注意：

- 数据文件中的 INSERT 已按外键依赖排序，可直接顺序执行
- 恢复前确认目标库为空库，否则主键冲突
- 如需再次导出，可用 `prisma migrate diff` 生成结构 + 脚本导出数据

---

## 🔄 恢复步骤

1. **重新安装依赖**：`pnpm install`
2. **恢复环境变量**：将 `.env` 和 `.env.local` 复制回项目根目录
3. **恢复数据库**：见上方「恢复数据库」
4. **重新生成 Prisma 客户端**：`pnpm prisma generate`
5. **重新构建项目**：`pnpm build`
6. **启动服务**：`pnpm start` 或使用 `scripts\start-prod.vbs`

---

## ⚠️ 特别提醒

- `.env` 和 `.env.local` 包含**数据库密码、API 密钥**等敏感信息，请**加密保存**或**离线存储**
- 建议定期备份（每周或每次大改动后）
- 备份文件建议保存在**其他磁盘**或**云存储**，避免与源文件在同一硬盘
