# x402付费内容系统 - API接口需求文档

## 概述

本文档描述了x402付费内容系统所需的后端API接口，用于支持内容创建、支付处理、解锁状态管理等核心功能。

## 基础接口规范

### 请求头要求
```
Authorization: Bearer {token}
Content-Type: application/json
```

### 响应格式统一
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": 1677123456789
}
```

---

## 1. 付费内容管理接口

### 1.1 创建付费内容
```
POST /api/v1/premium-content
```

**请求参数:**
```json
{
  "title": "文章标题",
  "content": "文章内容/描述",
  "targetUrl": "目标链接",
  "coverUrl": "封面图片URL",
  "categoryId": 1,
  "isPremium": true,
  "pricing": {
    "price": "5.00",
    "currency": "USDC",
    "network": "ethereum"
  }
}
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "contentId": "content_123",
    "title": "文章标题",
    "isPremium": true,
    "pricing": {
      "price": "5.00",
      "currency": "USDC",
      "network": "ethereum"
    },
    "createdAt": 1677123456789
  }
}
```

### 1.2 更新付费内容定价
```
PUT /api/v1/premium-content/{contentId}/pricing
```

**请求参数:**
```json
{
  "price": "3.00",
  "currency": "USDT",
  "network": "polygon"
}
```

### 1.3 获取内容详情（包含解锁状态）
```
GET /api/v1/premium-content/{contentId}
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "contentId": "content_123",
    "title": "文章标题",
    "content": "文章完整内容",
    "previewContent": "预览内容...",
    "targetUrl": "https://example.com",
    "isPremium": true,
    "isUnlocked": false,
    "pricing": {
      "price": "5.00",
      "currency": "USDC",
      "network": "ethereum"
    },
    "author": {
      "userId": 1001,
      "username": "作者名",
      "namespace": "author123"
    }
  }
}
```

---

## 2. 支付处理接口

### 2.1 创建支付订单
```
POST /api/v1/payments/create-order
```

**请求参数:**
```json
{
  "contentId": "content_123",
  "amount": "5.00",
  "currency": "USDC",
  "network": "ethereum",
  "walletAddress": "0x742d35Cc6634C0532925a3b8D8eC5D215a2a6A4"
}
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "paymentAddress": "0x123...789",
    "amount": "5.00",
    "currency": "USDC",
    "network": "ethereum",
    "expiresAt": 1677123756789,
    "qrCode": "data:image/png;base64,..."
  }
}
```

### 2.2 确认支付状态
```
POST /api/v1/payments/confirm
```

**请求参数:**
```json
{
  "orderId": "order_456",
  "transactionHash": "0xabc123...def789"
}
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "status": "confirmed",
    "transactionHash": "0xabc123...def789",
    "contentId": "content_123",
    "unlocked": true,
    "confirmedAt": 1677123856789
  }
}
```

### 2.3 查询支付状态
```
GET /api/v1/payments/{orderId}/status
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "status": "pending|confirmed|failed|expired",
    "transactionHash": "0xabc123...def789",
    "amount": "5.00",
    "currency": "USDC",
    "network": "ethereum",
    "createdAt": 1677123456789,
    "updatedAt": 1677123856789
  }
}
```

---

## 3. 解锁状态管理接口

### 3.1 获取用户已解锁内容列表
```
GET /api/v1/users/unlocked-content
```

**查询参数:**
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20)
- `sortBy`: 排序字段 (unlockedAt|price)
- `order`: 排序方向 (desc|asc)

**响应数据:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "contentId": "content_123",
        "title": "文章标题",
        "coverUrl": "封面图片URL",
        "targetUrl": "https://example.com",
        "price": "5.00",
        "currency": "USDC",
        "network": "ethereum",
        "transactionHash": "0xabc123...def789",
        "unlockedAt": 1677123856789,
        "author": {
          "userId": 1001,
          "username": "作者名"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 3.2 验证内容解锁状态
```
GET /api/v1/premium-content/{contentId}/unlock-status
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "contentId": "content_123",
    "isUnlocked": true,
    "unlockedAt": 1677123856789,
    "transactionHash": "0xabc123...def789",
    "price": "5.00",
    "currency": "USDC"
  }
}
```

---

## 4. 统计和分析接口

### 4.1 获取创作者收益统计
```
GET /api/v1/creators/earnings/stats
```

**查询参数:**
- `period`: 时间周期 (7d|30d|90d|1y)
- `currency`: 币种筛选 (可选)

**响应数据:**
```json
{
  "success": true,
  "data": {
    "totalEarnings": {
      "USDC": "150.50",
      "USDT": "75.25"
    },
    "totalSales": 45,
    "topContent": [
      {
        "contentId": "content_123",
        "title": "文章标题",
        "sales": 12,
        "earnings": "60.00",
        "currency": "USDC"
      }
    ],
    "recentTransactions": [
      {
        "contentId": "content_123",
        "amount": "5.00",
        "currency": "USDC",
        "buyerUsername": "buyer123",
        "timestamp": 1677123856789
      }
    ]
  }
}
```

### 4.2 获取内容销售数据
```
GET /api/v1/premium-content/{contentId}/sales-stats
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "contentId": "content_123",
    "totalSales": 12,
    "totalEarnings": "60.00",
    "currency": "USDC",
    "averageRating": 4.5,
    "salesHistory": [
      {
        "date": "2024-10-26",
        "sales": 3,
        "earnings": "15.00"
      }
    ]
  }
}
```

---

## 5. 区块链集成接口

### 5.1 获取支持的网络和代币
```
GET /api/v1/blockchain/supported-networks
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "networks": [
      {
        "networkId": "ethereum",
        "name": "Ethereum",
        "chainId": 1,
        "rpcUrl": "https://mainnet.infura.io/v3/...",
        "explorerUrl": "https://etherscan.io",
        "currencies": [
          {
            "symbol": "USDC",
            "name": "USD Coin",
            "address": "0xA0b86a33E6D0F55a5Fb6E2ef14cd1DEd1230F98b",
            "decimals": 6
          }
        ]
      }
    ]
  }
}
```

### 5.2 验证交易哈希
```
POST /api/v1/blockchain/verify-transaction
```

**请求参数:**
```json
{
  "transactionHash": "0xabc123...def789",
  "network": "ethereum",
  "expectedAmount": "5.00",
  "currency": "USDC",
  "toAddress": "0x123...789"
}
```

**响应数据:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "status": "confirmed",
    "blockNumber": 18123456,
    "confirmations": 12,
    "gasUsed": "21000",
    "verifiedAt": 1677123856789
  }
}
```

