import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';

// x402 支付状态
export type PaymentStep = 'selectWallet' | 'connecting' | 'confirming' | 'processing' | 'success' | 'error';

// 支持的钱包类型
export interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// 支持的区块链网络
export interface NetworkOption {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  rpcUrl: string;
}

// 支付内容信息
export interface PaymentContent {
  id: string;
  title: string;
  author: string;
  price: string;
  currency: string;
  network: string;
}

export interface PaymentModalProps {
  isOpen: boolean;
  content: PaymentContent;
  onClose: () => void;
  onSuccess: (transactionHash: string) => void;
  onError: (error: string) => void;
}

// 钱包选项配置
const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: '连接到你的MetaMask钱包'
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: '使用WalletConnect协议连接'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🛡️',
    description: '使用Coinbase钱包'
  }
];

// 网络选项配置
const NETWORK_OPTIONS: NetworkOption[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '⟠',
    rpcUrl: 'https://mainnet.infura.io/v3/'
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '🔷',
    rpcUrl: 'https://polygon-rpc.com'
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    icon: '🔵',
    rpcUrl: 'https://arb1.arbitrum.io/rpc'
  },
  {
    id: 'base',
    name: 'Base',
    symbol: 'BASE',
    icon: '🔷',
    rpcUrl: 'https://mainnet.base.org'
  }
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  content,
  onClose,
  onSuccess,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('selectWallet');
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption | null>(null);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('selectWallet');
      setSelectedWallet(null);
      setSelectedNetwork(null);
      setTransactionHash('');
      setErrorMessage('');
    }
  }, [isOpen]);

  // 模拟钱包连接
  const handleWalletSelect = async (wallet: WalletOption) => {
    setSelectedWallet(wallet);
    setCurrentStep('connecting');

    // 模拟连接延时
    setTimeout(() => {
      // 根据货币类型自动选择网络
      const defaultNetwork = content.currency === 'ETH'
        ? NETWORK_OPTIONS.find(n => n.id === 'ethereum')
        : NETWORK_OPTIONS.find(n => n.id === 'polygon');

      setSelectedNetwork(defaultNetwork || NETWORK_OPTIONS[0]);
      setCurrentStep('confirming');
    }, 1500);
  };

  // 模拟支付确认
  const handleConfirmPayment = async () => {
    setCurrentStep('processing');

    // 模拟x402支付处理
    setTimeout(() => {
      // 90%成功率
      if (Math.random() > 0.1) {
        const mockTxHash = '0x' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        setTransactionHash(mockTxHash);
        setCurrentStep('success');
        setTimeout(() => {
          onSuccess(mockTxHash);
          onClose();
        }, 2000);
      } else {
        const error = '支付失败：网络拥堵，请稍后重试';
        setErrorMessage(error);
        setCurrentStep('error');
        onError(error);
      }
    }, 3000);
  };

  // 重试支付
  const handleRetry = () => {
    setCurrentStep('confirming');
    setErrorMessage('');
  };

  if (!isOpen) return null;

  // 渲染不同步骤的内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 'selectWallet':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">选择钱包</h3>
              <p className="text-gray-600 text-sm">请选择你要使用的钱包来完成支付</p>
            </div>

            <div className="space-y-3">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet)}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{wallet.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{wallet.name}</div>
                      <div className="text-sm text-gray-600">{wallet.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'connecting':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">连接钱包中...</h3>
            <p className="text-gray-600">正在连接到 {selectedWallet?.name}</p>
            <p className="text-sm text-gray-500">请在钱包中确认连接请求</p>
          </div>
        );

      case 'confirming':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">确认支付信息</h3>

              {/* 支付详情 */}
              <Card className="bg-gray-50 border-0">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">内容</span>
                    <span className="font-medium text-gray-900">{content.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">作者</span>
                    <span className="font-medium text-gray-900">{content.author}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">价格</span>
                    <span className="font-medium text-gray-900">{content.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">网络</span>
                    <Badge variant="outline" className="bg-white">
                      {selectedNetwork?.icon} {selectedNetwork?.name}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* x402协议信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600 font-medium">🔒 x402 安全支付</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  使用x402开放支付协议，确保安全快速的内容解锁
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleConfirmPayment}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
              >
                确认支付 {content.price}
              </Button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto">
              <div className="animate-pulse rounded-full h-16 w-16 bg-blue-100 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">处理支付中...</h3>
            <p className="text-gray-600">正在通过 x402 协议处理您的支付</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                ⏳ 请勿关闭此窗口，交易正在区块链上确认
              </p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-green-700">支付成功！</h3>
            <p className="text-gray-600">内容已解锁，您现在可以查看完整内容了</p>

            {transactionHash && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm font-medium">交易哈希</p>
                <p className="text-green-700 text-xs font-mono break-all mt-1">
                  {transactionHash}
                </p>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">❌</span>
            </div>
            <h3 className="text-lg font-semibold text-red-700">支付失败</h3>
            <p className="text-gray-600">{errorMessage}</p>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleRetry}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
              >
                重试
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardContent className="p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              x402 支付
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 步骤指示器 */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            {['selectWallet', 'connecting', 'confirming', 'processing', 'success'].map((step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  ['selectWallet', 'connecting', 'confirming', 'processing', 'success'].indexOf(currentStep) >= index
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* 步骤内容 */}
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
};