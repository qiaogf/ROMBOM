# API 设计文档

## 基础信息

- **基础URL**: `/api/v1`
- **认证**: JWT Token
- **返回格式**: JSON
- **分页**: offset/limit

## 产品API

### 获取产品列表

```
GET /products

参数:
- category_id: 分类ID (可选)
- supplier_id: 供应商ID (可选)
- status: 产品状态 (可选)
- page: 页码 (默认: 1)
- limit: 每页数量 (默认: 20, 最大: 100)
- search: 搜索关键词 (可选)

响应:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sku": "PROD-001",
      "name": "产品名称",
      "unit_price": 99.99,
      "current_stock": 100,
      "category_id": 1,
      "status": "active"
    }
  ],
  "pagination": {
    "total": 1000,
    "page": 1,
    "limit": 20,
    "pages": 50
  }
}
```

### 获取产品详情

```
GET /products/:id

响应:
{
  "success": true,
  "data": {
    "id": 1,
    "sku": "PROD-001",
    "name": "产品名称",
    "description": "产品描述",
    "unit_price": 99.99,
    "cost_price": 50.00,
    "current_stock": 100,
    "reorder_level": 50,
    "category": {
      "id": 1,
      "name": "分类名称"
    },
    "supplier": {
      "id": 1,
      "name": "供应商名称"
    },
    "attributes": [
      {
        "name": "颜色",
        "value": "红色"
      }
    ],
    "tiered_pricing": [
      {
        "min_quantity": 1,
        "max_quantity": 9,
        "unit_price": 99.99
      }
    ]
  }
}
```

## 订单API

### 创建订单

```
POST /orders

请求体:
{
  "order_type": "sales",
  "customer_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 10,
      "unit_price": 99.99
    }
  ],
  "notes": "订单备注"
}

响应:
{
  "success": true,
  "data": {
    "id": 1,
    "order_number": "ORD-20260604-001",
    "status": "pending",
    "total": 999.90,
    "created_at": "2026-06-04T12:00:00Z"
  }
}
```

### 获取订单列表

```
GET /orders

参数:
- customer_id: 客户ID (可选)
- status: 订单状态 (可选)
- from_date: 开始日期 (可选)
- to_date: 结束日期 (可选)
- page: 页码
- limit: 每页数量
```

## 错误处理

```
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "产品未找到",
    "status": 404
  }
}
```

## 常见错误代码

| 代码 | HTTP | 说明 |
|------|------|------|
| PRODUCT_NOT_FOUND | 404 | 产品不存在 |
| INSUFFICIENT_STOCK | 400 | 库存不足 |
| INVALID_QUANTITY | 400 | 无效数量 |
| CUSTOMER_NOT_FOUND | 404 | 客户不存在 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 禁止访问 |
