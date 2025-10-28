// Mock API 服务 - 用于开发环境测试
import { PAYMENT_CONFIG, getEnvironmentConfig } from '../config/paymentConfig';

interface MockPaymentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class MockApiService {
  private readonly config = getEnvironmentConfig();

  // 模拟获取支付地址
  async getPaymentAddress(contentId: string, network: string): Promise<MockPaymentResponse> {
    // 模拟网络延迟
    await this.delay(500, 1500);

    // 10% 概率失败
    if (Math.random() < 0.1) {
      return {
        success: false,
        error: '获取支付地址失败，请稍后重试',
      };
    }

    // 根据网络返回不同的地址
    const mockAddresses = {
      ethereum: '0x742C3eF46E1c5D7c2C5d5F7D3E8F9B1a2A3B4C5D',
      polygon: '0x863D4E1c8c2C9F4c8A5B1E2f5D3E8F9B1a2A3B4C',
      arbitrum: '0x984E5F2c9D3F5E1B2A3C6D7E8F9B1a2A3B4C5D6E',
      base: '0xA95F6E3D4C5B7A8E9F1B2C3D4E5F6A7B8C9D0E1F',
    };

    return {
      success: true,
      data: {
        address: mockAddresses[network as keyof typeof mockAddresses] || mockAddresses.ethereum,
        network,
        contentId,
        expiresAt: Date.now() + 30 * 60 * 1000, // 30分钟过期
      },
    };
  }

