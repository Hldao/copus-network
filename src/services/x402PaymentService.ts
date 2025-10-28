// x402 开放支付协议模拟服务
export interface X402PaymentRequest {
  contentId: string;
  contentTitle: string;
  contentAuthor: string;
  amount: string;
  currency: string;
  network: string;
  walletAddress?: string;
  metadata?: Record<string, any>;
}

export interface X402PaymentResponse {
  success: boolean;
  transactionHash?: string;
  paymentId: string;
  timestamp: number;
  error?: string;
  receipt?: X402PaymentReceipt;
}

export interface X402PaymentReceipt {
  paymentId: string;
  contentId: string;
  amount: string;
  currency: string;
  network: string;
  transactionHash: string;
  blockNumber?: number;
  gasUsed?: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface X402WalletConnection {
  address: string;
  chainId: number;
  networkName: string;
  balance: string;
  isConnected: boolean;
}

// 支持的网络配置
export const X402_SUPPORTED_NETWORKS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io'
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com'
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    symbol: 'ARB',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io'
  },
  base: {
    chainId: 8453,
    name: 'Base',
    symbol: 'BASE',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org'
  }
};

class X402PaymentService {
  private static instance: X402PaymentService;
  private paymentHistory: X402PaymentReceipt[] = [];
  private connectedWallet: X402WalletConnection | null = null;

  private constructor() {
    this.loadPaymentHistory();
  }

  public static getInstance(): X402PaymentService {
    if (!X402PaymentService.instance) {
      X402PaymentService.instance = new X402PaymentService();
    }
    return X402PaymentService.instance;
  }

  // 模拟钱包连接
  async connectWallet(walletType: string): Promise<X402WalletConnection> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 模拟连接成功
        if (Math.random() > 0.05) { // 95%成功率
          const mockAddress = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const connection: X402WalletConnection = {
            address: mockAddress,
            chainId: 1,
            networkName: 'Ethereum',
            balance: (Math.random() * 10 + 1).toFixed(4),
            isConnected: true
          };
          this.connectedWallet = connection;
          resolve(connection);
        } else {
          reject(new Error('钱包连接被用户拒绝'));
        }
      }, 1000 + Math.random() * 2000); // 1-3秒延时
    });
  }

  // 断开钱包连接
  disconnectWallet(): void {
    this.connectedWallet = null;
  }

  // 获取当前连接状态
  getWalletConnection(): X402WalletConnection | null {
    return this.connectedWallet;
  }

  // 处理x402支付请求
  async processPayment(request: X402PaymentRequest): Promise<X402PaymentResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const paymentId = 'x402_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

        // 模拟支付成功率（90%）
        if (Math.random() > 0.1) {
          const transactionHash = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const receipt: X402PaymentReceipt = {
            paymentId,
            contentId: request.contentId,
            amount: request.amount,
            currency: request.currency,
            network: request.network,
            transactionHash,
            blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
            gasUsed: (Math.random() * 50000 + 21000).toFixed(0),
            timestamp: Date.now(),
            status: 'confirmed'
          };

          // 保存到支付历史
          this.paymentHistory.push(receipt);
          this.savePaymentHistory();

          resolve({
            success: true,
            transactionHash,
            paymentId,
            timestamp: Date.now(),
            receipt
          });
        } else {
          // 模拟支付失败
          const errors = [
            '网络拥堵，请稍后重试',
            '余额不足',
            '交易被拒绝',
            'Gas费用不足',
            '网络连接超时'
          ];
          const error = errors[Math.floor(Math.random() * errors.length)];

          resolve({
            success: false,
            paymentId,
            timestamp: Date.now(),
            error
          });
        }
      }, 2000 + Math.random() * 3000); // 2-5秒处理时间
    });
  }

  // 验证支付状态
  async verifyPayment(paymentId: string): Promise<X402PaymentReceipt | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const receipt = this.paymentHistory.find(p => p.paymentId === paymentId);
        resolve(receipt || null);
      }, 500);
    });
  }

  // 获取支付历史
  getPaymentHistory(): X402PaymentReceipt[] {
    return this.paymentHistory.slice().reverse(); // 最新的在前
  }

  // 获取指定内容的支付状态
  getContentPaymentStatus(contentId: string): X402PaymentReceipt | null {
    return this.paymentHistory.find(p =>
      p.contentId === contentId && p.status === 'confirmed'
    ) || null;
  }

  // 计算网络费用估算
  async estimateNetworkFee(network: string, amount: string): Promise<{
    estimatedGas: string;
    gasPrice: string;
    totalFee: string;
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const baseGas = 21000;
        const gasMultiplier = network === 'ethereum' ? 2 : 0.5;
        const estimatedGas = (baseGas * gasMultiplier).toString();
        const gasPrice = (Math.random() * 50 + 10).toFixed(2); // 10-60 Gwei
        const totalFee = ((parseFloat(estimatedGas) * parseFloat(gasPrice)) / 1e9).toFixed(6);

        resolve({
          estimatedGas,
          gasPrice,
          totalFee
        });
      }, 1000);
    });
  }

  // 私有方法：保存支付历史到本地存储
  private savePaymentHistory(): void {
    try {
      localStorage.setItem('x402_payment_history', JSON.stringify(this.paymentHistory));
    } catch (error) {
      console.warn('无法保存支付历史到本地存储:', error);
    }
  }

  // 私有方法：从本地存储加载支付历史
  private loadPaymentHistory(): void {
    try {
      const stored = localStorage.getItem('x402_payment_history');
      if (stored) {
        this.paymentHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('无法从本地存储加载支付历史:', error);
      this.paymentHistory = [];
    }
  }

  // 清除支付历史（用于演示重置）
  clearPaymentHistory(): void {
    this.paymentHistory = [];
    localStorage.removeItem('x402_payment_history');
  }
}

// 导出单例实例
export const x402PaymentService = X402PaymentService.getInstance();

// 导出类型和常量
export default X402PaymentService;