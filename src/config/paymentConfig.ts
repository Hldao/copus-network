// 支付系统配置文件

export const PAYMENT_CONFIG = {
  // 支持的网络配置
  SUPPORTED_NETWORKS: {
    ethereum: {
      chainId: '0x1',
      name: 'Ethereum Mainnet',
      symbol: 'ETH',
      icon: '⟠',
      rpcUrl: 'https://mainnet.infura.io/v3/',
      blockExplorer: 'https://etherscan.io',
      requiredConfirmations: 3,
    },
    polygon: {
      chainId: '0x89',
      name: 'Polygon',
      symbol: 'MATIC',
      icon: '🔷',
      rpcUrl: 'https://polygon-rpc.com',
      blockExplorer: 'https://polygonscan.com',
      requiredConfirmations: 12,
    },
    arbitrum: {
      chainId: '0xa4b1',
      name: 'Arbitrum One',
      symbol: 'ETH',
      icon: '🔵',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      blockExplorer: 'https://arbiscan.io',
      requiredConfirmations: 1,
    },
    base: {
      chainId: '0x2105',
      name: 'Base',
      symbol: 'ETH',
      icon: '🔷',
      rpcUrl: 'https://mainnet.base.org',
      blockExplorer: 'https://basescan.org',
      requiredConfirmations: 2,
    },
  },

  // 支持的货币配置
  SUPPORTED_CURRENCIES: {
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      isNative: true,
      networks: ['ethereum', 'arbitrum', 'base'],
    },
    MATIC: {
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18,
      isNative: true,
      networks: ['polygon'],
    },
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      isNative: false,
      networks: ['ethereum', 'polygon', 'arbitrum', 'base'],
      contracts: {
        ethereum: '0xA0b86a33E6441c8C4f5B0a4F8DF0B1f6F7A5E2C1',
        polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        arbitrum: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
    },
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      isNative: false,
      networks: ['ethereum', 'polygon', 'arbitrum'],
      contracts: {
        ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      },
    },
    DAI: {
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      isNative: false,
      networks: ['ethereum', 'polygon'],
      contracts: {
        ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      },
    },
  },

  // 支付相关配置
  PAYMENT_SETTINGS: {
    // 默认价格配置
    DEFAULT_PRICES: {
      premium_content: '0.001', // ETH
      exclusive_article: '0.005', // ETH
      research_report: '0.01', // ETH
    },

    // Gas费用估算配置
    GAS_LIMITS: {
      NATIVE_TRANSFER: 21000,
      ERC20_TRANSFER: 65000,
      CONTRACT_INTERACTION: 100000,
    },

    // 交易监控配置
    MONITORING: {
      CHECK_INTERVAL_MS: 30000, // 30秒
      MAX_CHECKS: 40, // 最多检查40次 (20分钟)
      EXPIRE_TIME_MS: 24 * 60 * 60 * 1000, // 24小时
    },

    // 后端API配置
    API_ENDPOINTS: {
      GET_PAYMENT_ADDRESS: '/api/v1/payment/address',
      NOTIFY_PAYMENT_COMPLETE: '/api/v1/payment/complete',
      VERIFY_UNLOCK_BY_WALLET: '/api/v1/anonymous/verify-unlock',
      RESTORE_UNLOCK_BY_TRANSACTION: '/api/v1/anonymous/restore-unlock',
      BATCH_UNLOCK_STATUS: '/api/v1/anonymous/batch-unlock-status',
    },

    // 开发模式配置
    DEVELOPMENT: {
      FALLBACK_PAYMENT_ADDRESS: '0x742C3eF46E1c5D7c2C5d5F7D3E8F9B1a2A3B4C5D',
      MOCK_PAYMENT_SUCCESS_RATE: 0.9,
      ENABLE_MOCK_APIS: true,
    },
  },

  // 用户体验配置
  UX_SETTINGS: {
    // 通知配置
    NOTIFICATIONS: {
      ENABLE_BROWSER_NOTIFICATIONS: true,
      ENABLE_TOAST_NOTIFICATIONS: true,
      SUCCESS_AUTO_CLOSE_DELAY: 2000,
      ERROR_AUTO_CLOSE_DELAY: 5000,
    },

    // 界面配置
    UI: {
      MODAL_ANIMATION_DURATION: 300,
      STEP_TRANSITION_DELAY: 500,
      LOADING_INDICATOR_MIN_DURATION: 1000,
    },

    // 钱包连接配置
    WALLET: {
      CONNECTION_TIMEOUT_MS: 10000,
      AUTO_RECONNECT_ATTEMPTS: 3,
      SUPPORTED_WALLETS: ['metamask', 'coinbase', 'walletconnect'],
    },
  },

  // 安全配置
  SECURITY: {
    // 数据验证
    VALIDATION: {
      MIN_PAYMENT_AMOUNT: '0.000001', // 最小支付金额
      MAX_PAYMENT_AMOUNT: '10', // 最大支付金额 (ETH)
      ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/, // 以太坊地址验证
      TRANSACTION_HASH_REGEX: /^0x[a-fA-F0-9]{64}$/, // 交易哈希验证
    },

    // 隐私保护
    PRIVACY: {
      ENABLE_ANONYMOUS_PAYMENTS: true,
      LOCAL_STORAGE_ENCRYPTION: false, // 可选择启用
      AUTO_CLEAR_SENSITIVE_DATA: true,
      DATA_RETENTION_DAYS: 30,
    },

    // 反欺诈配置
    ANTI_FRAUD: {
      ENABLE_TRANSACTION_VERIFICATION: true,
      ENABLE_AMOUNT_VERIFICATION: true,
      ENABLE_RECIPIENT_VERIFICATION: true,
      MAX_RETRY_ATTEMPTS: 3,
    },
  },
};

