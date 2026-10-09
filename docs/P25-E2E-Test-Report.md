# P25 购物链路端到端验证测试报告

| 项目 | 内容 |
|------|------|
| 测试日期 | 2026-09-26 |
| 测试阶段 | P25（承接 P22 报价数据修复 / P23–P24 全站内容补齐） |
| 测试类型 | 端到端浏览器实测（E2E） |
| 测试结论 | **通过（6/6 PASS）** |
| 测试脚本 | `.trae/skills/browser-use/p25-e2e-cart.mjs` |

---

## 1. 测试目的

验证 P22 补建报价数据后，**报价旧路径（Product + SupplierQuote，quoteId 非空 → addToCart）** 的完整购物链路无回归：

```
登录 → 系列页加购 → 购物车校验 → Submit Order 创建订单
→ 结账页填写收货信息 → 提交 → 订单列表 → 订单详情
```

## 2. 测试环境

| 项 | 值 |
|------|------|
| 被测地址 | `http://localhost:3100`（生产构建，`next start -p 3100`，构建产物为 P24 最新 1064 页） |
| 浏览器 | Headless Chrome（playwright-core + 系统 Chrome，视口 1280×800） |
| 数据库 | SQLite（`prisma/dev.db`，经 P22–P24 种子后 610+ 产品全量含报价） |
| 测试账号 | `customer@b2b-store.com` / `Customer@123`（本次幂等补建，scrypt 哈希与 `prisma/seed.ts` 同款） |
| 目标型号 | `ACS580-01-012A-3`（ABB ACS580 系列首行，$525.00） |

## 3. 测试步骤与结果

| # | 步骤 | 预期 | 实际 | 结果 |
|---|------|------|------|------|
| 1 | 首页 Header 打开登录弹窗并提交 | 登录成功，Header 显示问候语 | Header 显示 **"Hi, E2E"** | PASS |
| 2 | 访问 `/brand/abb/acs580`，首行点 Add 加购 | 走报价旧路径加入购物车 | 成功；行价格 **$525.00** | PASS |
| 3 | 访问 `/cart` 校验 | 购物车含所购型号 | 型号行存在 | PASS |
| 4 | 点击 Submit Order 创建订单 | 创建订单并跳转结账页 | 跳转 `/checkout?orderId=...` | PASS |
| 5 | 填写收货信息（姓名/城市/地址/邮编/电话）并提交 | 提交成功跳转订单列表 | 跳转 `/orders`，订单 **260926-2，$525.00** | PASS |
| 6 | 订单列表 + 直访 `/orders/{orderId}` 详情 | 列表与详情均含所购型号 | 列表内联型号行可见；详情页 **260926-2** 完整渲染 | PASS |

**最终结果：6/6 PASS，退出码 0。**

## 4. 金额与业务状态校验

| 校验点 | 结果 |
|--------|------|
| 单价快照 | $525.00，与系列页价格表展示一致 |
| 订单 260926-1（首轮累计 2 件） | $1050.00 = 2 × $525.00，金额分毫不差 |
| 订单 260926-2（本轮 1 件） | $525.00 |
| 下单后订单状态 | `orderStatus = pending_review`（待审核） |
| 支付状态 | `paymentStatus = paid` |
| 结论 | 价格快照、金额计算、业务状态机（下单 → 待审核 + 已支付）全部正确 |

## 5. 过程中发现的问题与处置

以下均为**测试脚本问题**，非站点功能回归；站点代码零改动。

| # | 问题 | 根因 | 处置 |
|---|------|------|------|
| 1 | 测试账号不存在（库内唯一客户为真实用户账号） | `prisma/seed.ts` 的客户从未在当前库执行 | 新增 [p25-seed-customer.cjs](../.trae/skills/browser-use/p25-seed-customer.cjs) 幂等补建，哈希算法与 seed.ts 完全一致 |
| 2 | 登录弹窗打不开，输入框定位 30s 超时 | goto 后立即点击早于 React 水合 | 脚本加 10 次重试循环：点 Log in → 等 `#customer-login-email` 可见，失败再点 |
| 3 | 弹窗提交按钮定位失败 | AuthModal 按钮均为 `type="button"`，文案 "Log In"（非 submit 类型） | 改用 `getByRole("button", { name: "Log In", exact: true })`，避免误中 Header 的 "Log in" |
| 4 | 购物车页找不到 checkout 链接 | 真实流程为 **Submit Order 按钮 → `createOrderFromCart` 服务端 Action → 跳转 `/checkout?orderId=...`**，无静态链接 | 脚本改为点击 Submit Order + 正则等待 `/checkout` |
| 5 | 结账表单按序号填充不可靠 | 页面含 Header 搜索框等无关 input | 改按 placeholder 精确定位（`John Doe` / `New York` / `123 Main Street` / `10001` / `+1 234 567 8900`） |
| 6 | 订单列表无详情页链接 | 列表页型号行内联展示（设计如此），详情页 `/orders/[id]` 要求 25 位 cuid | 脚本增加只读 DB 查询取 orderId 直访详情页；同时新增列表页型号断言 |

## 6. 测试资产清单

| 资产 | 路径 |
|------|------|
| E2E 主脚本 | `.trae/skills/browser-use/p25-e2e-cart.mjs` |
| 测试账号种子 | `.trae/skills/browser-use/p25-seed-customer.cjs` |
| 只读 DB 探针 | `.trae/skills/browser-use/p25-db-probe.cjs` |
| 截图：登录弹窗 | `.trae/skills/browser-use/screenshots/p25-00-modal.png` |
| 截图：加购成功 | `.trae/skills/browser-use/screenshots/p25-01-added.png` |
| 截图：购物车 | `.trae/skills/browser-use/screenshots/p25-02-cart.png` |
| 截图：结账表单 | `.trae/skills/browser-use/screenshots/p25-03-checkout.png` |
| 截图：订单列表 | `.trae/skills/browser-use/screenshots/p25-04-orders.png` |
| 截图：订单详情 | `.trae/skills/browser-use/screenshots/p25-05-order-detail.png` |

## 7. 结论与建议

**结论：通过。** 报价旧路径（Product + SupplierQuote）的加购、金额快照、订单创建、支付状态流转全链路无回归；P22–P24 的数据修复成果在真实购物流程中得到端到端确认。

**后续建议：**

1. **新路径补测**：本次覆盖报价旧路径（quoteId 非空）；建议后续对**新模型路径**（Series + ModelPrice，`addToCartByModelPrice`）做同套 E2E，脚本可复用（更换目标型号即可）。
2. **测试账号纳入 seed**：建议将 `customer@b2b-store.com` 补入 `prisma/seed.ts` 的常规种子，避免换库后测试账号缺失。
3. **订单详情入口**：订单列表页无详情链接（靠内联展示），若详情页信息更丰富，可考虑在列表行加 "View" 链接提升可用性（可选，非缺陷）。

---

*报告生成：P25 阶段收尾；测试服务器已停止（端口 3100 已释放），站点代码零改动。*
