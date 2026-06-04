# ROMBOM - Industrial Marketplace Database

一个类似McMaster.com的工业/商业产品数据库系统。

## 项目概述

ROMBOM是一个完整的工业产品电商平台数据库系统，用于管理ROM（Read-Only Memory/物料）和BOM（Bill of Materials/物料清单）。

## 核心功能

- **产品管理系统** - 工业/商业产品目录
- **库存管理** - 实时库存跟踪
- **物料清单(BOM)** - 产品组件和配置
- **供应商管理** - 多供应商支持
- **订单系统** - 采购和销售订单
- **价格管理** - 动态定价和批量折扣
- **客户管理** - 客户信息和历史记录

## 技术栈

### 数据库
- PostgreSQL / MySQL
- Redis (缓存)
- Elasticsearch (搜索)

### 后端
- Python (FastAPI / Django)
- Node.js (Express)
- Java (Spring Boot)

### 前端
- React / Vue.js
- TypeScript

### 基础设施
- Docker
- Kubernetes
- CI/CD (GitHub Actions)

## 项目结构

```
ROMBOM/
├── database/           # 数据库相关
│   ├── schema/        # 数据库架构
│   ├── migrations/    # 数据库迁移
│   └── seeds/         # 初始数据
├── backend/           # 后端代码
│   ├── api/          # API接口
│   ├── models/       # 数据模型
│   └── services/     # 业务逻辑
├── frontend/          # 前端代码
│   ├── components/   # React/Vue组件
│   └── pages/        # 页面
├── docs/              # 文档
├── docker/            # Docker配置
└── tests/             # 测试
```

## 快速开始

详见各模块的README文件。

## 许可证

MIT
