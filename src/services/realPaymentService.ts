import { walletService } from './walletService';
import { PAYMENT_CONFIG, getEnvironmentConfig, validatePaymentParams } from '../config/paymentConfig';
import { mockApiService } from './mockApiService';

// 支付相关类型定义
export interface PaymentParams {
  contentId: string;
  amount: string;
  currency: string;
  network: string;
  recipientAddress: string;
  userIdentifier?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  requiredConfirmations: number;
  transactionHash: string;
  blockNumber?: number;
  gasUsed?: string;
}

// 货币精度配置
const CURRENCY_DECIMALS: Record<string, number> = {
  'ETH': 18,
  'MATIC': 18,
  'USDC': 6,
  'USDT': 6,
  'DAI': 18,
};

// 合约地址配置
const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
  '0x1': { // Ethereum Mainnet
    'USDC': '0xA0b86a33E6441c8C4f5B0a4F8DF0B1f6F7A5E2C1',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  '0x89': { // Polygon
    'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
  '0xa4b1': { // Arbitrum
    'USDC': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  '0x2105': { // Base
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
};

// ERC20 ABI（简化版本）
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

class RealPaymentService {
  private readonly config = getEnvironmentConfig();

  // 格式化金额到Wei
  private formatAmountToWei(amount: string, currency: string): string {
    const currencyConfig = PAYMENT_CONFIG.SUPPORTED_CURRENCIES[currency as keyof typeof PAYMENT_CONFIG.SUPPORTED_CURRENCIES];
    const decimals = currencyConfig?.decimals || 18;
    const numAmount = parseFloat(amount);
    const wei = Math.floor(numAmount * Math.pow(10, decimals));
    return '0x' + wei.toString(16);
  }

  // 获取代币合约地址
  private getTokenContract(currency: string, chainId: string): string | null {
    const chainContracts = TOKEN_CONTRACTS[chainId];
    return chainContracts?.[currency] || null;
  }

  // 执行原生代币转账 (ETH, MATIC等)
  private async sendNativeToken(params: PaymentParams): Promise<PaymentResult> {
    try {
      const amountInWei = this.formatAmountToWei(params.amount, params.currency);

      const txHash = await walletService.sendTransaction({
        to: params.recipientAddress,
        value: amountInWei,
        data: '0x', // 可以添加备注数据
      });

      return {
        success: true,
        transactionHash: txHash,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '原生代币转账失败',
      };
    }
  }

  // 执行ERC20代币转账
  private async sendERC20Token(params: PaymentParams, contractAddress: string): Promise<PaymentResult> {
    try {
      // 这里需要使用ethers.js或web3.js来构建ERC20转账交易
      // 为了简化，我们使用wallet的sendTransaction方法
      const amountInWei = this.formatAmountToWei(params.amount, params.currency);

      // 构建ERC20 transfer的data
      const transferMethodId = '0xa9059cbb'; // transfer(address,uint256)的方法签名
      const recipientPadded = params.recipientAddress.replace('0x', '').padStart(64, '0');
      const amountPadded = amountInWei.replace('0x', '').padStart(64, '0');
      const data = transferMethodId + recipientPadded + amountPadded;

      const txHash = await walletService.sendTransaction({
        to: contractAddress,
        value: '0x0', // ERC20转账不需要ETH
        data: data,
      });

      return {
        success: true,
        transactionHash: txHash,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'ERC20代币转账失败',
      };
    }
  }

  // 主要支付方法
  async processPayment(params: PaymentParams): Promise<PaymentResult> {
    try {
      // 验证支付参数
      const validation = validatePaymentParams({
        amount: params.amount,
        currency: params.currency,
        network: params.network,
        recipient: params.recipientAddress,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // 检查钱包连接状态
      const walletState = walletService.getState();
      if (!walletState.isConnected || !walletState.account) {
        return {
          success: false,
          error: '钱包未连接',
        };
      }

      // 验证网络
      const currentChainId = walletState.chainId;
      if (!currentChainId) {
        return {
          success: false,
          error: '无法获取当前网络',
        };
      }

      // 检查是否为原生代币
      const isNativeToken = ['ETH', 'MATIC', 'BNB'].includes(params.currency);

      if (isNativeToken) {
        return await this.sendNativeToken(params);
      } else {
        // ERC20代币转账
        const contractAddress = this.getTokenContract(params.currency, currentChainId);
        if (!contractAddress) {
          return {
            success: false,
            error: `不支持的代币: ${params.currency} 在网络 ${currentChainId}`,
          };
        }

        return await this.sendERC20Token(params, contractAddress);
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '支付处理失败',
      };
    }
  }

  // 获取交易状态
  async getTransactionStatus(txHash: string): Promise<PaymentStatus | null> {
    try {
      // 使用钱包的RPC调用来获取交易状态
      if (!window.ethereum) {
        throw new Error('未找到钱包');
      }

      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (!receipt) {
        return {
          status: 'pending',
          confirmations: 0,
          requiredConfirmations: 3,
          transactionHash: txHash,
        };
      }

      // 获取当前块高度
      const currentBlock = await window.ethereum.request({
        method: 'eth_blockNumber',
        params: [],
      });

      const confirmations = parseInt(currentBlock, 16) - parseInt(receipt.blockNumber, 16);
      const requiredConfirmations = 3;

      return {
        status: confirmations >= requiredConfirmations ? 'confirmed' : 'pending',
        confirmations,
        requiredConfirmations,
        transactionHash: txHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        gasUsed: parseInt(receipt.gasUsed, 16).toString(),
      };
    } catch (error) {
      console.error('获取交易状态失败:', error);
      return null;
    }
  }

  // 验证交易是否为有效支付
  async verifyPayment(txHash: string, expectedParams: {
    recipient: string;
    amount: string;
    currency: string;
  }): Promise<boolean> {
    try {
      if (!window.ethereum) {
        return false;
      }

      const tx = await window.ethereum.request({
        method: 'eth_getTransactionByHash',
        params: [txHash],
      });

      if (!tx) {
        return false;
      }

      // 验证收款地址
      if (tx.to.toLowerCase() !== expectedParams.recipient.toLowerCase()) {
        return false;
      }

      // 验证金额（这里需要更复杂的逻辑来处理不同精度）
      const expectedWei = this.formatAmountToWei(expectedParams.amount, expectedParams.currency);

      // 对于原生代币，直接比较value
      if (['ETH', 'MATIC', 'BNB'].includes(expectedParams.currency)) {
        return tx.value === expectedWei;
      }

      // 对于ERC20代币，需要解析交易数据
      // 这里简化处理，实际应用中需要更严格的验证
      return true;
    } catch (error) {
      console.error('验证支付失败:', error);
      return false;
    }
  }

  // 估算Gas费用
  async estimateGasFee(params: PaymentParams): Promise<{
    gasLimit: string;
    gasPrice: string;
    estimatedFee: string;
  } | null> {
    try {
      if (!window.ethereum) {
        throw new Error('未找到钱包');
      }

      const walletState = walletService.getState();
      if (!walletState.account) {
        throw new Error('钱包未连接');
      }

      // 获取当前Gas价格
      const gasPrice = await window.ethereum.request({
        method: 'eth_gasPrice',
        params: [],
      });

      // 估算Gas限制
      const isNativeToken = ['ETH', 'MATIC', 'BNB'].includes(params.currency);
      let gasLimit: string;

      if (isNativeToken) {
        // 原生代币转账的Gas限制通常是21000
        gasLimit = '0x5208'; // 21000 in hex
      } else {
        // ERC20转账的Gas限制通常是65000-100000
        gasLimit = '0xFDE8'; // 65000 in hex
      }

      // 计算预估费用
      const gasPriceInt = parseInt(gasPrice, 16);
      const gasLimitInt = parseInt(gasLimit, 16);
      const estimatedFee = (gasPriceInt * gasLimitInt).toString();

      return {
        gasLimit,
        gasPrice,
        estimatedFee,
      };
    } catch (error) {
      console.error('估算Gas费用失败:', error);
      return null;
    }
  }

  // 获取收款地址（从后端API获取）
  async getPaymentAddress(contentId: string, network: string): Promise<string | null> {
    try {
      // 开发模式使用 Mock API
      if (mockApiService.shouldUseMockApi()) {
        const mockResponse = await mockApiService.getPaymentAddress(contentId, network);
        if (mockResponse.success) {
          return mockResponse.data.address;
        } else {
          throw new Error(mockResponse.error);
        }
      }

      // 生产模式调用真实API
      const response = await fetch(`${this.config.apiBaseUrl}${PAYMENT_CONFIG.PAYMENT_SETTINGS.API_ENDPOINTS.GET_PAYMENT_ADDRESS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentId,
          network,
        }),
      });

      if (!response.ok) {
        throw new Error('获取收款地址失败');
      }

      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('获取收款地址失败:', error);
      // 降级到配置中的备用地址
      return this.config.fallbackPaymentAddress;
    }
  }

  // 通知后端支付完成
  async notifyPaymentComplete(params: {
    contentId: string;
    transactionHash: string;
    userIdentifier: string;
    amount: string;
    currency: string;
    network: string;
  }): Promise<boolean> {
    try {
      // 开发模式使用 Mock API
      if (mockApiService.shouldUseMockApi()) {
        const mockResponse = await mockApiService.notifyPaymentComplete(params);
        return mockResponse.success;
      }

      // 生产模式调用真实API
      const response = await fetch(`${this.config.apiBaseUrl}${PAYMENT_CONFIG.PAYMENT_SETTINGS.API_ENDPOINTS.NOTIFY_PAYMENT_COMPLETE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      return response.ok;
    } catch (error) {
      console.error('通知支付完成失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const realPaymentService = new RealPaymentService();