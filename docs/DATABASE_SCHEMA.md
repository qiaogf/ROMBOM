# ROMBOM 数据库架构文档

## 概述

ROMBOM数据库采用关系型数据库设计，支持工业产品电商平台的所有核心功能。

## 主要实体

### 1. 产品管理模块

#### 核心表
- **products** - 产品基本信息
- **product_categories** - 产品分类
- **product_attributes** - 产品属性（规格参数）
- **inventory_logs** - 库存交易记录

#### 字段说明

**products表**
- `sku`: 产品标识符，唯一
- `current_stock`: 实时库存
- `reorder_level`: 库存警告线
- `status`: active(活跃)/inactive(不活跃)/discontinued(停产)

### 2. 供应商管理模块

#### 核心表
- **suppliers** - 供应商信息
- **supplier_prices** - 供应商报价

#### 特点
- 支持多供应商
- 价格跟踪和历史
- 付款条款管理
- 交货期管理

### 3. 订单管理模块

#### 核心表
- **orders** - 订单主表
- **order_items** - 订单明细

#### 功能
- 采购订单
- 销售订单
- 订单状态跟踪
- 发货管理

### 4. 客户管理模块

#### 核心表
- **customers** - 客户信息
- **customer_tiers** - 客户等级

#### 支持
- 个人和企业客户
- 信用额度管理
- 等级折扣
- 购买历史

### 5. 物料清单(BOM)模块

#### 核心表
- **bills_of_materials** - BOM主表
- **bom_items** - BOM明细

#### 功能
- 产品组件管理
- BOM版本控制
- 生效期管理
- 损耗系数

### 6. 定价管理模块

#### 核心表
- **pricing_policies** - 价格政策
- **tiered_pricing** - 分级定价
- **promotions** - 促销活动

#### 特点
- 灵活的分级定价
- 促销代码管理
- 多种折扣类型

## 数据关系图

```
customers ←→ orders ←→ order_items ←→ products
                                          ↑
                                          |
                            product_categories
                                          ↑
                                          |
                           product_attributes

products ←→ supplier_prices ←→ suppliers
    ↓
bills_of_materials ←→ bom_items ←→ products (components)

products ←→ tiered_pricing
products ←→ promotions
```

## 关键设计原则

1. **规范化**: 避免数据冗余
2. **可扩展性**: 支持未来增长
3. **性能**: 适当的索引
4. **跟踪**: 完整的审计日志
5. **灵活性**: 支持多种业务场景

## 索引策略

关键查询的索引:
- 产品查询: `sku`, `category_id`, `status`
- 订单查询: `order_number`, `customer_id`, `status`, `order_date`
- 供应商查询: `supplier_id`, `product_id`
- 库存查询: `product_id`, `created_at`

## 扩展计划

- [ ] 多仓库支持
- [ ] 财务模块（发票、付款）
- [ ] 质量管理（QC、退货）
- [ ] 电商平台集成
- [ ] 报表分析
