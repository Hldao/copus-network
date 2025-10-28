import { AuthService } from './authService';

// 钱包连接服务
export interface WalletAccount {
  address: string;
  balance?: string;
}

export interface WalletState {
  isConnected: boolean;
  account: WalletAccount | null;
  chainId: string | null;
  walletType: string | null;
}

export interface NetworkConfig {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrls: string[];
}

// 支持的网络配置
const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  '0x1': {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://etherscan.io'],
  },
  '0x89': {
    chainId: '0x89',
    chainName: 'Polygon Mainnet',
    rpcUrls: ['https://polygon-rpc.com'],
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  '0xa4b1': {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  '0x2105': {
    chainId: '0x2105',
    chainName: 'Base',
    rpcUrls: ['https://mainnet.base.org'],
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    blockExplorerUrls: ['https://basescan.org'],
  },
};

declare global {
  interface Window {
    ethereum?: any;
    web3?: any;
  }
}

class WalletService {
  private state: WalletState = {
    isConnected: false,
    account: null,
    chainId: null,
    walletType: null,
  };

  private listeners: ((state: WalletState) => void)[] = [];
  private loginWithWalletFn: ((walletAddress: string, signature: string, message: string) => Promise<boolean>) | null = null;

  constructor() {
    this.initializeListeners();
  }

  // 设置登录函数（从UserContext传入）
  setLoginWithWalletFunction(loginFn: (walletAddress: string, signature: string, message: string) => Promise<boolean>) {
    this.loginWithWalletFn = loginFn;
  }

  // 获取签名数据
  private async getSignatureData(address: string): Promise<any> {
    // 开发环境使用简单的签名消息
    const isDevelopment = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isDevelopment) {
      const message = `欢迎使用 Copus Human Internet！

请签名验证您的钱包所有权（开发模式）

钱包地址: ${address}
时间戳: ${new Date().toISOString()}

此签名仅用于身份验证，不会产生任何费用。`;

      console.log('🧪 开发环境：使用简化签名消息');
      return message;
    }

    try {
      const data = await AuthService.getMetamaskSignatureData(address);
      console.log('📝 获取到签名数据:', data);
      return data;
    } catch (error) {
      console.error('获取签名数据失败:', error);
      // 降级到简单消息
      return `请签名验证您的钱包所有权: ${address}`;
    }
  }

  // 初始化事件监听器
  private initializeListeners() {
    if (typeof window !== 'undefined' && window.ethereum) {
      // 监听账户变化
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.updateAccount(accounts[0]);
        }
      });

      // 监听网络变化
      window.ethereum.on('chainChanged', (chainId: string) => {
        this.updateChainId(chainId);
      });

      // 监听连接状态
      window.ethereum.on('connect', () => {
        console.log('Wallet connected');
      });

      window.ethereum.on('disconnect', () => {
        this.disconnect();
      });
    }
  }

  // 检查是否安装了钱包
  private checkWalletInstalled(walletType: string): boolean {
    switch (walletType) {
      case 'metamask':
        return typeof window !== 'undefined' && !!window.ethereum && !!window.ethereum.isMetaMask;
      case 'coinbase':
        return typeof window !== 'undefined' && !!window.ethereum && !!window.ethereum.isCoinbaseWallet;
      default:
        return false;
    }
  }

  // 连接钱包
  async connectWallet(walletType: string): Promise<WalletAccount> {
    if (!this.checkWalletInstalled(walletType)) {
      throw new Error(`${walletType} 钱包未安装。请先安装钱包扩展。`);
    }

    try {
      // 请求连接
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('用户拒绝了连接请求');
      }

      // 获取当前网络
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      });

      // 获取余额
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });

      // 获取需要签名的数据
      const signatureData = await this.getSignatureData(accounts[0]);

      // 确保消息是字符串格式
      let messageToSign: string;
      if (typeof signatureData === 'string') {
        messageToSign = signatureData;
      } else if (signatureData && typeof signatureData.message === 'string') {
        messageToSign = signatureData.message;
      } else if (signatureData && typeof signatureData === 'object') {
        // 如果是对象，将其转换为字符串
        messageToSign = JSON.stringify(signatureData);
      } else {
        // 降级到默认消息
        messageToSign = `请签名验证您的钱包所有权: ${accounts[0]}`;
      }

      // 要求用户签名验证身份
      const signature = await this.signMessage(messageToSign);

      // 使用签名信息进行用户登录/注册
      if (this.loginWithWalletFn) {
        const loginSuccess = await this.loginWithWalletFn(accounts[0], signature, messageToSign);
        if (!loginSuccess) {
          throw new Error('用户登录失败');
        }
      } else {
        console.warn('登录函数未设置，跳过用户登录步骤');
      }

      const account: WalletAccount = {
        address: accounts[0],
        balance: this.formatBalance(balance),
      };

      this.state = {
        isConnected: true,
        account,
        chainId,
        walletType,
      };

      this.notifyListeners();

      return account;
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      throw new Error(error.message || '连接钱包失败');
    }
  }

  // 切换网络
  async switchNetwork(targetChainId: string): Promise<void> {
    if (!window.ethereum) {
      throw new Error('钱包未连接');
    }

    try {
      // 尝试切换网络
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError: any) {
      // 如果网络不存在，尝试添加网络
      if (switchError.code === 4902) {
        const networkConfig = SUPPORTED_NETWORKS[targetChainId];
        if (!networkConfig) {
          throw new Error('不支持的网络');
        }

        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });
      } else {
        throw switchError;
      }
    }
  }

  // 发送交易
  async sendTransaction(params: {
    to: string;
    value: string;
    data?: string;
  }): Promise<string> {
    if (!this.state.isConnected || !this.state.account) {
      throw new Error('钱包未连接');
    }

    try {
      const transactionHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.state.account.address,
          ...params,
        }],
      });

      return transactionHash;
    } catch (error: any) {
      console.error('发送交易失败:', error);
      throw new Error(error.message || '交易失败');
    }
  }

  // 签名消息
  async signMessage(message: string): Promise<string> {
    if (!this.state.isConnected || !this.state.account) {
      throw new Error('钱包未连接');
    }

    try {
      // 确保消息是字符串
      if (typeof message !== 'string') {
        throw new Error('签名消息必须是字符串格式');
      }

      console.log('🔐 准备签名消息:', message.substring(0, 50) + '...');

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.state.account.address],
      });

      console.log('✅ 签名成功:', signature.substring(0, 20) + '...');
      return signature;
    } catch (error: any) {
      console.error('签名失败:', error);
      throw new Error(error.message || '签名失败');
    }
  }

  // 断开连接
  disconnect(): void {
    this.state = {
      isConnected: false,
      account: null,
      chainId: null,
      walletType: null,
    };
    this.notifyListeners();
  }

  // 获取当前状态
  getState(): WalletState {
    return { ...this.state };
  }

  // 添加状态监听器
  addListener(listener: (state: WalletState) => void): void {
    this.listeners.push(listener);
  }

  // 移除状态监听器
  removeListener(listener: (state: WalletState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // 检查是否支持网络
  isSupportedNetwork(chainId: string): boolean {
    return chainId in SUPPORTED_NETWORKS;
  }

  // 获取网络信息
  getNetworkInfo(chainId: string): NetworkConfig | null {
    return SUPPORTED_NETWORKS[chainId] || null;
  }

  // 格式化余额
  private formatBalance(hexBalance: string): string {
    const balance = parseInt(hexBalance, 16);
    const ethBalance = balance / Math.pow(10, 18);
    return ethBalance.toFixed(4);
  }

  // 更新账户信息
  private async updateAccount(address: string): Promise<void> {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });

      this.state.account = {
        address,
        balance: this.formatBalance(balance),
      };

      this.notifyListeners();
    } catch (error) {
      console.error('更新账户信息失败:', error);
    }
  }

  // 更新网络ID
  private updateChainId(chainId: string): void {
    this.state.chainId = chainId;
    this.notifyListeners();
  }

  // 通知所有监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }


  // 检查当前连接状态
  async checkConnection(): Promise<void> {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({
            method: 'eth_chainId',
          });

          const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest'],
          });

          this.state = {
            isConnected: true,
            account: {
              address: accounts[0],
              balance: this.formatBalance(balance),
            },
            chainId,
            walletType: window.ethereum.isMetaMask ? 'metamask' : 'unknown',
          };

          this.notifyListeners();
        }
      } catch (error) {
        console.error('检查连接状态失败:', error);
      }
    }
  }
}

// 导出单例实例
export const walletService = new WalletService();

// 网络映射工具函数
export const getChainIdFromNetwork = (network: string): string => {
  switch (network.toLowerCase()) {
    case 'ethereum':
      return '0x1';
    case 'polygon':
      return '0x89';
    case 'arbitrum':
      return '0xa4b1';
    case 'base':
      return '0x2105';
    default:
      return '0x1';
  }
};

export const getNetworkFromChainId = (chainId: string): string => {
  switch (chainId) {
    case '0x1':
      return 'ethereum';
    case '0x89':
      return 'polygon';
    case '0xa4b1':
      return 'arbitrum';
    case '0x2105':
      return 'base';
    default:
      return 'ethereum';
  }
};