  // 模拟通知支付完成
  async notifyPaymentComplete(params: {
    contentId: string;
    transactionHash: string;
    userIdentifier: string;
    amount: string;
    currency: string;
    network: string;
  }): Promise<MockPaymentResponse> {
    await this.delay(300, 800);

    // 5% 概率失败
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: '服务器处理失败，请稍后重试',
      };
    }

    console.log('📝 Mock: 支付完成通知', params);

    return {
      success: true,
      data: {
        processed: true,
        timestamp: Date.now(),
        confirmationId: `conf_${Math.random().toString(36).substr(2, 9)}`,
      },
    };
  }

  // 模拟钱包验证解锁
  async verifyUnlockByWallet(params: {
    contentId: string;
    walletAddress: string;
    timestamp: number;
  }): Promise<MockPaymentResponse> {
    await this.delay(800, 2000);

    // 模拟数据库查询结果
    const mockPaymentRecords = this.getMockPaymentRecords(params.walletAddress);
    const record = mockPaymentRecords.find(r => r.contentId === params.contentId);

    if (record) {
      return {
        success: true,
        data: {
          unlocked: true,
          record: {
            transactionHash: record.transactionHash,
            price: record.price,
            currency: record.currency,
            unlockedAt: record.unlockedAt,
            network: record.network,
          },
        },
      };
    }

    return {
      success: true,
      data: {
        unlocked: false,
        message: '该钱包地址没有购买过此内容',
      },
    };
  }

  // 模拟交易哈希恢复
  async restoreUnlockByTransaction(params: {
    contentId: string;
    transactionHash: string;
  }): Promise<MockPaymentResponse> {
    await this.delay(1000, 2500);

    // 验证交易哈希格式
    if (!PAYMENT_CONFIG.SECURITY.VALIDATION.TRANSACTION_HASH_REGEX.test(params.transactionHash)) {
      return {
        success: false,
        error: '无效的交易哈希格式',
      };
    }

    // 30% 概率找不到交易
    if (Math.random() < 0.3) {
      return {
        success: false,
        error: '未找到相关交易记录，请检查交易哈希是否正确',
      };
    }

    // 模拟区块链查询结果
    const mockTransactionData = {
      transactionHash: params.transactionHash,
      walletAddress: '0x742C3eF46E1c5D7c2C5d5F7D3E8F9B1a2A3B4C5D',
      price: '0.001',
      currency: 'ETH',
      network: 'ethereum',
      blockNumber: 18500000 + Math.floor(Math.random() * 100000),
      unlockedAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // 过去7天内
    };

    return {
      success: true,
      data: {
        valid: true,
        record: mockTransactionData,
      },
    };
  }

  // 模拟批量解锁状态查询
  async batchUnlockStatus(params: {
    contentIds: string[];
    walletAddress: string;
  }): Promise<MockPaymentResponse> {
    await this.delay(400, 1000);

    const mockPaymentRecords = this.getMockPaymentRecords(params.walletAddress);
    const unlockStatus: Record<string, any> = {};

    params.contentIds.forEach(contentId => {
      const record = mockPaymentRecords.find(r => r.contentId === contentId);
      unlockStatus[contentId] = {
        unlocked: !!record,
        transactionHash: record?.transactionHash,
        unlockedAt: record?.unlockedAt,
      };
    });

    return {
      success: true,
      data: {
        unlockStatus,
      },
    };
  }

  // 模拟获取交易状态
  async getTransactionStatus(transactionHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    requiredConfirmations: number;
    blockNumber?: number;
    gasUsed?: string;
  } | null> {
    await this.delay(200, 600);

    // 10% 概率无法获取状态
    if (Math.random() < 0.1) {
      return null;
    }

    // 模拟交易确认过程
    const createdTime = this.getTransactionCreatedTime(transactionHash);
    const elapsedMinutes = (Date.now() - createdTime) / (1000 * 60);

    let status: 'pending' | 'confirmed' | 'failed';
    let confirmations: number;

    if (elapsedMinutes < 1) {
      // 1分钟内：待确认
      status = 'pending';
      confirmations = 0;
    } else if (elapsedMinutes < 3) {
      // 1-3分钟：部分确认
      status = 'pending';
      confirmations = Math.floor(elapsedMinutes);
    } else if (elapsedMinutes > 30 && Math.random() < 0.02) {
      // 30分钟后2%概率失败
      status = 'failed';
      confirmations = 0;
    } else {
      // 3分钟后：已确认
      status = 'confirmed';
      confirmations = 12;
    }

    return {
      status,
      confirmations,
      requiredConfirmations: 3,
      blockNumber: status === 'confirmed' ? 18500000 + Math.floor(Math.random() * 100000) : undefined,
      gasUsed: status === 'confirmed' ? '21000' : undefined,
    };
  }

  // 模拟网络延迟
  private async delay(minMs: number, maxMs: number): Promise<void> {
    const delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // 获取模拟支付记录
  private getMockPaymentRecords(walletAddress: string) {
    // 基于钱包地址生成确定性的模拟数据
    const seed = this.hashCode(walletAddress);
    const random = this.seededRandom(seed);

    const mockRecords = [];
    const contentIds = ['premium-demo-1', 'premium-demo-2', 'premium-demo-3'];

    // 随机决定哪些内容已购买
    contentIds.forEach((contentId, index) => {
      if (random() < 0.4) { // 40% 概率已购买
        mockRecords.push({
          contentId,
          transactionHash: `0x${Math.floor(random() * 1000000).toString(16).padStart(64, '0')}`,
          price: ['0.001', '0.005', '0.01'][index],
          currency: 'ETH',
          network: 'ethereum',
          unlockedAt: Date.now() - Math.floor(random() * 30 * 24 * 60 * 60 * 1000), // 过去30天内
        });
      }
    });

    return mockRecords;
  }

  // 获取交易创建时间（基于交易哈希模拟）
  private getTransactionCreatedTime(transactionHash: string): number {
    const hash = this.hashCode(transactionHash);
    // 模拟交易在过去10分钟内创建
    return Date.now() - (Math.abs(hash) % (10 * 60 * 1000));
  }

  // 简单哈希函数
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }

  // 带种子的随机数生成器
  private seededRandom(seed: number) {
    let currentSeed = seed;
    return function() {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  // 判断是否启用 Mock API
  shouldUseMockApi(): boolean {
    return this.config.enableMockApis;
  }
}

// 导出单例实例
export const mockApiService = new MockApiService();