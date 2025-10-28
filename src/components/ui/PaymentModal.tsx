import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { walletService, WalletAccount, getChainIdFromNetwork } from '../../services/walletService';
import { realPaymentService } from '../../services/realPaymentService';
import { TransactionMonitor } from './TransactionMonitor';
import { backgroundMonitorService } from '../../services/backgroundMonitorService';

// x402 支付状态
export type PaymentStep = 'selectWallet' | 'connecting' | 'confirming' | 'processing' | 'monitoring' | 'success' | 'error';

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
  const [connectedAccount, setConnectedAccount] = useState<WalletAccount | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [paymentAddress, setPaymentAddress] = useState<string>('');
  const [gasEstimate, setGasEstimate] = useState<{
    gasLimit: string;
    gasPrice: string;
    estimatedFee: string;
  } | null>(null);
  const [userIdentifier, setUserIdentifier] = useState<string>('');

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('selectWallet');
      setSelectedWallet(null);
      setSelectedNetwork(null);
      setTransactionHash('');
      setErrorMessage('');
      setConnectedAccount(null);
      setIsConnecting(false);
      setPaymentAddress('');
      setGasEstimate(null);
      setUserIdentifier('');
    }
  }, [isOpen]);

  // 检查钱包是否安装
  const checkWalletInstalled = (walletType: string): boolean => {
    if (typeof window === 'undefined') return false;

    switch (walletType) {
      case 'metamask':
        return !!window.ethereum && !!window.ethereum.isMetaMask;
      case 'coinbase':
        return !!window.ethereum && !!window.ethereum.isCoinbaseWallet;
      case 'walletconnect':
        return true; // WalletConnect 不需要安装
      default:
        return false;
    }
  };

  // 获取钱包安装链接
  const getWalletInstallUrl = (walletType: string): string => {
    switch (walletType) {
      case 'metamask':
        return 'https://metamask.io/download/';
      case 'coinbase':
        return 'https://www.coinbase.com/wallet';
      case 'walletconnect':
        return 'https://walletconnect.com/';
      default:
        return '#';
    }
  };

  // 真实钱包连接
  const handleWalletSelect = async (wallet: WalletOption) => {
    setSelectedWallet(wallet);
    setCurrentStep('connecting');
    setIsConnecting(true);
    setErrorMessage('');

    try {
      // 连接钱包
      const account = await walletService.connectWallet(wallet.id);
      setConnectedAccount(account);
      setUserIdentifier(account.address); // 使用钱包地址作为用户标识符

      // 根据货币类型自动选择网络
      const defaultNetwork = content.currency === 'ETH'
        ? NETWORK_OPTIONS.find(n => n.id === 'ethereum')
        : NETWORK_OPTIONS.find(n => n.id === 'polygon');

      setSelectedNetwork(defaultNetwork || NETWORK_OPTIONS[0]);

      // 检查是否需要切换网络
      const walletState = walletService.getState();
      const targetChainId = getChainIdFromNetwork(content.network || 'ethereum');

      if (walletState.chainId !== targetChainId) {
        try {
          await walletService.switchNetwork(targetChainId);
        } catch (networkError: any) {
          console.warn('切换网络失败:', networkError);
          // 继续流程，用户可以手动切换
        }
      }

      // 获取支付地址
      const address = await realPaymentService.getPaymentAddress(content.id, content.network || 'ethereum');
      if (address) {
        setPaymentAddress(address);
      }

      // 估算Gas费用
      const estimate = await realPaymentService.estimateGasFee({
        contentId: content.id,
        amount: content.price,
        currency: content.currency,
        network: content.network || 'ethereum',
        recipientAddress: address || '',
      });
      if (estimate) {
        setGasEstimate(estimate);
      }

      setCurrentStep('confirming');
    } catch (error: any) {
      console.error('钱包连接失败:', error);
      setErrorMessage(error.message || '钱包连接失败');
      setCurrentStep('error');
    } finally {
      setIsConnecting(false);
    }
  };

  // 真实支付确认
  const handleConfirmPayment = async () => {
    if (!paymentAddress) {
      setErrorMessage('无法获取收款地址');
      setCurrentStep('error');
      return;
    }

    setCurrentStep('processing');

    try {
      // 执行支付
      const paymentResult = await realPaymentService.processPayment({
        contentId: content.id,
        amount: content.price,
        currency: content.currency,
        network: content.network || 'ethereum',
        recipientAddress: paymentAddress,
        userIdentifier,
      });

      if (paymentResult.success && paymentResult.transactionHash) {
        setTransactionHash(paymentResult.transactionHash);

        // 进入交易监控阶段
        setCurrentStep('monitoring');
      } else {
        setErrorMessage(paymentResult.error || '支付失败');
        setCurrentStep('error');
        onError(paymentResult.error || '支付失败');
      }
    } catch (error: any) {
      console.error('支付处理失败:', error);
      setErrorMessage(error.message || '支付处理失败');
      setCurrentStep('error');
      onError(error.message || '支付处理失败');
    }
  };

  // 重试支付
  const handleRetry = () => {
    setCurrentStep('confirming');
    setErrorMessage('');
  };

  // 交易确认成功回调
  const handleTransactionConfirmed = async () => {
    try {
      // 通知后端支付完成
      await realPaymentService.notifyPaymentComplete({
        contentId: content.id,
        transactionHash,
        userIdentifier,
        amount: content.price,
        currency: content.currency,
        network: content.network || 'ethereum',
      });

      // 购买记录已通过钱包登录自动保存

      setCurrentStep('success');

      // 延迟关闭弹窗
      setTimeout(() => {
        onSuccess(transactionHash);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('保存解锁记录失败:', error);
      // 即使保存失败，也认为支付成功
      setCurrentStep('success');
      setTimeout(() => {
        onSuccess(transactionHash);
        onClose();
      }, 2000);
    }
  };

  // 交易失败回调
  const handleTransactionFailed = () => {
    setErrorMessage('交易失败或被拒绝');
    setCurrentStep('error');
    onError('交易失败或被拒绝');
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
              {WALLET_OPTIONS.map((wallet) => {
                const isInstalled = checkWalletInstalled(wallet.id);
                return (
                  <button
                    key={wallet.id}
                    onClick={() => handleWalletSelect(wallet)}
                    disabled={!isInstalled}
                    className={`w-full p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                      isInstalled
                        ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{wallet.icon}</span>
                      <div className="flex-1">
                        <div className={`font-medium ${isInstalled ? 'text-gray-900' : 'text-gray-500'}`}>
                          {wallet.name}
                        </div>
                        <div className={`text-sm ${isInstalled ? 'text-gray-600' : 'text-gray-400'}`}>
                          {isInstalled ? wallet.description : '钱包未安装'}
                        </div>
                      </div>
                      {!isInstalled && (
                        <a
                          href={getWalletInstallUrl(wallet.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 text-sm hover:text-blue-700 underline"
                        >
                          安装
                        </a>
                      )}
                    </div>
                  </button>
                );
              })}
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

            {/* 连接步骤指示 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-800">1. 请在钱包中确认连接请求</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-600">2. 签名验证身份（不产生费用）</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-sm text-gray-600">3. 完成钱包连接</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                🔐 我们需要您的签名来验证钱包所有权，这不会产生任何费用
              </p>
            </div>
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
                  {connectedAccount && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">钱包地址</span>
                        <span className="font-mono text-sm text-gray-900">
                          {connectedAccount.address.slice(0, 6)}...{connectedAccount.address.slice(-4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">余额</span>
                        <span className="font-medium text-gray-900">
                          {connectedAccount.balance} {selectedNetwork?.symbol}
                        </span>
                      </div>
                    </>
                  )}
                  {paymentAddress && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">收款地址</span>
                      <span className="font-mono text-sm text-gray-900">
                        {paymentAddress.slice(0, 6)}...{paymentAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                  {gasEstimate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">预估Gas费</span>
                      <span className="font-medium text-gray-900">
                        {(parseInt(gasEstimate.estimatedFee) / Math.pow(10, 18)).toFixed(6)} {selectedNetwork?.symbol}
                      </span>
                    </div>
                  )}
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

      case 'monitoring':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto">
                <div className="animate-pulse rounded-full h-16 w-16 bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl">🔍</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">监控交易确认</h3>
              <p className="text-gray-600">交易已提交，正在等待区块链确认</p>
            </div>

            {/* 交易监控组件 */}
            {transactionHash && (
              <TransactionMonitor
                transactionHash={transactionHash}
                onConfirmed={handleTransactionConfirmed}
                onFailed={handleTransactionFailed}
              />
            )}

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-blue-600">💡</span>
                <span className="font-medium text-blue-800">温馨提示</span>
              </div>
              <div className="text-blue-700 text-sm space-y-1">
                <p>• 交易通常需要1-5分钟完成确认</p>
                <p>• 请保持网络连接，我们会自动监控进度</p>
                <p>• 确认完成后内容将自动解锁</p>
              </div>
            </div>

            {/* 手动关闭选项 */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  // 添加到后台监控服务
                  if (transactionHash) {
                    backgroundMonitorService.addPendingTransaction({
                      contentId: content.id,
                      transactionHash,
                      walletAddress: connectedAccount?.address || '',
                      price: content.price,
                      currency: content.currency,
                      network: content.network || 'ethereum',
                      unlockedAt: Date.now(),
                    });
                  }
                  onClose();
                }}
                className="text-sm"
              >
                在后台继续监控
              </Button>
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
            {['selectWallet', 'connecting', 'confirming', 'processing', 'monitoring', 'success'].map((step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full transition-colors ${
                  ['selectWallet', 'connecting', 'confirming', 'processing', 'monitoring', 'success'].indexOf(currentStep) >= index
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