---

## 6. 错误代码定义

| 错误代码 | 描述 | HTTP状态码 |
|---------|------|-----------|
| 40001 | 内容不存在 | 404 |
| 40002 | 内容已被删除 | 410 |
| 40003 | 用户无权限访问 | 403 |
| 40004 | 支付订单不存在 | 404 |
| 40005 | 支付订单已过期 | 410 |
| 40006 | 交易验证失败 | 400 |
| 40007 | 重复支付 | 409 |
| 40008 | 网络不支持 | 400 |
| 40009 | 币种不支持 | 400 |
| 50001 | 区块链网络错误 | 502 |
| 50002 | 支付网关错误 | 502 |

---

## 7. Webhook回调接口

### 7.1 支付状态变更通知
```
POST {webhook_url}
```

**回调数据:**
```json
{
  "event": "payment.confirmed",
  "orderId": "order_456",
  "contentId": "content_123",
  "userId": 1001,
  "amount": "5.00",
  "currency": "USDC",
  "network": "ethereum",
  "transactionHash": "0xabc123...def789",
  "timestamp": 1677123856789,
  "signature": "webhook签名"
}
```

---

## 8. 部署和环境要求

### 8.1 环境变量配置
```bash
# 区块链配置
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/...
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/...

# 支付配置
PAYMENT_GATEWAY_API_KEY=your_api_key
WEBHOOK_SECRET=your_webhook_secret

# 数据库配置
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### 8.2 性能要求
- 支付确认：< 30秒
- 内容解锁：< 3秒
- API响应时间：< 500ms
- 并发支持：100+ TPS

---

## 注意事项

1. **安全性**：所有支付相关接口必须进行服务端验证，不能仅依赖前端状态
2. **幂等性**：支付确认接口需要支持重复调用而不产生副作用
3. **监控**：需要完善的支付状态监控和异常告警机制
4. **备份**：解锁记录需要可靠的数据备份和恢复方案

---

*本文档版本：v1.0*
*最后更新：2024-10-26*