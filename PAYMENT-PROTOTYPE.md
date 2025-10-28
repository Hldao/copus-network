# Copus 支付版本原型

## 项目说明
这是 Copus 集成 x402 支付协议的开发原型版本，基于最新的主分支代码创建。

## 开发目标
集成 x402 开放支付标准，实现：
- 付费内容访问控制
- 区块链支付验证
- 多链钱包支持
- 创作者收入管理

## 技术栈
- **前端**: React 18 + TypeScript + Tailwind CSS
- **支付协议**: x402 Payment Standard
- **区块链**: Ethereum, Polygon, Arbitrum, Base
- **钱包**: MetaMask, WalletConnect

## 开发计划

### Phase 1: 基础设施 (2-3周)
- [ ] x402 协议中间件实现
- [ ] 付费内容数据模型
- [ ] 支付验证服务
- [ ] 数据库模型扩展

### Phase 2: 核心功能 (3-4周)
- [ ] PaymentModal 组件
- [ ] PremiumGate 组件
- [ ] 支付历史页面
- [ ] 创作者收入工具

### Phase 3: 高级功能 (2-3周)
- [ ] 订阅模式支持
- [ ] 收入分成机制
- [ ] 社交支付功能
- [ ] 营销工具集成

### Phase 4: 优化完善 (1-2周)
- [ ] 性能优化
- [ ] 安全增强
- [ ] 用户体验优化
- [ ] 监控分析工具

## 环境配置

### 安装依赖
```bash
npm install
```

### 环境变量
```bash
# 复制环境变量文件
cp .env.example .env.local

# 配置支付相关环境变量
VITE_PAYMENT_ENABLED=true
VITE_X402_ENDPOINT=https://x402.example.com
VITE_SUPPORTED_CHAINS=1,137,42161,8453
```

### 启动开发服务器
```bash
npm run dev
```

## 参考文档
- [x402 协议文档](./docs/x402-protocol-summary-zh.md)
- [集成实施方案](./docs/x402-integration-plan.md)
- [Copus v1.1.0 功能文档](./docs/copus-v1.1.0-features.md)

## 开发注意事项
1. 保持与主分支的定期同步
2. 所有支付功能需要完整的测试覆盖
3. 安全性是最高优先级
4. 用户体验需要持续优化

## 分支管理
- `main`: 最新稳定代码
- `payment-dev`: 支付功能开发分支
- `payment-test`: 支付功能测试分支

---

*支付功能原型开发 - 让内容创作更有价值* 💰