// 获取网络配置
export const getNetworkConfig = (networkName: string) => {
  return PAYMENT_CONFIG.SUPPORTED_NETWORKS[networkName as keyof typeof PAYMENT_CONFIG.SUPPORTED_NETWORKS];
};

// 获取货币配置
export const getCurrencyConfig = (currencySymbol: string) => {
  return PAYMENT_CONFIG.SUPPORTED_CURRENCIES[currencySymbol as keyof typeof PAYMENT_CONFIG.SUPPORTED_CURRENCIES];
};

// 检查网络是否支持指定货币
export const isCurrencySupportedOnNetwork = (currency: string, network: string): boolean => {
  const currencyConfig = getCurrencyConfig(currency);
  return currencyConfig?.networks.includes(network) || false;
};

// 获取货币在指定网络上的合约地址
export const getTokenContract = (currency: string, network: string): string | null => {
  const currencyConfig = getCurrencyConfig(currency);
  if (!currencyConfig || currencyConfig.isNative) {
    return null; // 原生代币没有合约地址
  }
  return currencyConfig.contracts?.[network as keyof typeof currencyConfig.contracts] || null;
};

// 验证支付参数
export const validatePaymentParams = (params: {
  amount: string;
  currency: string;
  network: string;
  recipient: string;
}): { valid: boolean; error?: string } => {
  const { amount, currency, network, recipient } = params;

  // 验证金额
  const numAmount = parseFloat(amount);
  const minAmount = parseFloat(PAYMENT_CONFIG.SECURITY.VALIDATION.MIN_PAYMENT_AMOUNT);
  const maxAmount = parseFloat(PAYMENT_CONFIG.SECURITY.VALIDATION.MAX_PAYMENT_AMOUNT);

  if (isNaN(numAmount) || numAmount < minAmount || numAmount > maxAmount) {
    return {
      valid: false,
      error: `金额必须在 ${minAmount} 到 ${maxAmount} 之间`,
    };
  }

  // 验证货币和网络支持
  if (!isCurrencySupportedOnNetwork(currency, network)) {
    return {
      valid: false,
      error: `网络 ${network} 不支持货币 ${currency}`,
    };
  }

  // 验证收款地址
  if (!PAYMENT_CONFIG.SECURITY.VALIDATION.ADDRESS_REGEX.test(recipient)) {
    return {
      valid: false,
      error: '无效的收款地址',
    };
  }

  return { valid: true };
};

// 获取当前环境配置
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    isDevelopment,
    apiBaseUrl: isDevelopment
      ? 'http://localhost:3001'
      : 'https://api.copus.network',
    enableMockApis: isDevelopment && PAYMENT_CONFIG.PAYMENT_SETTINGS.DEVELOPMENT.ENABLE_MOCK_APIS,
    fallbackPaymentAddress: PAYMENT_CONFIG.PAYMENT_SETTINGS.DEVELOPMENT.FALLBACK_PAYMENT_ADDRESS,
  };
};